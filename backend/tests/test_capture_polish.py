from __future__ import annotations

import io

import pytest
from PIL import Image

import pipeline as pipeline_module
from agents.deep_researcher import DeepResearcher
from agents.models import AgentStatus, ResearchRequest
from capture.frame_extractor import extract_frames
from capture.service import CaptureService
from config import Settings
from db.memory_gateway import InMemoryDatabaseGateway
from identification.models import BoundingBox, DetectedFace, FaceDetectionResult
from pipeline import CapturePipeline
from synthesis.errors import friendly_provider_error


class StubUploadFile:
    filename = "empty.jpg"
    content_type = "image/jpeg"

    def __init__(self, data: bytes) -> None:
        self._data = data

    async def read(self) -> bytes:
        return self._data


class StubDetector:
    async def detect_faces(self, _request):
        return FaceDetectionResult(
            faces=[
                DetectedFace(
                    bbox=BoundingBox(x=0.1, y=0.1, width=0.5, height=0.5),
                    confidence=0.95,
                )
            ],
            frame_width=32,
            frame_height=32,
            success=True,
        )


class StubEmbedder:
    def embed(self, _face, _frame_bytes):
        return [0.1, 0.2, 0.3]


async def test_capture_service_rejects_empty_upload_and_empty_frame() -> None:
    service = CaptureService(pipeline=None)

    with pytest.raises(ValueError, match="empty"):
        await service.enqueue_upload(StubUploadFile(b""))

    with pytest.raises(ValueError, match="empty"):
        await service.process_camera_frame("data:image/jpeg;base64,")


def test_extract_frames_rejects_invalid_image_payload() -> None:
    with pytest.raises(ValueError, match="decode image"):
        extract_frames(b"not an image", "image/jpeg")


async def test_pipeline_marks_no_frames_as_failed(monkeypatch: pytest.MonkeyPatch) -> None:
    db = InMemoryDatabaseGateway()
    capture_pipeline = CapturePipeline(
        detector=StubDetector(),
        embedder=StubEmbedder(),
        db=db,
    )

    monkeypatch.setattr(pipeline_module, "extract_frames", lambda *_args, **_kwargs: [])

    result = await capture_pipeline.process(
        "cap_empty",
        b"non-empty",
        "video/mp4",
        person_name=None,
    )

    capture = await db.get_capture("cap_empty")
    assert result.success is False
    assert capture is not None
    assert capture["status"] == "failed"
    assert capture["error"] == "No frames extracted from media payload"


async def test_manual_person_name_creates_confirmed_person_and_triggers_enrichment() -> None:
    db = InMemoryDatabaseGateway()
    capture_pipeline = CapturePipeline(
        detector=StubDetector(),
        embedder=StubEmbedder(),
        db=db,
    )
    enriched_names: list[str] = []

    async def fake_enrich(_person_id: str, person_name: str) -> bool:
        enriched_names.append(person_name)
        return True

    capture_pipeline._enrich_person = fake_enrich  # type: ignore[method-assign]

    image = Image.new("RGB", (32, 32), color="white")
    image_buffer = io.BytesIO()
    image.save(image_buffer, format="JPEG")

    result = await capture_pipeline.process(
        "cap_manual",
        image_buffer.getvalue(),
        "image/jpeg",
        person_name="  Elon   Musk  ",
    )

    capture = await db.get_capture("cap_manual")
    assert result.success is True
    assert capture is not None
    assert capture["persons_enriched"] == 1
    assert enriched_names == ["Elon Musk"]

    person = await db.get_person(result.persons_created[0])
    assert person is not None
    assert person["name"] == "Elon Musk"
    assert person["identity_status"] == "confirmed"
    assert person["identity_source"] == "manual_input"
    assert person["identity_confirmed"] is True
    assert person["metadata"]["identitySource"] == "manual_input"
    assert person["metadata"]["identityConfirmed"] is True
    assert person["identity_candidates"][0]["name"] == "Elon Musk"
    assert person["identity_evidence"][0]["source_type"] == "manual_input"


async def test_deep_researcher_emits_browser_use_skipped_when_key_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    researcher = DeepResearcher(
        Settings(
            _env_file=None,
            EXA_API_KEY="fake-exa-key",
            BROWSER_USE_API_KEY="",
            SIXTYFOUR_API_KEY="",
        )
    )

    async def fake_exa_pass(*_args, **_kwargs):
        return [], []

    async def fake_sherlock_research(*_args, **_kwargs):
        return None

    async def fake_enrich_lead(*_args, **_kwargs):
        return None

    async def fake_start_deep_search(*_args, **_kwargs):
        return None

    monkeypatch.setattr(researcher, "_exa_pass", fake_exa_pass)
    monkeypatch.setattr(researcher._sherlock, "research", fake_sherlock_research)
    monkeypatch.setattr(researcher._sixtyfour, "enrich_lead", fake_enrich_lead)
    monkeypatch.setattr(researcher._sixtyfour, "start_deep_search", fake_start_deep_search)

    results = [
        result async for result in researcher.research(ResearchRequest(person_name="Jane Doe"))
    ]

    skipped = [result for result in results if result.agent_name == "browser_use_skipped"]
    assert len(skipped) == 1
    assert skipped[0].status == AgentStatus.SUCCESS
    assert "Browser Use unavailable" in skipped[0].snippets[0]


def test_friendly_provider_error_shortens_raw_quota_errors() -> None:
    raw_error = (
        "429 RESOURCE_EXHAUSTED. {'error': {'message': 'You exceeded your current quota', "
        "'details': [{'quotaMetric': 'generativelanguage.googleapis.com/request'}]}}"
    )

    assert friendly_provider_error("Gemini", raw_error) == (
        "Gemini is temporarily rate limited. Please retry later."
    )
