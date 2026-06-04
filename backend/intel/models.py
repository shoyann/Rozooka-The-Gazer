from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from urllib.parse import urlparse

from pydantic import BaseModel, Field

from agents.models import AgentResult, SocialProfile
from enrichment.models import EnrichmentHit


class IntelFragment(BaseModel):
    """Normalized intel fragment persisted for all agents and sources."""

    person_id: str
    source: str
    agent_name: str
    url: str = ""
    claim: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence_text: str = ""
    verified: bool = False
    timestamp: int = Field(
        default_factory=lambda: int(datetime.now(UTC).timestamp() * 1000)
    )
    data_type: str = "profile"


def _hostname(url: str | None) -> str:
    if not url:
        return ""
    try:
        return urlparse(url).hostname or ""
    except Exception:
        return ""


def infer_source(agent_name: str, url: str | None = None) -> str:
    normalized_agent = agent_name.lower()
    hostname = _hostname(url).lower().replace("www.", "")

    if "exa" in normalized_agent:
        return "exa"
    if "sherlock" in normalized_agent:
        return "sherlock"
    if "hibp" in normalized_agent:
        return "hibp"
    if "linkedin" in normalized_agent or "linkedin.com" in hostname:
        return "linkedin"
    if (
        "twitter" in normalized_agent
        or normalized_agent == "x"
        or "twitter.com" in hostname
        or hostname.endswith(".twitter.com")
        or hostname == "x.com"
        or hostname.endswith(".x.com")
    ):
        return "twitter"
    if "instagram" in normalized_agent or "instagram.com" in hostname:
        return "instagram"
    if "github" in normalized_agent or "github.com" in hostname:
        return "github"
    if "facebook" in normalized_agent or "facebook.com" in hostname:
        return "facebook"
    if "reddit" in normalized_agent or "reddit.com" in hostname:
        return "reddit"
    if "youtube" in normalized_agent or "youtube.com" in hostname:
        return "youtube"
    if hostname:
        return hostname
    return normalized_agent or "web"


def fragment_from_enrichment_hit(
    person_id: str,
    hit: EnrichmentHit,
    *,
    agent_name: str = "exa_fast",
    verified: bool = False,
) -> IntelFragment:
    claim = hit.title or hit.snippet or hit.url
    evidence_text = hit.snippet or hit.title or hit.url
    return IntelFragment(
        person_id=person_id,
        source=infer_source(agent_name, hit.url),
        agent_name=agent_name,
        url=hit.url or "",
        claim=claim[:1000],
        confidence=hit.score,
        evidence_text=evidence_text[:2000],
        verified=verified,
        data_type="profile",
    )


def _profile_to_fragment(
    person_id: str,
    agent_name: str,
    profile: SocialProfile,
    *,
    confidence: float,
) -> IntelFragment:
    claim_parts = [profile.platform.upper()]
    if profile.display_name:
        claim_parts.append(profile.display_name)
    elif profile.username:
        claim_parts.append(profile.username)
    elif profile.url:
        claim_parts.append(profile.url)
    claim = " // ".join(part for part in claim_parts if part)

    evidence_bits: list[str] = []
    if profile.bio:
        evidence_bits.append(profile.bio)
    if profile.followers is not None:
        evidence_bits.append(f"followers={profile.followers}")
    if profile.location:
        evidence_bits.append(f"location={profile.location}")

    return IntelFragment(
        person_id=person_id,
        source=infer_source(agent_name, profile.url),
        agent_name=agent_name,
        url=profile.url,
        claim=claim[:1000],
        confidence=confidence,
        evidence_text=" | ".join(evidence_bits)[:2000],
        verified=profile.verified,
        data_type="profile",
    )


def fragments_from_agent_result(
    person_id: str,
    result: AgentResult,
) -> list[IntelFragment]:
    """Explode one agent result into normalized, per-claim fragments."""

    fragments: list[IntelFragment] = []
    snippets = [snippet.strip() for snippet in result.snippets if snippet and snippet.strip()]
    urls = [url.strip() for url in result.urls_found if url and url.strip()]
    profiles = result.profiles[:5]

    for index, snippet in enumerate(snippets[:5]):
        url = urls[index] if index < len(urls) else (urls[0] if urls else "")
        fragments.append(
            IntelFragment(
                person_id=person_id,
                source=infer_source(result.agent_name, url),
                agent_name=result.agent_name,
                url=url,
                claim=snippet[:1000],
                confidence=result.confidence,
                evidence_text=snippet[:2000],
                verified=False,
                data_type="profile",
            )
        )

    if not fragments:
        for profile in profiles:
            fragments.append(
                _profile_to_fragment(
                    person_id,
                    result.agent_name,
                    profile,
                    confidence=result.confidence,
                )
            )

    if not fragments:
        fallback_claim = result.error or f"{result.agent_name} returned no structured snippets"
        fragments.append(
            IntelFragment(
                person_id=person_id,
                source=infer_source(result.agent_name),
                agent_name=result.agent_name,
                claim=fallback_claim[:1000],
                confidence=result.confidence,
                evidence_text=fallback_claim[:2000],
                verified=False,
                data_type="status",
            )
        )

    return fragments
