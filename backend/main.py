from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from sse_starlette.sse import EventSourceResponse

from agents.deep_researcher import DeepResearcher
from agents.models import AgentResult, AgentStatus
from capture.service import CaptureService
from config import get_settings
from db.convex_client import ConvexGateway
from db.memory_gateway import InMemoryDatabaseGateway
from enrichment.exa_client import ExaEnrichmentClient
from enrichment.models import EnrichmentRequest
from identification.detector import OpenCVFaceDetector
from identification.embedder import ArcFaceEmbedder
from identification.search_manager import FaceSearchManager
from pipeline import CapturePipeline
from schemas import CaptureResponse, FrameSubmission, HealthResponse, ServiceStatus
from synthesis.anthropic_engine import AnthropicSynthesisEngine
from synthesis.engine import GeminiSynthesisEngine
from synthesis.models import SynthesisRequest
from synthesis.service import DossierSynthesisService

settings = get_settings()

detector = OpenCVFaceDetector()
embedder = ArcFaceEmbedder()
convex_gateway = ConvexGateway(settings)
db_gateway = convex_gateway if convex_gateway.configured else InMemoryDatabaseGateway()
face_searcher = FaceSearchManager(settings)
exa_client = ExaEnrichmentClient(settings) if settings.exa_api_key else None
deep_researcher = DeepResearcher(settings)

synthesis_engine = AnthropicSynthesisEngine(settings) if settings.anthropic_api_key else None
synthesis_fallback = GeminiSynthesisEngine(settings) if settings.gemini_api_key else None
dossier_synthesizer = DossierSynthesisService(
    gemini=synthesis_fallback,
    anthropic=synthesis_engine,
)
active_synthesis_engine = dossier_synthesizer

pipeline = CapturePipeline(
    detector=detector,
    embedder=embedder,
    db=db_gateway,
    face_searcher=face_searcher,
    exa_client=exa_client,
    orchestrator=None,
    dossier_synthesizer=dossier_synthesizer,
)
if deep_researcher:
    pipeline._deep_researcher = deep_researcher

capture_service = CaptureService(pipeline=pipeline)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    logger.info(
        "The Gazer started det={} db={} exa={} deep_researcher={} synthesis={}",
        detector.__class__.__name__,
        db_gateway.__class__.__name__,
        exa_client is not None,
        deep_researcher.configured,
        dossier_synthesizer.configured,
    )
    yield
    await pipeline.cancel_background_tasks()
    logger.info("The Gazer shutting down")


app = FastAPI(
    title=settings.app_name or "The Gazer API",
    version="0.1.0",
    summary="The Gazer backend skeleton",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin or "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        environment=settings.environment or "development",
        services=settings.service_flags(),
    )


@app.get("/api/services", response_model=list[ServiceStatus])
async def services() -> list[ServiceStatus]:
    descriptions = {
        "convex": "Convex persistence for captures and people",
        "mongodb": "Optional alternate persistence",
        "exa": "Fast enrichment lookup",
        "browser_use": "Deep browser-driven research (deep mode only)",
        "openai": "Optional browser agent support",
        "gemini": "Structured dossier + base narrative synthesis",
        "anthropic": "Preferred deep/full narrative synthesis",
        "pimeyes_pool": "Face-search account pool",
        "pimeyes": "Direct PimEyes credentials",
        "sixtyfour": "Structured deep search enrichment",
        "sherlock": "Username-hunting OSINT source for deep mode",
    }
    flags = settings.service_flags()
    return [
        ServiceStatus(name=name, configured=configured, notes=descriptions.get(name))
        for name, configured in flags.items()
    ]


@app.post("/api/capture", response_model=CaptureResponse)
async def capture(
    file: UploadFile = File(...),
    person_name: str | None = Query(default=None),
) -> CaptureResponse:
    try:
        payload = await capture_service.enqueue_upload(file=file, person_name=person_name)
        return CaptureResponse(**payload)
    except Exception as exc:
        logger.error("Capture upload failed: {}", exc)
        raise HTTPException(status_code=400, detail=f"Capture failed: {exc}") from exc


@app.post("/api/capture/frame", response_model=CaptureResponse)
async def capture_frame(submission: FrameSubmission) -> CaptureResponse:
    try:
        payload = await capture_service.process_camera_frame(
            submission.frame,
            timestamp=submission.timestamp,
            person_name=None,
        )
        return CaptureResponse(**payload)
    except Exception as exc:
        logger.error("Camera frame processing failed: {}", exc)
        raise HTTPException(status_code=400, detail=f"Frame processing failed: {exc}") from exc


@app.get("/api/capture/{id}", response_model=CaptureResponse)
async def get_capture(id: str) -> CaptureResponse:
    capture = await capture_service.get_capture(id)
    if capture is None:
        raise HTTPException(status_code=404, detail=f"Capture {id} not found")
    return CaptureResponse(**capture)


@app.get("/api/person/{id}")
async def get_person(id: str):
    person = await db_gateway.get_person(id)
    if person is None:
        raise HTTPException(status_code=404, detail=f"Person {id} not found")
    return person


@app.get("/api/research/{name}/stream")
async def stream_research(
    name: str,
    image_url: str | None = None,
    person_id: str | None = None,
    mode: Literal["fast", "deep"] = Query(default="fast"),
):
    import json as _json

    async def event_generator():
        active_person_id = person_id
        if active_person_id:
            try:
                existing_person = await db_gateway.get_person(active_person_id)
            except Exception as exc:
                logger.warning(
                    "Failed to look up research person {} for {}: {}",
                    active_person_id,
                    name,
                    exc,
                )
                existing_person = None

            if existing_person is None:
                failure = AgentResult(
                    agent_name="research_target",
                    status=AgentStatus.FAILED,
                    snippets=[f"Person {active_person_id} not found for research stream."],
                    error="person_not_found",
                )
                yield {
                    "event": "init",
                    "data": _json.dumps({
                        "person_id": active_person_id,
                        "person_name": name,
                        "image_url": image_url,
                        "mode": mode,
                    }),
                }
                yield {"event": "result", "data": failure.model_dump_json()}
                yield {
                    "event": "complete",
                    "data": _json.dumps({
                        "person_id": active_person_id,
                        "mode": mode,
                        "total_sources": 0,
                        "total_urls": 0,
                    }),
                }
                return

            try:
                await db_gateway.update_person(active_person_id, {"status": "researching"})
            except Exception as exc:
                logger.warning(
                    "Failed to mark person {} as researching: {}",
                    active_person_id,
                    exc,
                )
        else:
            try:
                active_person_id = await db_gateway.store_person(
                    f"stream_{uuid4().hex[:12]}",
                    {
                        "name": name,
                        "photoUrl": image_url or "",
                        "confidence": 0.9,
                        "status": "researching",
                    },
                )
            except Exception as exc:
                logger.warning("Failed to create research placeholder for {}: {}", name, exc)

        yield {
            "event": "init",
            "data": _json.dumps({
                "person_id": active_person_id,
                "person_name": name,
                "image_url": image_url,
                "mode": mode,
            }),
        }

        all_snippets: list[str] = []
        all_urls: list[str] = []
        all_sources: list[str] = []
        agent_data: dict[str, str] = {}

        async def collect_result(result: AgentResult) -> None:
            all_snippets.extend(result.snippets[:5])
            all_urls.extend(result.urls_found[:10])
            all_sources.append(result.agent_name)
            if result.snippets:
                agent_data[result.agent_name] = "\n".join(result.snippets[:10])
            await pipeline.persist_research_result(active_person_id, result)

        if mode == "deep":
            if not deep_researcher.configured:
                failure = AgentResult(
                    agent_name="deep_researcher",
                    status=AgentStatus.FAILED,
                    snippets=["Deep research unavailable: no deep-mode sources are configured."],
                    error="deep_research_unavailable",
                )
                await collect_result(failure)
                yield {"event": "result", "data": failure.model_dump_json()}
            else:
                try:
                    async for result in pipeline.stream_research(name, active_person_id):
                        await collect_result(result)
                        yield {"event": "result", "data": result.model_dump_json()}
                except Exception as exc:
                    logger.error("Deep research stream failed for {}: {}", name, exc)
                    failure = AgentResult(
                        agent_name="deep_researcher",
                        status=AgentStatus.FAILED,
                        snippets=[f"Research pipeline error: {exc}"],
                    )
                    await collect_result(failure)
                    yield {"event": "result", "data": failure.model_dump_json()}
        elif exa_client:
            try:
                exa_result = await exa_client.enrich_person(EnrichmentRequest(name=name))
                if exa_result.success and exa_result.hits:
                    result = AgentResult(
                        agent_name="exa_fast",
                        status=AgentStatus.SUCCESS,
                        snippets=[
                            f"[Exa] {hit.title}: {hit.snippet or ''}".strip()
                            for hit in exa_result.hits[:10]
                        ],
                        urls_found=[hit.url for hit in exa_result.hits if hit.url][:10],
                    )
                else:
                    result = AgentResult(
                        agent_name="exa_fast",
                        status=AgentStatus.FAILED,
                        snippets=[exa_result.error or "No results found"],
                    )
                await collect_result(result)
                yield {"event": "result", "data": result.model_dump_json()}
            except Exception as exc:
                logger.error("Exa research failed for {}: {}", name, exc)
                failure = AgentResult(
                    agent_name="exa_fast",
                    status=AgentStatus.FAILED,
                    snippets=[f"Exa enrichment error: {exc}"],
                )
                await collect_result(failure)
                yield {"event": "result", "data": failure.model_dump_json()}
        else:
            failure = AgentResult(
                agent_name="research_unavailable",
                status=AgentStatus.FAILED,
                snippets=["Fast research is unavailable: configure EXA_API_KEY."],
            )
            await collect_result(failure)
            yield {"event": "result", "data": failure.model_dump_json()}

        if active_person_id and active_synthesis_engine and all_snippets:
            try:
                synthesis_result = await active_synthesis_engine.synthesize(
                    SynthesisRequest(
                        person_name=name,
                        enrichment_snippets=all_snippets[:50],
                        raw_agent_data=agent_data,
                    ),
                    mode="deep" if mode == "deep" else "fast",
                )
                if synthesis_result.dossier:
                    dossier = synthesis_result.dossier
                    await db_gateway.update_person(active_person_id, {
                        "status": "complete",
                        "summary": synthesis_result.summary,
                        "occupation": synthesis_result.occupation,
                        "organization": synthesis_result.organization,
                        "dossier": dossier.model_dump(),
                    })
                    yield {
                        "event": "dossier",
                        "data": _json.dumps(dossier.to_frontend_dict()),
                    }
            except Exception as exc:
                logger.error("Synthesis failed during research stream for {}: {}", name, exc)

        if active_person_id:
            try:
                await db_gateway.update_person(active_person_id, {"status": "complete"})
            except Exception as exc:
                logger.warning(
                    "Failed to finalize research status for {}: {}",
                    active_person_id,
                    exc,
                )

        yield {
            "event": "complete",
            "data": _json.dumps({
                "person_id": active_person_id,
                "mode": mode,
                "total_sources": len(all_sources),
                "total_urls": len(all_urls),
            }),
        }

    return EventSourceResponse(event_generator())
