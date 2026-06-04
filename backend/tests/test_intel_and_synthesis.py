from __future__ import annotations

from agents.models import AgentResult, AgentStatus
from enrichment.models import EnrichmentHit
from intel.models import fragment_from_enrichment_hit, fragments_from_agent_result
from synthesis.models import DossierReport, NarrativeDossier, StructuredDossier, SynthesisRequest, SynthesisResult
from synthesis.service import DossierSynthesisService


class StubEngine:
    def __init__(self, name: str, result: SynthesisResult, configured: bool = True):
        self.engine_name = name
        self._result = result
        self.configured = configured

    async def synthesize(self, request: SynthesisRequest) -> SynthesisResult:
        return self._result.model_copy(update={"person_name": request.person_name})


def _result(
    *,
    summary: str,
    title: str | None,
    company: str | None,
    engine_name: str,
    success: bool = True,
    error: str | None = None,
) -> SynthesisResult:
    dossier = DossierReport(
        structured=StructuredDossier(
            title=title,
            company=company,
            work_history=[],
            education=[],
            social_profiles={},
            notable_activity=[],
            conversation_hooks=[],
            risk_flags=[],
        ),
        narrative=NarrativeDossier(summary=summary, paragraphs=[summary] if summary else []),
        synthesis_status="complete",
        structured_by=engine_name,
        narrative_by=engine_name,
    )
    return SynthesisResult(
        person_name="ignored",
        summary=summary,
        occupation=title,
        organization=company,
        structured_dossier=dossier.structured,
        narrative_dossier=dossier.narrative,
        dossier=dossier,
        success=success,
        error=error,
    )


async def test_dossier_synthesis_service_prefers_gemini_for_structure_and_anthropic_for_deep_narrative():
    service = DossierSynthesisService(
        gemini=StubEngine(
            "gemini",
            _result(
                summary="Gemini base summary.",
                title="Founder",
                company="Rozooka",
                engine_name="gemini",
            ),
        ),
        anthropic=StubEngine(
            "anthropic",
            _result(
                summary="Anthropic deep narrative.",
                title="Ignored title",
                company="Ignored company",
                engine_name="anthropic",
            ),
        ),
    )

    result = await service.synthesize(
        SynthesisRequest(
            person_name="Jane Doe",
            enrichment_snippets=["Founded Rozooka."],
        ),
        mode="deep",
    )

    assert result.dossier is not None
    assert result.dossier.structured.title == "Founder"
    assert result.dossier.structured.company == "Rozooka"
    assert result.dossier.narrative.summary == "Anthropic deep narrative."
    assert result.dossier.structured_by == "gemini"
    assert result.dossier.narrative_by == "anthropic"
    assert result.dossier.synthesis_status == "complete"


async def test_dossier_synthesis_service_returns_partial_bundle_when_engines_fail():
    failed = _result(
        summary="",
        title=None,
        company=None,
        engine_name="gemini",
        success=False,
        error="quota_exhausted",
    )
    service = DossierSynthesisService(
        gemini=StubEngine("gemini", failed),
        anthropic=None,
    )

    result = await service.synthesize(
        SynthesisRequest(
            person_name="Jane Doe",
            enrichment_snippets=["Example snippet one.", "Example snippet two."],
        ),
        mode="fast",
    )

    assert result.dossier is not None
    assert result.dossier.synthesis_status == "partial"
    assert "Example snippet one." in result.dossier.narrative.summary
    assert result.dossier.structured.notable_activity
    assert result.dossier.synthesis_error == "quota_exhausted"


def test_fragment_from_enrichment_hit_uses_required_normalized_fields():
    fragment = fragment_from_enrichment_hit(
        "person_123",
        EnrichmentHit(
            title="Jane Doe joins Rozooka",
            url="https://example.com/jane",
            snippet="Jane Doe is now leading research.",
            score=0.88,
        ),
    )

    assert fragment.person_id == "person_123"
    assert fragment.source == "exa"
    assert fragment.agent_name == "exa_fast"
    assert fragment.url == "https://example.com/jane"
    assert fragment.claim == "Jane Doe joins Rozooka"
    assert fragment.evidence_text == "Jane Doe is now leading research."


def test_fragments_from_agent_result_splits_snippets_into_normalized_records():
    fragments = fragments_from_agent_result(
        "person_abc",
        AgentResult(
            agent_name="sherlock",
            status=AgentStatus.SUCCESS,
            snippets=["Found GitHub profile", "Found X profile"],
            urls_found=["https://github.com/jane", "https://x.com/jane"],
            confidence=0.73,
        ),
    )

    assert len(fragments) == 2
    assert fragments[0].person_id == "person_abc"
    assert fragments[0].agent_name == "sherlock"
    assert fragments[0].claim == "Found GitHub profile"
    assert fragments[1].url == "https://x.com/jane"
