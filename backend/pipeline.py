from __future__ import annotations

import asyncio
import io
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4

from loguru import logger
from PIL import Image

from agents.deep_researcher import DeepResearcher
from agents.models import AgentResult, OrchestratorResult, ResearchRequest
from agents.orchestrator import ResearchOrchestrator
from capture.frame_extractor import extract_frames
from db import DatabaseGateway
from enrichment.exa_client import ExaEnrichmentClient
from enrichment.models import EnrichmentRequest, EnrichmentResult
from identification import FaceDetector
from identification.embedder import ArcFaceEmbedder
from identification.models import (
    BoundingBox,
    FaceDetectionRequest,
    FaceSearchRequest,
    IdentityResolution,
)
from identification.search_manager import FaceSearchManager
from intel.models import fragment_from_enrichment_hit, fragments_from_agent_result
from synthesis.connections import detect_connections
from synthesis.models import DossierReport, SynthesisRequest
from synthesis.models import SocialProfile as SynthSocialProfile
from synthesis.service import DossierSynthesisService
from tracing import traced


@dataclass(frozen=True)
class PipelineResult:
    """Result of processing a single capture through the pipeline."""

    capture_id: str
    total_frames: int = 0
    faces_detected: int = 0
    persons_created: list[str] = field(default_factory=list)
    persons_enriched: int = 0
    success: bool = True
    error: str | None = None


class CapturePipeline:
    """End-to-end pipeline with async background processing."""

    MANUAL_REVIEW_NAME = "IDENTITY UNCONFIRMED // MANUAL REVIEW REQUIRED"

    def __init__(
        self,
        *,
        detector: FaceDetector,
        embedder: ArcFaceEmbedder,
        db: DatabaseGateway,
        face_searcher: FaceSearchManager | None = None,
        exa_client: ExaEnrichmentClient | None = None,
        orchestrator: ResearchOrchestrator | None = None,
        dossier_synthesizer: DossierSynthesisService | None = None,
    ) -> None:
        self._detector = detector
        self._embedder = embedder
        self._db = db
        self._face_searcher = face_searcher
        self._exa = exa_client
        self._orchestrator = orchestrator
        self._dossier_synthesizer = dossier_synthesizer
        self._deep_researcher: DeepResearcher | None = None
        self._background_tasks: set[asyncio.Task[None]] = set()

    async def initialize_capture(
        self,
        *,
        capture_id: str,
        content_type: str,
        source: str,
        filename: str | None = None,
        timestamp: int | None = None,
        person_name: str | None = None,
    ) -> None:
        await self._db.store_capture(capture_id, {
            "content_type": content_type,
            "source": source,
            "filename": filename,
            "timestamp": timestamp,
            "status": "queued",
            "person_name": person_name,
            "total_frames": 0,
            "faces_detected": 0,
            "persons_created": [],
            "persons_enriched": 0,
            "error": None,
        })

    async def get_capture(self, capture_id: str) -> dict[str, Any] | None:
        return await self._db.get_capture(capture_id)

    def schedule_process(
        self,
        *,
        capture_id: str,
        data: bytes,
        content_type: str,
        source: str = "upload",
        person_name: str | None = None,
    ) -> None:
        task = asyncio.create_task(
            self._process_in_background(
                capture_id=capture_id,
                data=data,
                content_type=content_type,
                source=source,
                person_name=person_name,
            ),
            name=f"capture:{capture_id}",
        )
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)

    async def cancel_background_tasks(self) -> None:
        tasks = [task for task in self._background_tasks if not task.done()]
        if not tasks:
            return

        for task in tasks:
            task.cancel()

        await asyncio.gather(*tasks, return_exceptions=True)
        self._background_tasks.clear()

    async def _process_in_background(
        self,
        *,
        capture_id: str,
        data: bytes,
        content_type: str,
        source: str,
        person_name: str | None,
    ) -> None:
        try:
            await self.process(
                capture_id=capture_id,
                data=data,
                content_type=content_type,
                source=source,
                person_name=person_name,
            )
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("Background capture task failed for {}: {}", capture_id, exc)
            await self._db.store_capture(capture_id, {
                "content_type": content_type,
                "source": source,
                "status": "failed",
                "success": False,
                "error": str(exc),
            })

    @traced("pipeline.process")
    async def process(
        self,
        capture_id: str,
        data: bytes,
        content_type: str,
        source: str = "upload",
        person_name: str | None = None,
    ) -> PipelineResult:
        logger.info(
            "Pipeline started for capture={} type={} source={}",
            capture_id, content_type, source,
        )

        await self._db.store_capture(capture_id, {
            "content_type": content_type,
            "source": source,
            "status": "processing",
            "error": None,
        })

        try:
            frames = extract_frames(data, content_type)
        except Exception as exc:
            logger.error("Frame extraction failed for {}: {}", capture_id, exc)
            await self._db.store_capture(capture_id, {
                "content_type": content_type,
                "source": source,
                "status": "failed",
                "success": False,
                "error": f"Frame extraction failed: {exc}",
            })
            return PipelineResult(
                capture_id=capture_id,
                success=False,
                error=f"Frame extraction failed: {exc}",
            )

        if not frames:
            logger.warning("No frames extracted from capture={}", capture_id)
            await self._db.store_capture(capture_id, {
                "content_type": content_type,
                "source": source,
                "status": "failed",
                "success": False,
                "total_frames": 0,
                "faces_detected": 0,
                "persons_created": [],
                "persons_enriched": 0,
                "error": "No frames extracted from media payload",
            })
            return PipelineResult(
                capture_id=capture_id,
                total_frames=0,
                success=False,
                error="No frames extracted from media payload",
            )

        logger.info("Extracted {} frame(s) from capture={}", len(frames), capture_id)
        await self._db.store_capture(capture_id, {
            "content_type": content_type,
            "source": source,
            "status": "identifying",
            "total_frames": len(frames),
        })

        total_faces = 0
        persons_created: list[str] = []
        person_identities: dict[str, tuple[str, bytes]] = {}

        for frame_idx, frame_bytes in enumerate(frames):
            request = FaceDetectionRequest(image_data=frame_bytes)
            detection_result = await self._detector.detect_faces(request)

            if not detection_result.success:
                logger.warning(
                    "Detection failed on frame {} of capture={}: {}",
                    frame_idx, capture_id, detection_result.error,
                )
                continue

            for face in detection_result.faces:
                total_faces += 1
                cropped_bytes = self._crop_face(
                    frame_bytes,
                    face.bbox,
                    detection_result.frame_width,
                    detection_result.frame_height,
                )
                face_image = cropped_bytes or frame_bytes
                embedding = self._embedder.embed(face, frame_bytes)

                identity_resolution = (
                    self._manual_identity_resolution(person_name)
                    if person_name
                    else None
                )
                if not identity_resolution and self._face_searcher:
                    identity_resolution = await self._identify_face(
                        embedding,
                        face_image,
                    )
                resolved_name = (
                    identity_resolution.resolved_name
                    if identity_resolution and identity_resolution.status == "confirmed"
                    else None
                )

                person_id = f"person_{uuid4().hex[:12]}"
                person_data: dict[str, Any] = {
                    "capture_id": capture_id,
                    "frame_index": frame_idx,
                    "bbox": face.bbox.model_dump(),
                    "confidence": face.confidence,
                    "embedding": embedding,
                    "status": "identified",
                    "photoUrl": "",
                }
                person_data.update(self._identity_payload(identity_resolution))
                display_name = self._display_name_for_identity(identity_resolution)
                if display_name:
                    person_data["name"] = display_name

                await self._db.store_person(person_id, person_data)
                persons_created.append(person_id)

                await self._db.store_capture(capture_id, {
                    "content_type": content_type,
                    "source": source,
                    "status": "identifying",
                    "total_frames": len(frames),
                    "faces_detected": total_faces,
                    "persons_created": persons_created,
                    "persons_enriched": 0,
                })

                if resolved_name:
                    person_identities[person_id] = (resolved_name, face_image)

                logger.info(
                    "Created person={} name={} from capture={} frame={} confidence={:.2f}",
                    person_id,
                    resolved_name or "unknown",
                    capture_id,
                    frame_idx,
                    face.confidence,
                )

        persons_enriched = 0
        if person_identities:
            await self._db.store_capture(capture_id, {
                "content_type": content_type,
                "source": source,
                "status": "researching",
                "total_frames": len(frames),
                "faces_detected": total_faces,
                "persons_created": persons_created,
                "persons_enriched": 0,
            })

            tasks = [
                asyncio.create_task(
                    self._enrich_person_with_identity(person_id, name),
                    name=f"enrich:{person_id}",
                )
                for person_id, (name, _img) in person_identities.items()
            ]

            for task in asyncio.as_completed(tasks):
                try:
                    person_id, enriched = await task
                except Exception as exc:
                    logger.error("Enrichment task crashed for capture={}: {}", capture_id, exc)
                    enriched = False
                    person_id = "unknown"

                if enriched:
                    persons_enriched += 1

                await self._db.store_capture(capture_id, {
                    "content_type": content_type,
                    "source": source,
                    "status": "researching",
                    "total_frames": len(frames),
                    "faces_detected": total_faces,
                    "persons_created": persons_created,
                    "persons_enriched": persons_enriched,
                })

        await self._db.store_capture(capture_id, {
            "content_type": content_type,
            "source": source,
            "status": "complete",
            "success": True,
            "total_frames": len(frames),
            "faces_detected": total_faces,
            "persons_created": persons_created,
            "persons_enriched": persons_enriched,
            "error": None,
        })

        logger.info(
            "Pipeline complete for capture={}: {} frames, {} faces, {} persons, {} enriched",
            capture_id, len(frames), total_faces, len(persons_created), persons_enriched,
        )

        return PipelineResult(
            capture_id=capture_id,
            total_frames=len(frames),
            faces_detected=total_faces,
            persons_created=persons_created,
            persons_enriched=persons_enriched,
            success=True,
        )

    @staticmethod
    def _crop_face(
        frame_bytes: bytes,
        bbox: BoundingBox,
        frame_width: int,
        frame_height: int,
    ) -> bytes | None:
        if frame_width <= 0 or frame_height <= 0:
            return None
        try:
            img = Image.open(io.BytesIO(frame_bytes))
            w, h = img.size

            left = int(bbox.x * w)
            upper = int(bbox.y * h)
            right = int((bbox.x + bbox.width) * w)
            lower = int((bbox.y + bbox.height) * h)

            left = max(0, left)
            upper = max(0, upper)
            right = min(w, right)
            lower = min(h, lower)

            if right <= left or lower <= upper:
                return None

            cropped = img.crop((left, upper, right, lower))
            buf = io.BytesIO()
            cropped.save(buf, format="JPEG", quality=90)
            return buf.getvalue()
        except Exception as exc:
            logger.warning("Face crop failed: {}", exc)
            return None

    @traced("pipeline.identify_face")
    async def _identify_face(
        self,
        embedding: list[float],
        image_data: bytes,
    ) -> IdentityResolution | None:
        if not self._face_searcher:
            return None

        try:
            search_request = FaceSearchRequest(
                embedding=embedding,
                image_data=image_data,
            )
            search_result = await self._face_searcher.search_face(search_request)

            if not search_result.success:
                logger.warning("Face search failed: {}", search_result.error)
                return None

            resolution = await self._face_searcher.resolve_identity(search_request, search_result)
            logger.info(
                "Face search voting resolved status={} name={} candidates={}",
                resolution.status,
                resolution.resolved_name or (
                    resolution.candidates[0].name if resolution.candidates else "-"
                ),
                len(resolution.candidates),
            )
            return resolution
        except Exception as exc:
            logger.error("Face search crashed: {}", exc)
            return None

    @classmethod
    def _manual_identity_resolution(cls, person_name: str) -> IdentityResolution:
        display_name = " ".join(person_name.split())
        normalized_name = cls._normalize_identity_name(display_name)
        return IdentityResolution(
            status="confirmed",
            resolved_name=display_name,
            candidates=[
                {
                    "name": display_name,
                    "normalized_name": normalized_name,
                    "score": 1.0,
                    "independent_sources": 1,
                    "evidence_count": 1,
                    "source_types": ["manual_input"],
                    "urls": [],
                }
            ],
            evidence=[
                {
                    "candidate_name": display_name,
                    "normalized_name": normalized_name,
                    "source_type": "manual_input",
                    "source_engine": "user_input",
                    "weight": 1.0,
                    "strong": True,
                }
            ],
            review_urls=[],
            reason="user_supplied_identity",
        )

    @classmethod
    def _normalize_identity_name(cls, value: str) -> str:
        normalized = "".join(char for char in value.lower() if char.isalpha())
        return normalized or "manualidentity"

    def _display_name_for_identity(
        self,
        identity_resolution: IdentityResolution | None,
    ) -> str | None:
        if not identity_resolution:
            return None
        if identity_resolution.status == "confirmed":
            return identity_resolution.resolved_name
        if identity_resolution.status == "candidate" and identity_resolution.candidates:
            return identity_resolution.candidates[0].name
        if identity_resolution.status == "manual_review_required":
            return self.MANUAL_REVIEW_NAME
        return None

    def _identity_payload(
        self,
        identity_resolution: IdentityResolution | None,
    ) -> dict[str, Any]:
        if not identity_resolution:
            return {}

        metadata: dict[str, Any] = {
            "identityStatus": identity_resolution.status,
            "identitySource": "manual_input"
            if identity_resolution.reason == "user_supplied_identity"
            else "automated",
            "identityConfirmed": identity_resolution.status == "confirmed",
            "reviewUrls": identity_resolution.review_urls,
        }
        if identity_resolution.status == "manual_review_required":
            metadata["reviewMessage"] = self.MANUAL_REVIEW_NAME

        return {
            "identity_status": identity_resolution.status,
            "identity_source": metadata["identitySource"],
            "identity_confirmed": metadata["identityConfirmed"],
            "identity_candidates": [
                candidate.model_dump() for candidate in identity_resolution.candidates
            ],
            "identity_evidence": [
                evidence.model_dump() for evidence in identity_resolution.evidence
            ],
            "metadata": metadata,
        }

    @traced("pipeline.enrich_person")
    async def _enrich_person(self, person_id: str, person_name: str) -> bool:
        await self._db.update_person(person_id, {"status": "researching"})

        exa_task = asyncio.create_task(self._run_exa(person_name), name=f"exa:{person_id}")
        browser_task = (
            asyncio.create_task(
                self._run_browser_research(person_name, person_id=person_id),
                name=f"research:{person_id}",
            )
            if self._orchestrator
            else None
        )

        exa_result: EnrichmentResult | None = None
        browser_result: OrchestratorResult | None = None

        try:
            exa_result = await exa_task
        except Exception as exc:
            logger.error("Exa enrichment crashed for {}: {}", person_id, exc)

        if exa_result and exa_result.success:
            await self._store_exa_hits(person_id, exa_result)
            partial_summary = self._build_partial_summary(exa_result, None)
            if partial_summary:
                await self._db.update_person(person_id, {
                    "status": "researching",
                    "summary": partial_summary,
                })

        if browser_task is not None:
            try:
                browser_result = await browser_task
            except Exception as exc:
                logger.error("Browser research crashed for {}: {}", person_id, exc)

        has_enrichment_data = self._has_enrichment_data(exa_result, browser_result)
        partial_summary = self._build_partial_summary(exa_result, browser_result)

        synthesis_request = self._merge_to_synthesis_request(
            person_name,
            exa_result,
            browser_result,
        )

        if not self._dossier_synthesizer or not self._dossier_synthesizer.configured:
            logger.warning("No synthesis engine configured, skipping for {}", person_id)
            await self._db.update_person(person_id, {
                "status": "complete" if has_enrichment_data else "identified",
                **({"summary": partial_summary} if partial_summary else {}),
                "dossier": self._build_pending_dossier(
                    synthesis_request,
                    partial_summary=partial_summary,
                ).model_dump(),
            })
            return has_enrichment_data

        await self._db.update_person(person_id, {
            "status": "synthesizing",
            **({"summary": partial_summary} if partial_summary else {}),
        })
        synthesis_result = await self._dossier_synthesizer.synthesize(
            synthesis_request,
            mode="fast",
        )

        update_data: dict[str, Any] = {
            "status": "complete",
            "summary": synthesis_result.summary,
            "occupation": synthesis_result.occupation,
            "organization": synthesis_result.organization,
        }
        if synthesis_result.dossier:
            update_data["dossier"] = synthesis_result.dossier.model_dump()

        await self._db.update_person(person_id, update_data)

        if (
            synthesis_result.dossier
            and synthesis_result.dossier.synthesis_status != "pending"
        ):
            await self._detect_and_store_connections(person_id, synthesis_result.dossier)

        if synthesis_result.dossier and synthesis_result.dossier.synthesis_status != "complete":
            logger.warning(
                "Synthesis partial for person={}: {}",
                person_id,
                synthesis_result.dossier.synthesis_error,
            )

        logger.info("Enrichment complete for person={} name={}", person_id, person_name)
        return True

    async def _enrich_person_with_identity(
        self,
        person_id: str,
        person_name: str,
    ) -> tuple[str, bool]:
        return person_id, await self._enrich_person(person_id, person_name)

    async def _store_exa_hits(
        self,
        person_id: str,
        exa_result: EnrichmentResult,
    ) -> None:
        if not hasattr(self._db, "store_intel_fragment"):
            return

        for hit in exa_result.hits[:5]:
            if not (hit.snippet or hit.title or hit.url):
                continue
            try:
                await self._db.store_intel_fragment(
                    fragment_from_enrichment_hit(
                        person_id,
                        hit,
                        agent_name="exa_fast",
                    )
                )
            except Exception as exc:
                logger.warning("Failed to store Exa fragment for {}: {}", person_id, exc)

    async def _persist_agent_result_fragment(
        self,
        person_id: str | None,
        result: AgentResult,
    ) -> None:
        if (
            not person_id
            or result.agent_name == "deep_researcher_meta"
            or not hasattr(self._db, "store_intel_fragment")
        ):
            return

        try:
            for fragment in fragments_from_agent_result(person_id, result):
                await self._db.store_intel_fragment(fragment)
        except Exception as exc:
            logger.warning("Failed to store intel fragment for {}: {}", person_id, exc)

    async def persist_research_result(
        self,
        person_id: str | None,
        result: AgentResult,
    ) -> None:
        await self._persist_agent_result_fragment(person_id, result)

    @staticmethod
    def _has_enrichment_data(
        exa_result: EnrichmentResult | None,
        browser_result: OrchestratorResult | None,
    ) -> bool:
        if exa_result and exa_result.success and exa_result.hits:
            return True
        if browser_result and browser_result.success:
            return bool(browser_result.all_snippets or browser_result.all_profiles)
        return False

    @staticmethod
    def _build_partial_summary(
        exa_result: EnrichmentResult | None,
        browser_result: OrchestratorResult | None,
    ) -> str | None:
        snippets: list[str] = []

        if exa_result and exa_result.success:
            for hit in exa_result.hits[:3]:
                text = hit.snippet or hit.title or hit.url
                if text:
                    snippets.append(text.strip())

        if browser_result and browser_result.success:
            snippets.extend(
                snippet.strip()
                for snippet in browser_result.all_snippets[:3]
                if snippet and snippet.strip()
            )

        if not snippets:
            return None

        return " | ".join(snippets)[:1000]

    async def _detect_and_store_connections(
        self,
        person_id: str,
        dossier: DossierReport,
    ) -> None:
        try:
            existing = await self._db.list_persons_with_dossiers()
        except Exception as exc:
            logger.error("Failed to list persons for connection detection: {}", exc)
            return

        existing_with_ids = []
        for person in existing:
            existing_person_id = person.get("_id") or person.get("person_id", "")
            existing_with_ids.append({**person, "person_id": existing_person_id})

        candidates = detect_connections(person_id, dossier, existing_with_ids)

        for candidate in candidates:
            try:
                await self._db.create_connection(
                    person_a_id=candidate.person_a_id,
                    person_b_id=candidate.person_b_id,
                    relationship_type=candidate.relationship_type,
                    description=candidate.description,
                )
                logger.info(
                    "Created connection: {} <-> {} ({})",
                    candidate.person_a_id,
                    candidate.person_b_id,
                    candidate.relationship_type,
                )
            except Exception as exc:
                logger.error(
                    "Failed to store connection {} <-> {}: {}",
                    candidate.person_a_id,
                    candidate.person_b_id,
                    exc,
                )

    @traced("pipeline.exa_enrichment")
    async def _run_exa(self, person_name: str) -> EnrichmentResult | None:
        if not self._exa:
            return None
        return await self._exa.enrich_person(EnrichmentRequest(name=person_name))

    @traced("pipeline.browser_research")
    async def _run_browser_research(
        self,
        person_name: str,
        *,
        person_id: str | None = None,
    ) -> OrchestratorResult | None:
        if not self._orchestrator:
            return None
        return await self._orchestrator.research_person(
            ResearchRequest(person_name=person_name),
        )

    async def stream_research(
        self,
        person_name: str,
        person_id: str | None = None,
    ) -> AsyncGenerator[AgentResult, None]:
        if not self._deep_researcher:
            return

        request = ResearchRequest(person_name=person_name)
        async for result in self._deep_researcher.research(request):
            if result.agent_name == "deep_researcher_meta":
                continue
            yield result

    @staticmethod
    def _merge_to_synthesis_request(
        person_name: str,
        exa_result: EnrichmentResult | None,
        browser_result: OrchestratorResult | None,
    ) -> SynthesisRequest:
        enrichment_snippets: list[str] = []
        social_profiles: list[SynthSocialProfile] = []
        raw_agent_data: dict[str, str] = {}

        if exa_result and exa_result.success:
            for hit in exa_result.hits:
                snippet = f"[{hit.title}]({hit.url})"
                if hit.snippet:
                    snippet += f" - {hit.snippet}"
                enrichment_snippets.append(snippet)

        if browser_result and browser_result.success:
            for profile in browser_result.all_profiles:
                social_profiles.append(
                    SynthSocialProfile(
                        platform=profile.platform,
                        url=profile.url,
                        username=profile.username,
                        bio=profile.bio,
                        followers=profile.followers,
                    )
                )
            enrichment_snippets.extend(browser_result.all_snippets)

            for agent_name, agent_result in browser_result.agent_results.items():
                if agent_result.snippets:
                    raw_agent_data[agent_name] = " | ".join(agent_result.snippets)

        return SynthesisRequest(
            person_name=person_name,
            enrichment_snippets=enrichment_snippets,
            social_profiles=social_profiles,
            raw_agent_data=raw_agent_data,
        )

    @staticmethod
    def _build_pending_dossier(
        request: SynthesisRequest,
        *,
        partial_summary: str | None = None,
    ) -> DossierReport:
        summary = partial_summary or ""
        social_links: dict[str, str] = {}
        for profile in request.social_profiles:
            platform = profile.platform.lower()
            if platform in {"linkedin", "twitter", "instagram", "github", "website"}:
                social_links.setdefault(platform, profile.url)

        return DossierReport(
            structured={
                "social_profiles": social_links,
                "notable_activity": request.enrichment_snippets[:5],
                "conversation_hooks": [],
                "risk_flags": [],
            },
            narrative={
                "summary": summary,
                "paragraphs": [summary] if summary else [],
            },
            synthesis_status="pending",
            synthesis_error="Synthesis not configured",
            structured_by="fallback",
            narrative_by="fallback" if summary else None,
        )
