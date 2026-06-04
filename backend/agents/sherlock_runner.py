from __future__ import annotations

import asyncio
import copy
import re
from dataclasses import dataclass
from importlib.resources import as_file, files
from typing import Iterable
from urllib.parse import urlparse

from loguru import logger

from agents.models import AgentResult, AgentStatus, SocialProfile
from config import Settings

try:
    from sherlock_project.notify import QueryNotify
    from sherlock_project.result import QueryStatus
    from sherlock_project.sherlock import sherlock as sherlock_search
    from sherlock_project.sites import SitesInformation

    _SHERLOCK_IMPORT_ERROR: Exception | None = None
except Exception as exc:  # pragma: no cover - import path exercised in runtime
    QueryNotify = object  # type: ignore[assignment]
    QueryStatus = None  # type: ignore[assignment]
    SitesInformation = None  # type: ignore[assignment]
    sherlock_search = None  # type: ignore[assignment]
    _SHERLOCK_IMPORT_ERROR = exc


_DEFAULT_SITE_NAMES = (
    "GitHub",
    "Instagram",
    "Facebook",
    "Reddit",
    "TikTok",
    "Pinterest",
    "YouTube",
    "LinkedIn",
    "X",
    "Medium",
    "Threads",
    "Twitch",
    "Patreon",
    "Telegram",
    "Keybase",
    "HackerNews",
    "ProductHunt",
    "Steam",
    "SoundCloud",
    "GitLab",
    "PyPI",
    "Docker Hub",
    "Flickr",
    "WordPress",
)

_GENERIC_SEGMENTS = frozenset({
    "",
    "in",
    "company",
    "people",
    "profile",
    "profiles",
    "user",
    "users",
    "u",
    "channel",
    "c",
    "watch",
    "status",
    "posts",
    "pub",
})


class _SilentQueryNotify(QueryNotify):
    def start(self, message=None):
        return None

    def update(self, result):
        self.result = result
        return None

    def finish(self, message=None):
        return None


@dataclass(frozen=True)
class SherlockProfileMatch:
    username: str
    site_name: str
    url: str
    query_time: float | None = None


class SherlockRunner:
    """Run Sherlock against derived usernames and normalize into AgentResult."""

    def __init__(self, settings: Settings) -> None:
        self._timeout_seconds = max(1.0, float(settings.sherlock_timeout_seconds))
        self._max_usernames = max(1, int(settings.sherlock_max_usernames))
        self._max_sites = max(1, int(settings.sherlock_max_sites))
        self._site_data = self._load_site_data()

    @property
    def configured(self) -> bool:
        return sherlock_search is not None and bool(self._site_data)

    async def research(
        self,
        *,
        person_name: str,
        urls: Iterable[str] = (),
        profiles: Iterable[SocialProfile] = (),
    ) -> AgentResult | None:
        if not self.configured:
            error = str(_SHERLOCK_IMPORT_ERROR) if _SHERLOCK_IMPORT_ERROR else "sherlock_unavailable"
            return AgentResult(
                agent_name="sherlock",
                status=AgentStatus.FAILED,
                snippets=[f"Sherlock unavailable: {error}"],
                error="sherlock_unavailable",
                confidence=0.0,
            )

        candidate_usernames = self._candidate_usernames(
            person_name=person_name,
            urls=urls,
            profiles=profiles,
        )
        if not candidate_usernames:
            logger.info("sherlock: no username candidates for {}", person_name)
            return None

        try:
            matches = await asyncio.wait_for(
                asyncio.to_thread(self._run_search, candidate_usernames),
                timeout=self._timeout_seconds,
            )
        except TimeoutError:
            logger.warning(
                "sherlock: timed out for {} after {:.1f}s",
                person_name,
                self._timeout_seconds,
            )
            return AgentResult(
                agent_name="sherlock",
                status=AgentStatus.TIMEOUT,
                snippets=[
                    f"Sherlock timed out after {self._timeout_seconds:.0f}s; deep research continued without it."
                ],
                error="sherlock_timeout",
                confidence=0.0,
            )
        except Exception as exc:
            logger.warning("sherlock: search failed for {}: {}", person_name, exc)
            return AgentResult(
                agent_name="sherlock",
                status=AgentStatus.FAILED,
                snippets=[f"Sherlock scan failed: {exc}"],
                error="sherlock_scan_failed",
                confidence=0.0,
            )

        if not matches:
            return AgentResult(
                agent_name="sherlock",
                status=AgentStatus.FAILED,
                snippets=[
                    "Sherlock found no additional claimed profiles for the derived usernames."
                ],
                error="no_claimed_profiles",
                confidence=0.15,
            )

        unique_urls: list[str] = []
        seen_urls: set[str] = set()
        site_counts: dict[str, int] = {}
        usernames_hit: set[str] = set()
        social_profiles: list[SocialProfile] = []

        for match in matches:
            usernames_hit.add(match.username)
            site_counts[match.site_name] = site_counts.get(match.site_name, 0) + 1
            if match.url not in seen_urls:
                seen_urls.add(match.url)
                unique_urls.append(match.url)
            social_profiles.append(
                SocialProfile(
                    platform=self._site_name_to_platform(match.site_name),
                    url=match.url,
                    username=match.username,
                    display_name=person_name,
                    raw_data={"source": "sherlock", "site_name": match.site_name},
                )
            )

        top_sites = sorted(site_counts.items(), key=lambda item: (-item[1], item[0]))[:4]
        top_matches = matches[: min(4, len(matches))]
        snippets = [
            (
                f"[Sherlock] Claimed profiles on {len(site_counts)} site(s) "
                f"for candidate username(s): {', '.join(sorted(usernames_hit))}."
            ),
        ]
        snippets.extend(
            f"[Sherlock] {site_name}: {count} hit(s)."
            for site_name, count in top_sites
        )
        snippets.extend(
            f"[Sherlock] {match.site_name} -> {match.url}"
            for match in top_matches
        )

        confidence = min(0.92, 0.45 + (0.08 * min(len(unique_urls), 5)))
        return AgentResult(
            agent_name="sherlock",
            status=AgentStatus.SUCCESS,
            profiles=social_profiles[:10],
            snippets=snippets[:8],
            urls_found=unique_urls[:10],
            confidence=confidence,
        )

    def _load_site_data(self) -> dict[str, dict[str, str]]:
        if SitesInformation is None:
            return {}

        try:
            resource = files("sherlock_project.resources").joinpath("data.json")
            with as_file(resource) as data_path:
                sites = SitesInformation(
                    data_file_path=str(data_path),
                    honor_exclusions=True,
                )
        except Exception as exc:
            logger.warning("sherlock: failed to load site data: {}", exc)
            return {}

        site_data_all = {site.name: site.information for site in sites}
        selected_names = _DEFAULT_SITE_NAMES[: self._max_sites]
        selected = {
            site_name: site_data_all[site_name]
            for site_name in selected_names
            if site_name in site_data_all
        }
        return selected or site_data_all

    def _run_search(self, candidate_usernames: list[str]) -> list[SherlockProfileMatch]:
        if sherlock_search is None or QueryStatus is None:
            return []

        matches: list[SherlockProfileMatch] = []
        seen: set[tuple[str, str]] = set()
        notify = _SilentQueryNotify()

        for username in candidate_usernames:
            results = sherlock_search(
                username=username,
                site_data=copy.deepcopy(self._site_data),
                query_notify=notify,
                timeout=int(self._timeout_seconds),
            )
            for site_name, result in results.items():
                status = result.get("status")
                url = str(result.get("url_user") or "").strip()
                if not status or getattr(status, "status", None) != QueryStatus.CLAIMED or not url:
                    continue
                dedupe_key = (site_name.lower(), url.lower())
                if dedupe_key in seen:
                    continue
                seen.add(dedupe_key)
                matches.append(
                    SherlockProfileMatch(
                        username=username,
                        site_name=site_name,
                        url=url,
                        query_time=getattr(status, "query_time", None),
                    )
                )

        matches.sort(key=lambda match: (match.site_name.lower(), match.url.lower()))
        return matches

    def _candidate_usernames(
        self,
        *,
        person_name: str,
        urls: Iterable[str],
        profiles: Iterable[SocialProfile],
    ) -> list[str]:
        candidates: list[str] = []

        def push(candidate: str | None) -> None:
            if not candidate:
                return
            normalized = candidate.strip().lstrip("@").lower()
            if (
                len(normalized) < 3
                or len(normalized) > 32
                or normalized in candidates
                or not re.fullmatch(r"[a-z0-9._-]+", normalized)
            ):
                return
            candidates.append(normalized)

        for url in urls:
            push(self._username_from_url(url))

        for profile in profiles:
            push(profile.username)
            push(self._username_from_url(profile.url))

        for candidate in self._candidate_usernames_from_name(person_name):
            push(candidate)

        return candidates[: self._max_usernames]

    @staticmethod
    def _candidate_usernames_from_name(person_name: str) -> list[str]:
        parts = re.findall(r"[a-z0-9]+", person_name.lower())
        if not parts:
            return []
        if len(parts) == 1:
            return [parts[0]]

        first = parts[0]
        last = parts[-1]
        return [
            f"{first}{last}",
            f"{first}.{last}",
            f"{first}_{last}",
            f"{first}-{last}",
            f"{first[0]}{last}",
        ]

    @staticmethod
    def _username_from_url(url: str) -> str | None:
        try:
            parsed = urlparse(url if "://" in url else f"https://{url}")
        except Exception:
            return None

        segments = [
            segment.strip().lstrip("@")
            for segment in parsed.path.split("/")
            if segment.strip()
        ]
        for segment in reversed(segments):
            candidate = segment.split("?", 1)[0].split("#", 1)[0]
            candidate = candidate.strip().lstrip("@")
            if candidate.lower() in _GENERIC_SEGMENTS:
                continue
            if not re.fullmatch(r"[A-Za-z0-9._-]{3,32}", candidate):
                continue
            return candidate
        return None

    @staticmethod
    def _site_name_to_platform(site_name: str) -> str:
        normalized = site_name.strip().lower()
        if normalized == "x":
            return "twitter"
        return normalized.replace(" ", "_")
