from __future__ import annotations

import cv2
import numpy as np
from loguru import logger

from identification.models import (
    BoundingBox,
    DetectedFace,
    FaceDetectionRequest,
    FaceDetectionResult,
)

_CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"


class OpenCVFaceDetector:
    """Face detector backed by OpenCV Haar cascades."""

    def __init__(self, *, cascade_path: str = _CASCADE_PATH) -> None:
        self._cascade_path = cascade_path
        self._classifier = cv2.CascadeClassifier(cascade_path)
        self._configured = not self._classifier.empty()
        if not self._configured:
            logger.warning("OpenCV cascade not found at {}", cascade_path)

    @property
    def configured(self) -> bool:
        return self._configured

    async def detect_faces(self, request: FaceDetectionRequest) -> FaceDetectionResult:
        """Detect faces in an image using OpenCV Haar cascades."""
        try:
            buffer = np.frombuffer(request.image_data, dtype=np.uint8)
            frame = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
            if frame is None:
                raise ValueError("cv2.imdecode returned None")
            height, width = frame.shape[:2]
        except Exception as exc:
            logger.error("Failed to decode image for face detection: {}", exc)
            return FaceDetectionResult(success=False, error=f"Image decode failed: {exc}")

        if not self._configured:
            return FaceDetectionResult(
                frame_width=width,
                frame_height=height,
                success=False,
                error="OpenCV face cascade file not found",
            )

        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            detections = self._classifier.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30),
            )
        except Exception as exc:
            logger.error("OpenCV face detection failed: {}", exc)
            return FaceDetectionResult(
                frame_width=width,
                frame_height=height,
                success=False,
                error=f"Detection failed: {exc}",
            )

        faces: list[DetectedFace] = []
        sorted_detections = sorted(
            detections,
            key=lambda det: int(det[2]) * int(det[3]),
            reverse=True,
        )
        for x, y, w, h in sorted_detections[: request.max_faces]:
            faces.append(DetectedFace(
                bbox=BoundingBox(
                    x=max(0.0, min(1.0, x / width)),
                    y=max(0.0, min(1.0, y / height)),
                    width=max(0.0, min(1.0, w / width)),
                    height=max(0.0, min(1.0, h / height)),
                ),
                confidence=1.0,
            ))

        logger.info("Detected {} face(s) in {}x{} frame", len(faces), width, height)
        return FaceDetectionResult(
            faces=faces,
            frame_width=width,
            frame_height=height,
            success=True,
        )


MediaPipeFaceDetector = OpenCVFaceDetector
