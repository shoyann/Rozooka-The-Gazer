from __future__ import annotations

import asyncio
import base64
import html
import json
import re
from io import BytesIO
from pathlib import Path
from urllib.parse import unquote, urlparse

import httpx
from loguru import logger
from PIL import Image

from config import Settings
from identification.models import FaceSearchMatch, FaceSearchRequest, FaceSearchResult

_BASE_URL = "https://pimeyes.com"
_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "X-Requested-With": "XMLHttpRequest",
    "Origin": "https://pimeyes.com",
    "Referer": "https://pimeyes.com/en",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
    ),
}
_COOKIES_FILE = Path(__file__).parent / "pimeyes_cookies.json"
_PRIORITY_DOMAINS = (
    "linkedin.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "facebook.com",
    "wikipedia.org",
)


class PimEyesSearcher:
    """Face searcher using PimEyes direct HTTP APIs with session cookies."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._cookies: dict[str, str] | None = None

    @property
    def configured(self) -> bool:
        return _COOKIES_FILE.exists() or bool(
            self._settings.pimeyes_email and self._settings.pimeyes_password
        )

    def _load_cookies(self) -> dict[str, str]:
        if self._cookies is not None:
            return self._cookies

        if _COOKIES_FILE.exists():
            with open(_COOKIES_FILE, encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                self._cookies = {
                    item["name"]: item["value"]
                    for item in data
                    if isinstance(item, dict) and item.get("name") and item.get("value")
                }
            else:
                self._cookies = {
                    str(name): str(value)
                    for name, value in data.items()
                    if value not in (None, "")
                }
            logger.info(
                "PimEyes: loaded {} cookies from {}",
                len(self._cookies),
                _COOKIES_FILE.name,
            )
            return self._cookies

        logger.warning("PimEyes: no cookies file at {}", _COOKIES_FILE)
        self._cookies = {}
        return self._cookies

    @staticmethod
    def _cookie_header(cookies: dict[str, str]) -> str:
        return "; ".join(f"{name}={value}" for name, value in cookies.items())

    def _request_headers(self, cookies: dict[str, str]) -> dict[str, str]:
        return {**_HEADERS, "Cookie": self._cookie_header(cookies)}

    async def search_face(self, request: FaceSearchRequest) -> FaceSearchResult:
        if not request.image_data:
            return FaceSearchResult(
                success=False,
                error="PimEyes requires image_data (not just embeddings)",
            )

        try:
            return await self._search_via_api(request.image_data)
        except Exception as exc:
            error = str(exc)
            if "timeout" in error.lower() and "timed out" not in error.lower():
                error = f"timed out: {error}"
            logger.error("PimEyes API search failed: {}", exc)
            return FaceSearchResult(success=False, error=error)

    async def _search_via_api(self, image_data: bytes) -> FaceSearchResult:
        cookies = self._load_cookies()
        if not cookies:
            return FaceSearchResult(success=False, error="No PimEyes cookies configured")

        image_data = self._ensure_upright(image_data)
        logger.info("PimEyes API: starting search, image size={}KB", len(image_data) // 1024)

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            headers=self._request_headers(cookies),
            follow_redirects=True,
        ) as client:
            status_resp = await client.get(f"{_BASE_URL}/api/premium-token/status")
            if status_resp.status_code != 200:
                return FaceSearchResult(
                    success=False,
                    error=f"PimEyes account status failed: HTTP {status_resp.status_code}",
                )

            status = status_resp.json()
            logger.info(
                "PimEyes: account={} searches={}/{} valid={}",
                status.get("access_type", "?"),
                status.get("daily_search", "?"),
                status.get("daily_search_limit", "?"),
                status.get("valid"),
            )
            if not status.get("valid", False):
                return FaceSearchResult(success=False, error="PimEyes session is not valid")
            if status.get("search_blocked"):
                return FaceSearchResult(
                    success=False,
                    error="PimEyes account search blocked",
                )

            data_url = f"data:image/jpeg;base64,{base64.b64encode(image_data).decode()}"
            upload_resp = await client.post(
                f"{_BASE_URL}/api/upload/file",
                json={"image": data_url},
            )
            if upload_resp.status_code != 200:
                return FaceSearchResult(
                    success=False,
                    error=f"PimEyes upload failed: HTTP {upload_resp.status_code} - {upload_resp.text[:200]}",
                )

            upload_data = upload_resp.json()
            faces = upload_data.get("faces", [])
            if not faces:
                return FaceSearchResult(
                    success=False,
                    error="PimEyes detected no faces in the image",
                )

            face_ids = [face["id"] for face in faces if face.get("id")]
            logger.info("PimEyes: detected {} face(s): {}", len(face_ids), face_ids)

            search_resp = await client.post(
                f"{_BASE_URL}/api/search/new",
                json={
                    "faces": face_ids,
                    "type": "PREMIUM_SEARCH",
                    "time": "any",
                    "safeSearch": False,
                    "deepSearch": False,
                    "groups": True,
                    "order": "default",
                },
            )
            if search_resp.status_code != 200:
                return FaceSearchResult(
                    success=False,
                    error=f"PimEyes search start failed: HTTP {search_resp.status_code} - {search_resp.text[:200]}",
                )

            search_data = search_resp.json()
            search_hash = search_data.get("searchHash", "")
            api_url = search_data.get("apiUrl", "")
            if not search_hash or not api_url:
                return FaceSearchResult(
                    success=False,
                    error=f"PimEyes returned no searchHash/apiUrl: {search_data}",
                )

            logger.info(
                "PimEyes: search started, hash={} apiUrl={}",
                search_hash[:16],
                api_url,
            )

            results = await self._fetch_results(api_url, search_hash, limit=50)
            logger.info("PimEyes: fetched {} raw results", len(results))
            if not results:
                return FaceSearchResult(
                    success=False,
                    error="PimEyes search returned no results",
                )

            matches = await self._resolve_and_build_matches(results[:20])
            logger.info("PimEyes: built {} matches after URL resolution", len(matches))
            if not matches:
                return FaceSearchResult(
                    success=False,
                    error="PimEyes returned results but no usable URLs",
                )

            return FaceSearchResult(matches=matches, success=True)

    async def _fetch_results(
        self,
        api_url: str,
        search_hash: str,
        limit: int = 50,
    ) -> list[dict]:
        all_results: list[dict] = []
        max_retries = 5

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(20.0),
            follow_redirects=True,
            headers={"User-Agent": _HEADERS["User-Agent"]},
        ) as client:
            for attempt in range(max_retries):
                if attempt > 0:
                    wait = 1.0 * (1.5 ** (attempt - 1))
                    logger.info("PimEyes: results not ready, retry {} in {:.1f}s", attempt, wait)
                    await asyncio.sleep(wait)

                resp = await client.post(
                    api_url,
                    json={"hash": search_hash, "offset": 0, "limit": limit},
                    headers={"Content-Type": "application/json"},
                )
                if resp.status_code != 200:
                    logger.warning(
                        "PimEyes results fetch returned {}: {}",
                        resp.status_code,
                        resp.text[:200],
                    )
                    continue

                data = resp.json()
                results = data.get("results", [])
                if not results:
                    continue

                all_results.extend(results)
                offset = len(results)
                while data.get("isMoreResults", False) and len(all_results) < limit:
                    await asyncio.sleep(0.2)
                    page_resp = await client.post(
                        api_url,
                        json={"hash": search_hash, "offset": offset, "limit": 50},
                        headers={"Content-Type": "application/json"},
                    )
                    if page_resp.status_code != 200:
                        break
                    data = page_resp.json()
                    page_results = data.get("results", [])
                    if not page_results:
                        break
                    all_results.extend(page_results)
                    offset += len(page_results)
                break

        return all_results

    async def _resolve_and_build_matches(
        self,
        results: list[dict],
    ) -> list[FaceSearchMatch]:
        matches: list[FaceSearchMatch] = []
        semaphore = asyncio.Semaphore(10)

        async def resolve_one(result: dict) -> FaceSearchMatch | None:
            source_url = result.get("sourceUrl", "")
            thumbnail_url = result.get("thumbnailUrl") or result.get("imageUrl")
            quality = float(result.get("quality", 0))
            domain = result.get("domain", "")

            similarity = quality / 100.0 if quality > 1.0 else quality
            similarity = max(0.0, min(1.0, similarity))

            real_url = source_url
            if source_url:
                async with semaphore:
                    real_url = await self._resolve_redirect(source_url)

            if not real_url:
                return None

            person_name = self._extract_name_from_url(real_url, domain)
            return FaceSearchMatch(
                url=real_url,
                thumbnail_url=thumbnail_url,
                similarity=similarity,
                source="pimeyes",
                person_name=person_name,
            )

        resolved = await asyncio.gather(
            *(resolve_one(result) for result in results),
            return_exceptions=True,
        )

        for item in resolved:
            if isinstance(item, FaceSearchMatch):
                matches.append(item)
            elif isinstance(item, Exception):
                logger.debug("URL resolve failed: {}", item)

        return matches

    async def best_name_from_results(self, result: FaceSearchResult) -> str | None:
        """Best-effort name extraction from URLs first, then page titles."""
        if not result.matches:
            return None

        ordered = self._ordered_matches(result.matches)
        weighted_names: dict[str, float] = {}

        for match in ordered:
            if match.person_name:
                self._add_weighted_name(weighted_names, match.person_name, match)

        title_candidates = [
            match for match in ordered
            if match.url and not match.person_name
        ][:10]
        if title_candidates:
            titles = await self._fetch_titles([match.url for match in title_candidates])
            for match in title_candidates:
                title = titles.get(match.url)
                if not title:
                    continue
                title_name = self._extract_name_from_title(title, match.url)
                if title_name:
                    self._add_weighted_name(weighted_names, title_name, match)

        if not weighted_names:
            return None
        return max(weighted_names, key=weighted_names.get)

    def ordered_matches(self, matches: list[FaceSearchMatch]) -> list[FaceSearchMatch]:
        return self._ordered_matches(matches)

    def top_review_urls(self, result: FaceSearchResult, limit: int = 3) -> list[str]:
        urls: list[str] = []
        seen: set[str] = set()
        for match in self._ordered_matches(result.matches):
            if not match.url or match.url in seen:
                continue
            urls.append(match.url)
            seen.add(match.url)
            if len(urls) >= limit:
                break
        return urls

    async def fetch_titles(self, urls: list[str]) -> dict[str, str]:
        return await self._fetch_titles(urls)

    def extract_name_from_title(self, title: str, url: str) -> str | None:
        return self._extract_name_from_title(title, url)

    def extract_name_from_url(self, url: str) -> str | None:
        domain = urlparse(url).netloc.lower()
        return self._extract_name_from_url(url, domain)

    def domain_priority(self, url: str) -> int:
        return self._domain_priority(url)

    async def _fetch_titles(self, urls: list[str]) -> dict[str, str]:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(15.0, connect=5.0),
            follow_redirects=True,
            headers={"User-Agent": _HEADERS["User-Agent"]},
        ) as client:
            tasks = [self._fetch_title(client, url) for url in urls]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        titles: dict[str, str] = {}
        for url, title in zip(urls, results, strict=True):
            if isinstance(title, str) and title:
                titles[url] = title
        return titles

    @staticmethod
    async def _fetch_title(client: httpx.AsyncClient, url: str) -> str | None:
        try:
            resp = await client.get(url)
            if resp.status_code >= 400:
                return None
            match = re.search(r"<title[^>]*>(.*?)</title>", resp.text, re.IGNORECASE | re.DOTALL)
            if not match:
                return None
            return re.sub(r"\s+", " ", html.unescape(match.group(1))).strip()
        except Exception:
            return None

    @staticmethod
    def _extract_name_from_title(title: str, url: str) -> str | None:
        cleaned = re.sub(r"\s+", " ", title).strip()
        cleaned = re.sub(
            r"\s*[-|:]\s*(?:LinkedIn|Twitter|X|Instagram|Facebook|Wikipedia)(?:.*)?$",
            "",
            cleaned,
            flags=re.IGNORECASE,
        ).strip()

        direct = re.fullmatch(
            r"[A-Z][A-Za-z'`.-]+(?:\s+[A-Z][A-Za-z'`.-]+){1,3}",
            cleaned,
        )
        if direct:
            return direct.group(0)

        domain = urlparse(url).netloc.lower()
        if any(priority in domain for priority in _PRIORITY_DOMAINS):
            lead = re.match(
                r"([A-Z][A-Za-z'`.-]+(?:\s+[A-Z][A-Za-z'`.-]+){1,3})",
                cleaned,
            )
            if lead:
                return lead.group(1)

        return None

    @staticmethod
    def _add_weighted_name(
        weighted_names: dict[str, float],
        name: str,
        match: FaceSearchMatch,
    ) -> None:
        cleaned = re.sub(r"\s+", " ", name).strip()
        if len(cleaned) < 4:
            return
        priority = PimEyesSearcher._domain_priority(match.url)
        weight = match.similarity + (10 - priority if priority < 10 else 0)
        weighted_names[cleaned] = weighted_names.get(cleaned, 0.0) + weight

    @staticmethod
    def _ordered_matches(matches: list[FaceSearchMatch]) -> list[FaceSearchMatch]:
        return sorted(
            matches,
            key=lambda match: (
                PimEyesSearcher._domain_priority(match.url),
                -match.similarity,
            ),
        )

    @staticmethod
    def _domain_priority(url: str) -> int:
        host = urlparse(url).netloc.lower()
        for idx, domain in enumerate(_PRIORITY_DOMAINS):
            if host == domain or host.endswith(f".{domain}"):
                return idx
        return len(_PRIORITY_DOMAINS) + 10

    @staticmethod
    async def _resolve_redirect(url: str) -> str:
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(10.0),
                follow_redirects=False,
                headers={"User-Agent": _HEADERS["User-Agent"]},
            ) as client:
                resp = await client.get(url)

            location = resp.headers.get("location")
            if location:
                return location

            if resp.text:
                meta = re.search(
                    r"""http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'>]+)""",
                    resp.text,
                    re.IGNORECASE,
                )
                if meta:
                    return unquote(meta.group(1).strip())

                js_redirect = re.search(
                    r"""(?:window|document)\.location(?:\.href)?\s*=\s*["']([^"']+)["']""",
                    resp.text,
                    re.IGNORECASE,
                )
                if js_redirect:
                    return unquote(js_redirect.group(1).strip())

            return str(resp.url)
        except Exception:
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(10.0),
                    follow_redirects=True,
                    headers={"User-Agent": _HEADERS["User-Agent"]},
                ) as client:
                    resp = await client.get(url)
                    return str(resp.url)
            except Exception:
                return url

    @staticmethod
    def _extract_name_from_url(url: str, domain: str) -> str | None:
        parsed = urlparse(url)
        path = unquote(parsed.path).strip("/")

        if "linkedin.com" in url:
            match = re.search(r"/in/([^/?]+)", path)
            if match:
                slug = match.group(1).replace("-", " ").strip()
                if len(slug) > 3:
                    return slug.title()

        if "facebook.com" in url:
            match = re.search(r"/people/([^/?]+)", path)
            if match:
                return match.group(1).replace("-", " ").title()
            parts = path.split("/")
            if len(parts) == 1 and "." in parts[0]:
                return parts[0].replace(".", " ").title()

        slug = path.split("/")[-1]
        slug = slug.replace(".html", "").replace(".htm", "")
        if re.fullmatch(r"[A-Za-z]+(?:[-_][A-Za-z]+){1,3}", slug):
            return slug.replace("-", " ").replace("_", " ").title()

        if domain in {"zhihu.com", "zhuanlan.zhihu.com"}:
            return None

        return None

    @staticmethod
    def _ensure_upright(image_data: bytes) -> bytes:
        try:
            img = Image.open(BytesIO(image_data))
            w, h = img.size
            logger.info("PimEyes: image dimensions {}x{} (landscape={})", w, h, w > h)
            if w > h:
                img = img.rotate(90, expand=True)
                buf = BytesIO()
                img.save(buf, format="JPEG", quality=90)
                rotated = buf.getvalue()
                logger.info(
                    "PimEyes: rotated image {}x{} -> {}x{}",
                    w,
                    h,
                    img.size[0],
                    img.size[1],
                )
                return rotated
        except Exception as exc:
            logger.debug("PimEyes: rotation check failed: {}", exc)
        return image_data
