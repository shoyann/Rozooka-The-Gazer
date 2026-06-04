from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"]
    environment: str
    services: dict[str, bool]


class CaptureQueuedResponse(BaseModel):
    capture_id: str
    filename: str | None = None
    content_type: str | None = None
    status: Literal["queued"]
    source: Literal["upload", "video", "camera"]


class CaptureResponse(BaseModel):
    capture_id: str
    status: Literal[
        "queued",
        "processing",
        "identifying",
        "researching",
        "synthesizing",
        "complete",
        "processed",
        "error",
        "failed",
    ]
    success: bool = True
    source: Literal["upload", "video", "camera"]
    filename: str | None = None
    content_type: str | None = None
    timestamp: int | None = None
    total_frames: int = 0
    faces_detected: int = 0
    persons_created: list[str] = Field(default_factory=list)
    persons_enriched: int = 0
    error: str | None = None


class ServiceStatus(BaseModel):
    name: str
    configured: bool
    notes: str | None = None


class FrameSubmission(BaseModel):
    frame: str
    timestamp: int | None = None
    source: Literal["camera"] = "camera"
