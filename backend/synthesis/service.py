from __future__ import annotations

from typing import Literal

from synthesis.anthropic_engine import AnthropicSynthesisEngine
from synthesis.engine import GeminiSynthesisEngine
from synthesis.models import (
    DossierReport,
    NarrativeDossier,
    SocialProfile,
    SocialProfiles,
    StructuredDossier,
    SynthesisRequest,
    SynthesisResult,
)

SynthesisMode = Literal["fast", "deep", "full"]


class DossierSynthesisService:
    """Coordinates structured and narrative synthesis with graceful fallback."""

    def __init__(
        self,
        *,
        gemini: GeminiSynthesisEngine | None = None,
        anthropic: AnthropicSynthesisEngine | None = None,
    ) -> None:
        self._gemini = gemini
        self._anthropic = anthropic

    @property
    def configured(self) -> bool:
        return bool(
            (self._gemini and self._gemini.configured)
            or (self._anthropic and self._anthropic.configured)
        )

    async def synthesize(
        self,
        request: SynthesisRequest,
        *,
        mode: SynthesisMode = "full",
    ) -> SynthesisResult:
        if not self.configured:
            dossier = self._build_partial_dossier(
                request,
                synthesis_status="pending",
                synthesis_error="No synthesis engine configured",
            )
            return SynthesisResult(
                person_name=request.person_name,
                summary=dossier.summary,
                occupation=dossier.title,
                organization=dossier.company,
                structured_dossier=dossier.structured,
                narrative_dossier=dossier.narrative,
                dossier=dossier,
                success=False,
                error="No synthesis engine configured",
            )

        structured_engine = self._pick_structured_engine()
        narrative_engine = self._pick_narrative_engine(mode)

        structured_result = (
            await structured_engine.synthesize(request)
            if structured_engine is not None
            else None
        )

        if narrative_engine is structured_engine:
            narrative_result = structured_result
        else:
            narrative_result = (
                await narrative_engine.synthesize(request)
                if narrative_engine is not None
                else None
            )

        structured = (
            structured_result.dossier.structured
            if structured_result and structured_result.success and structured_result.dossier
            else None
        )
        narrative = (
            narrative_result.dossier.narrative
            if narrative_result and narrative_result.success and narrative_result.dossier
            else None
        )

        errors = [
            result.error
            for result in (structured_result, narrative_result)
            if result and result.error
        ]
        synthesis_error = " | ".join(dict.fromkeys(errors)) or None

        if structured is None and narrative is None:
            dossier = self._build_partial_dossier(
                request,
                synthesis_status="partial",
                synthesis_error=synthesis_error or "Structured and narrative synthesis failed",
            )
        else:
            partial = self._build_partial_dossier(
                request,
                synthesis_status="partial",
                synthesis_error=synthesis_error,
            )
            dossier = DossierReport(
                structured=structured or partial.structured,
                narrative=narrative or partial.narrative,
                synthesis_status="complete" if structured and narrative else "partial",
                synthesis_error=synthesis_error,
                structured_by=self._engine_name(structured_engine if structured else None),
                narrative_by=self._engine_name(narrative_engine if narrative else None),
            )

        return SynthesisResult(
            person_name=request.person_name,
            summary=dossier.summary,
            occupation=dossier.title,
            organization=dossier.company,
            social_profiles=request.social_profiles,
            confidence_score=0.75 if dossier.synthesis_status == "complete" else 0.45,
            structured_dossier=dossier.structured,
            narrative_dossier=dossier.narrative,
            dossier=dossier,
            success=dossier.synthesis_status in {"complete", "partial"},
            error=synthesis_error,
        )

    def _pick_structured_engine(self) -> GeminiSynthesisEngine | AnthropicSynthesisEngine | None:
        if self._gemini and self._gemini.configured:
            return self._gemini
        if self._anthropic and self._anthropic.configured:
            return self._anthropic
        return None

    def _pick_narrative_engine(
        self,
        mode: SynthesisMode,
    ) -> GeminiSynthesisEngine | AnthropicSynthesisEngine | None:
        if mode in {"deep", "full"} and self._anthropic and self._anthropic.configured:
            return self._anthropic
        if self._gemini and self._gemini.configured:
            return self._gemini
        if self._anthropic and self._anthropic.configured:
            return self._anthropic
        return None

    @staticmethod
    def _engine_name(engine: GeminiSynthesisEngine | AnthropicSynthesisEngine | None) -> str | None:
        if engine is None:
            return None
        explicit_name = getattr(engine, "engine_name", None)
        if isinstance(explicit_name, str) and explicit_name:
            return explicit_name
        name = engine.__class__.__name__.replace("SynthesisEngine", "")
        return name.lower()

    def _build_partial_dossier(
        self,
        request: SynthesisRequest,
        *,
        synthesis_status: Literal["pending", "partial", "complete"],
        synthesis_error: str | None = None,
    ) -> DossierReport:
        social_profiles = self._social_profiles_from_request(request.social_profiles)
        notable_activity = [
            snippet.strip()[:240]
            for snippet in request.enrichment_snippets[:5]
            if snippet and snippet.strip()
        ]
        summary = self._partial_summary(request)

        paragraphs = [summary] if summary else []
        return DossierReport(
            structured=StructuredDossier(
                title=None,
                company=None,
                social_profiles=social_profiles,
                notable_activity=notable_activity,
                conversation_hooks=[],
                risk_flags=[],
            ),
            narrative=NarrativeDossier(summary=summary, paragraphs=paragraphs),
            synthesis_status=synthesis_status,
            synthesis_error=synthesis_error,
            structured_by="fallback",
            narrative_by="fallback" if summary else None,
        )

    @staticmethod
    def _social_profiles_from_request(profiles: list[SocialProfile]) -> SocialProfiles:
        mapped: dict[str, str] = {}
        for profile in profiles:
            platform = profile.platform.lower()
            if platform == "x":
                platform = "twitter"
            if platform in {"web", "site"}:
                platform = "website"
            if platform in {"linkedin", "twitter", "instagram", "github", "website"}:
                mapped.setdefault(platform, profile.url)
        return SocialProfiles(**mapped)

    @staticmethod
    def _partial_summary(request: SynthesisRequest) -> str:
        snippets = [
            snippet.strip()
            for snippet in request.enrichment_snippets[:3]
            if snippet and snippet.strip()
        ]
        if snippets:
            return " ".join(snippets)[:800]
        if request.raw_agent_data:
            values = [value.strip() for value in request.raw_agent_data.values() if value and value.strip()]
            if values:
                return " ".join(values[:2])[:800]
        return ""
