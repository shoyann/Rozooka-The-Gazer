from __future__ import annotations

import base64
import binascii
from uuid import uuid4

from fastapi import UploadFile
from loguru import logger

from pipeline import CapturePipeline
from schemas import CaptureQueuedResponse


DATA_URL_IMAGE_PREFIX = "data:image/"


class CaptureService:
    """Process image uploads, video uploads, and single camera frames."""

    def __init__(self, pipeline: CapturePipeline | None = None) -> None:
        self._pipeline = pipeline

    @property
    def pipeline(self) -> CapturePipeline | None:
        return self._pipeline

    @pipeline.setter
    def pipeline(self, value: CapturePipeline) -> None:
        self._pipeline = value

    async def enqueue_upload(
        self,
        file: UploadFile,
        person_name: str | None = None,
    ) -> CaptureQueuedResponse | dict:
        capture_id = f"cap_{uuid4().hex[:12]}"
        filename = file.filename or "upload.bin"
        content_type = file.content_type or "application/octet-stream"
        source = self._source_from_content_type(content_type)
        normalized_person_name = self._normalize_person_name(person_name)

        data = await file.read()
        if not data:
            raise ValueError("Upload file is empty")

        if self._pipeline is None:
            logger.warning("No pipeline configured, returning queued response only")
            return CaptureQueuedResponse(
                capture_id=capture_id,
                filename=filename,
                content_type=content_type,
                status="queued",
                source=source,
            )

        await self._pipeline.initialize_capture(
            capture_id=capture_id,
            content_type=content_type,
            source=source,
            filename=filename,
            person_name=normalized_person_name,
        )
        self._pipeline.schedule_process(
            capture_id=capture_id,
            data=data,
            content_type=content_type,
            source=source,
            person_name=normalized_person_name,
        )
        return {
            "capture_id": capture_id,
            "status": "queued",
            "success": True,
            "source": source,
            "filename": filename,
            "content_type": content_type,
            "total_frames": 0,
            "faces_detected": 0,
            "persons_created": [],
            "persons_enriched": 0,
            "error": None,
        }

    async def process_camera_frame(
        self,
        frame_b64: str,
        *,
        timestamp: int | None = None,
        person_name: str | None = None,
    ) -> dict:
        capture_id = f"cap_{uuid4().hex[:12]}"
        image_data = self._decode_base64_frame(frame_b64)
        normalized_person_name = self._normalize_person_name(person_name)

        if self._pipeline is None:
            logger.warning("No pipeline configured, returning queued camera response only")
            return {
                "capture_id": capture_id,
                "status": "queued",
                "success": True,
                "source": "camera",
                "timestamp": timestamp,
                "total_frames": 0,
                "faces_detected": 0,
                "persons_created": [],
                "persons_enriched": 0,
                "error": None,
            }

        await self._pipeline.initialize_capture(
            capture_id=capture_id,
            content_type="image/jpeg",
            source="camera",
            timestamp=timestamp,
            person_name=normalized_person_name,
        )
        self._pipeline.schedule_process(
            capture_id=capture_id,
            data=image_data,
            content_type="image/jpeg",
            source="camera",
            person_name=normalized_person_name,
        )
        return {
            "capture_id": capture_id,
            "status": "queued",
            "success": True,
            "source": "camera",
            "timestamp": timestamp,
            "content_type": "image/jpeg",
            "total_frames": 0,
            "faces_detected": 0,
            "persons_created": [],
            "persons_enriched": 0,
            "error": None,
        }

    async def get_capture(self, capture_id: str) -> dict | None:
        if self._pipeline is None:
            return None
        return await self._pipeline.get_capture(capture_id)

    @staticmethod
    def _decode_base64_frame(frame_b64: str) -> bytes:
        if not frame_b64 or not frame_b64.strip():
            raise ValueError("Frame payload is empty")

        if frame_b64.startswith("data:") and not frame_b64.startswith(DATA_URL_IMAGE_PREFIX):
            raise ValueError("Frame data URL must contain an image payload")

        payload = frame_b64.split(",", maxsplit=1)[-1].strip()
        if not payload:
            raise ValueError("Frame payload is empty")

        try:
            data = base64.b64decode(payload, validate=True)
        except binascii.Error as exc:
            raise ValueError("Frame payload is not valid base64") from exc

        if not data:
            raise ValueError("Frame payload is empty")
        return data

    @staticmethod
    def _normalize_person_name(person_name: str | None) -> str | None:
        if person_name is None:
            return None
        normalized = " ".join(person_name.split())
        return normalized or None

    @staticmethod
    def _source_from_content_type(content_type: str) -> str:
        if content_type.startswith("image/"):
            return "upload"
        if content_type.startswith("video/"):
            return "video"
        raise ValueError(f"Unsupported upload content type: {content_type}")
