# RESEARCH: Custom orchestration layer — keep PimEyes as primary face search and
# add a structured identity-voting layer before we trust any single name.
from __future__ import annotations

import re
from urllib.parse import urlparse

from loguru import logger

from config import Settings
from identification.models import (
    FaceSearchMatch,
    FaceSearchRequest,
    FaceSearchResult,
    IdentityCandidate,
    IdentityEvidence,
    IdentityResolution,
)
from identification.pimeyes import PimEyesSearcher
from identification.reverse_search import ReverseImageSearcher
from identification.reverse_search import _extract_name_from_title as extract_reverse_title_name

_PROFILE_DOMAINS = {
    "linkedin.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "facebook.com",
    "github.com",
    "tiktok.com",
}
_CONFLICT_SCORE_FLOOR = 1.25
_CONFLICT_SCORE_RATIO = 0.85


class FaceSearchManager:
    """Orchestrates face search and resolves identity with multi-source voting."""

    def __init__(self, settings: Settings) -> None:
        self._pimeyes = PimEyesSearcher(settings)
        self._reverse = ReverseImageSearcher()

    @property
    def configured(self) -> bool:
        return True

    async def search_face(self, request: FaceSearchRequest) -> FaceSearchResult:
        """Search for a face: PimEyes first, reverse image search fallback."""

        logger.info("Face search: trying PimEyes first")
        pimeyes_result = await self._pimeyes.search_face(request)

        if pimeyes_result.success and pimeyes_result.matches:
            logger.info(
                "PimEyes found {} matches, skipping reverse search",
                len(pimeyes_result.matches),
            )
            return pimeyes_result

        logger.info("PimEyes returned no matches, falling back to reverse image search")
        reverse_result = await self._reverse.search_face(request)

        if reverse_result.success and reverse_result.matches:
            logger.info("Reverse search found {} matches", len(reverse_result.matches))
            return reverse_result

        errors = []
        if pimeyes_result.error:
            errors.append(f"PimEyes: {pimeyes_result.error}")
        if reverse_result.error:
            errors.append(f"ReverseSearch: {reverse_result.error}")

        return FaceSearchResult(
            matches=[],
            success=False,
            error=" | ".join(errors) if errors else "No matches found across any search engine",
        )

    async def resolve_identity(
        self,
        request: FaceSearchRequest,
        result: FaceSearchResult,
    ) -> IdentityResolution:
        """Resolve identity using voting across URL slugs, titles, profile URLs, and reverse search."""

        resolution = await self._build_identity_resolution(result)
        if resolution.status == "confirmed" or self._contains_reverse_matches(result):
            return resolution

        reverse_result = await self._reverse.search_face(request)
        if not reverse_result.success or not reverse_result.matches:
            return resolution

        merged_result = self._merge_results(result, reverse_result)
        merged_resolution = await self._build_identity_resolution(merged_result)
        logger.info(
            "Identity voting: upgraded evidence set with reverse search, status={} candidates={}",
            merged_resolution.status,
            len(merged_resolution.candidates),
        )
        return merged_resolution

    async def best_name_from_results(self, result: FaceSearchResult) -> str | None:
        """Backward-compatible helper; prefer resolve_identity for new logic."""
        resolution = await self._build_identity_resolution(result)
        if resolution.resolved_name:
            return resolution.resolved_name
        if resolution.candidates:
            return resolution.candidates[0].name
        return None

    def top_review_urls(self, result: FaceSearchResult, limit: int = 3) -> list[str]:
        """Return the best URLs for manual review when identity is unresolved."""
        return self._pimeyes.top_review_urls(result, limit=limit)

    def profile_urls_from_results(self, result: FaceSearchResult) -> list[str]:
        """Extract social profile URLs from search results."""
        urls: list[str] = []
        seen: set[str] = set()
        for match in result.matches:
            if match.url and match.url not in seen and self._is_profile_url(match.url):
                urls.append(match.url)
                seen.add(match.url)
        return urls

    async def _build_identity_resolution(
        self,
        result: FaceSearchResult,
    ) -> IdentityResolution:
        evidence = await self._collect_identity_evidence(result)
        review_urls = self.top_review_urls(result, limit=3)
        evidence.extend(
            IdentityEvidence(
                source_type="review_url",
                source_engine="review",
                url=url,
                weight=0.0,
                strong=False,
            )
            for url in review_urls
        )

        candidates = self._aggregate_candidates(evidence)
        status, resolved_name, reason = self._decide_identity_status(candidates, review_urls)
        logger.info(
            "Identity voting: status={} resolved_name={} candidates={} evidence={}",
            status,
            resolved_name or "-",
            len(candidates),
            len(evidence),
        )
        return IdentityResolution(
            status=status,
            resolved_name=resolved_name,
            candidates=candidates,
            evidence=evidence,
            review_urls=review_urls,
            reason=reason,
        )

    async def _collect_identity_evidence(
        self,
        result: FaceSearchResult,
    ) -> list[IdentityEvidence]:
        ordered = self._pimeyes.ordered_matches(result.matches)
        title_urls = [match.url for match in ordered if match.url and not match.title][:10]
        fetched_titles = await self._pimeyes.fetch_titles(title_urls) if title_urls else {}

        evidence: list[IdentityEvidence] = []
        for match in ordered:
            similarity = max(0.0, min(1.0, float(match.similarity)))
            priority = self._pimeyes.domain_priority(match.url)
            domain_boost = 0.15 if priority < 10 else 0.0

            if match.source == "pimeyes" and match.person_name:
                self._append_evidence(
                    evidence,
                    candidate_name=match.person_name,
                    source_type="pimeyes_url_slug",
                    match=match,
                    weight=0.95 + similarity * 0.7 + domain_boost,
                    strong=similarity >= 0.55,
                )

            profile_name = self._pimeyes.extract_name_from_url(match.url)
            if profile_name and self._is_profile_url(match.url):
                self._append_evidence(
                    evidence,
                    candidate_name=profile_name,
                    source_type="profile_url",
                    match=match,
                    weight=0.85 + similarity * 0.6 + domain_boost,
                    strong=similarity >= 0.5,
                )

            title = match.title or fetched_titles.get(match.url)
            title_name = None
            if title:
                title_name = (
                    self._pimeyes.extract_name_from_title(title, match.url)
                    or extract_reverse_title_name(title)
                )
            if title_name:
                self._append_evidence(
                    evidence,
                    candidate_name=title_name,
                    source_type="page_title",
                    match=FaceSearchMatch(**{**match.model_dump(), "title": title}),
                    weight=0.7 + similarity * 0.55 + domain_boost,
                    strong=similarity >= 0.45,
                )

            if match.source != "pimeyes" and match.person_name:
                self._append_evidence(
                    evidence,
                    candidate_name=match.person_name,
                    source_type="reverse_search_result",
                    match=match,
                    weight=0.5 + similarity * 0.5,
                    strong=similarity >= 0.7,
                )

        return evidence

    def _append_evidence(
        self,
        evidence: list[IdentityEvidence],
        *,
        candidate_name: str,
        source_type: str,
        match: FaceSearchMatch,
        weight: float,
        strong: bool,
    ) -> None:
        display_name, normalized_name = self._normalize_name(candidate_name)
        if not display_name or not normalized_name:
            return

        evidence.append(
            IdentityEvidence(
                candidate_name=display_name,
                normalized_name=normalized_name,
                source_type=source_type,
                source_engine=match.source,
                url=match.url or None,
                title=match.title,
                similarity=match.similarity,
                weight=round(weight, 4),
                strong=strong,
            )
        )

    def _aggregate_candidates(
        self,
        evidence: list[IdentityEvidence],
    ) -> list[IdentityCandidate]:
        grouped: dict[str, dict[str, object]] = {}

        for item in evidence:
            if not item.normalized_name or not item.candidate_name:
                continue

            bucket = grouped.setdefault(
                item.normalized_name,
                {
                    "name_scores": {},
                    "score": 0.0,
                    "source_types": set(),
                    "urls": [],
                    "evidence_count": 0,
                },
            )
            name_scores = bucket["name_scores"]
            assert isinstance(name_scores, dict)
            name_scores[item.candidate_name] = name_scores.get(item.candidate_name, 0.0) + item.weight
            bucket["score"] = float(bucket["score"]) + item.weight
            bucket["evidence_count"] = int(bucket["evidence_count"]) + 1

            source_types = bucket["source_types"]
            assert isinstance(source_types, set)
            source_types.add(item.source_type)

            if item.url:
                urls = bucket["urls"]
                assert isinstance(urls, list)
                if item.url not in urls:
                    urls.append(item.url)

        candidates: list[IdentityCandidate] = []
        for normalized_name, bucket in grouped.items():
            name_scores = bucket["name_scores"]
            assert isinstance(name_scores, dict)
            best_name = max(name_scores, key=name_scores.get)
            source_types = sorted(bucket["source_types"])
            urls = bucket["urls"][:5]
            candidates.append(
                IdentityCandidate(
                    name=best_name,
                    normalized_name=normalized_name,
                    score=round(float(bucket["score"]), 4),
                    independent_sources=len(source_types),
                    evidence_count=int(bucket["evidence_count"]),
                    source_types=source_types,
                    urls=urls,
                )
            )

        candidates.sort(
            key=lambda candidate: (
                -candidate.score,
                -candidate.independent_sources,
                -candidate.evidence_count,
                candidate.name,
            )
        )
        return candidates

    def _decide_identity_status(
        self,
        candidates: list[IdentityCandidate],
        review_urls: list[str],
    ) -> tuple[str, str | None, str]:
        if not candidates:
            return "manual_review_required", None, (
                "review_urls_without_consistent_name" if review_urls else "no_identity_candidate"
            )

        top_candidate = candidates[0]
        high_conflicts = [
            candidate
            for candidate in candidates
            if self._is_high_conflict_candidate(candidate, top_candidate.score)
        ]
        if len(high_conflicts) > 1:
            return "manual_review_required", None, "multiple_high_score_candidates"

        if top_candidate.independent_sources >= 2:
            return "confirmed", top_candidate.name, "matched_by_multiple_independent_sources"

        if top_candidate.independent_sources == 1 and top_candidate.evidence_count == 1:
            return "candidate", top_candidate.name, "single_weak_source"

        return "candidate", top_candidate.name, "insufficient_independent_sources"

    @staticmethod
    def _merge_results(
        primary: FaceSearchResult,
        secondary: FaceSearchResult,
    ) -> FaceSearchResult:
        merged_matches: list[FaceSearchMatch] = []
        seen: set[tuple[str, str, str | None]] = set()

        for result in (primary, secondary):
            for match in result.matches:
                key = (match.source, match.url, match.title)
                if key in seen:
                    continue
                merged_matches.append(match)
                seen.add(key)

        return FaceSearchResult(matches=merged_matches, success=True, error=primary.error or secondary.error)

    @staticmethod
    def _contains_reverse_matches(result: FaceSearchResult) -> bool:
        return any(match.source != "pimeyes" for match in result.matches)

    @staticmethod
    def _is_profile_url(url: str) -> bool:
        host = urlparse(url).netloc.lower()
        return any(host == domain or host.endswith(f".{domain}") for domain in _PROFILE_DOMAINS)

    @staticmethod
    def _normalize_name(name: str) -> tuple[str | None, str | None]:
        cleaned = re.sub(r"\s+", " ", name).strip(" -|:/")
        cleaned = cleaned.replace("’", "'").replace("`", "'")
        words = []
        for raw_word in cleaned.split():
            word = re.sub(r"(^[^A-Za-z]+|[^A-Za-z'.-]+$)", "", raw_word)
            if word:
                words.append(word)

        if not 2 <= len(words) <= 5:
            return None, None
        if any(any(char.isdigit() for char in word) for word in words):
            return None, None

        display_name = " ".join(word[:1].upper() + word[1:] for word in words)
        normalized_name = re.sub(r"[^a-z]", "", display_name.lower())
        if len(normalized_name) < 4:
            return None, None
        return display_name, normalized_name

    @staticmethod
    def _is_high_conflict_candidate(candidate: IdentityCandidate, top_score: float) -> bool:
        threshold = max(_CONFLICT_SCORE_FLOOR, top_score * _CONFLICT_SCORE_RATIO)
        return candidate.score >= threshold
