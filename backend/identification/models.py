from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    """Face bounding box coordinates (normalized 0-1)."""

    x: float = Field(ge=0.0, le=1.0)
    y: float = Field(ge=0.0, le=1.0)
    width: float = Field(ge=0.0, le=1.0)
    height: float = Field(ge=0.0, le=1.0)


class DetectedFace(BaseModel):
    """A single detected face with embedding."""

    bbox: BoundingBox
    confidence: float = Field(ge=0.0, le=1.0)
    embedding: list[float] = Field(default_factory=list)


class FaceDetectionRequest(BaseModel):
    """Input for face detection."""

    image_data: bytes
    max_faces: int = Field(default=10, ge=1, le=50)
    min_confidence: float = Field(default=0.5, ge=0.0, le=1.0)


class FaceDetectionResult(BaseModel):
    """Output from face detection."""

    faces: list[DetectedFace] = Field(default_factory=list)
    frame_width: int = 0
    frame_height: int = 0
    success: bool = True
    error: str | None = None


class FaceSearchRequest(BaseModel):
    """Input for reverse face search."""

    embedding: list[float] | None = None
    image_data: bytes | None = None
    search_engines: list[str] = Field(default_factory=lambda: ["pimeyes"])


class FaceSearchMatch(BaseModel):
    """A single match from reverse face search."""

    url: str
    thumbnail_url: str | None = None
    title: str | None = None
    similarity: float = Field(ge=0.0, le=1.0)
    source: str
    person_name: str | None = None


class FaceSearchResult(BaseModel):
    """Output from reverse face search."""

    matches: list[FaceSearchMatch] = Field(default_factory=list)
    success: bool = True
    error: str | None = None


class IdentityEvidence(BaseModel):
    """A single piece of evidence that supports or weakens an identity candidate."""

    candidate_name: str | None = None
    normalized_name: str | None = None
    source_type: str
    source_engine: str
    url: str | None = None
    title: str | None = None
    similarity: float | None = Field(default=None, ge=0.0, le=1.0)
    weight: float = 0.0
    strong: bool = False


class IdentityCandidate(BaseModel):
    """Aggregated vote result for a single candidate identity."""

    name: str
    normalized_name: str
    score: float = 0.0
    independent_sources: int = 0
    evidence_count: int = 0
    source_types: list[str] = Field(default_factory=list)
    urls: list[str] = Field(default_factory=list)


class IdentityResolution(BaseModel):
    """Final identity state for a face after multi-source voting."""

    status: Literal["confirmed", "candidate", "manual_review_required"]
    resolved_name: str | None = None
    candidates: list[IdentityCandidate] = Field(default_factory=list)
    evidence: list[IdentityEvidence] = Field(default_factory=list)
    review_urls: list[str] = Field(default_factory=list)
    reason: str | None = None
