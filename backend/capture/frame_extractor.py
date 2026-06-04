from __future__ import annotations

import io
import subprocess
import tempfile
from pathlib import Path

from loguru import logger
from PIL import Image

IMAGE_TYPES = frozenset({
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
})

VIDEO_TYPES = frozenset({
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
    "video/x-matroska",
})


def extract_frames(
    data: bytes,
    content_type: str,
    *,
    max_frames: int | None = None,
    fps: float = 1.0,
) -> list[bytes]:
    """Extract frames from uploaded media.

    Images are normalized into a single JPEG frame.
    Videos are sampled by ffmpeg at 1 frame per second.
    """
    if not data:
        raise ValueError("Empty media payload")

    if content_type in IMAGE_TYPES:
        return _handle_image(data)

    if content_type in VIDEO_TYPES:
        return _handle_video(data, max_frames=max_frames, fps=fps)

    logger.warning("Unsupported content type: {}, treating as image", content_type)
    return _handle_image(data)


def _handle_image(data: bytes) -> list[bytes]:
    try:
        img = Image.open(io.BytesIO(data))
        img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        return [buf.getvalue()]
    except Exception as exc:
        logger.exception("Failed to decode image")
        raise ValueError("Unable to decode image payload") from exc


def _handle_video(
    data: bytes,
    *,
    max_frames: int | None = None,
    fps: float = 1.0,
) -> list[bytes]:
    with tempfile.TemporaryDirectory() as tmpdir:
        video_path = Path(tmpdir) / "input.mp4"
        video_path.write_bytes(data)

        output_pattern = Path(tmpdir) / "frame_%04d.jpg"
        cmd = [
            "ffmpeg",
            "-i", str(video_path),
            "-vf", f"fps={fps}",
            "-q:v", "2",
            str(output_pattern),
            "-y",
            "-loglevel", "error",
        ]
        if max_frames is not None:
            cmd[4:4] = ["-frames:v", str(max_frames)]

        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=30)
        except FileNotFoundError:
            logger.error("ffmpeg not found; cannot extract video frames")
            return []
        except subprocess.TimeoutExpired:
            logger.error("ffmpeg timed out extracting frames")
            return []
        except subprocess.CalledProcessError as exc:
            logger.error("ffmpeg failed: {}", exc.stderr.decode(errors="replace"))
            return []

        frame_files = sorted(Path(tmpdir).glob("frame_*.jpg"))
        if max_frames is not None:
            frame_files = frame_files[:max_frames]
        frames = [frame.read_bytes() for frame in frame_files]
        logger.info("Extracted {} frames from video", len(frames))
        return frames
