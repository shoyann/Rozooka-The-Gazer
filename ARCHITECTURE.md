# The Gazer Architecture

Last updated: 2026-06-04

## Runtime Components

```text
Next.js Frontend (port 3001)
  |-- Upload image/video
  |-- Camera getUserMedia frame capture
  |-- Deep Research SSE viewer
  |-- Convex live board rendering

FastAPI Backend (port 8000)
  |-- /api/health
  |-- /api/services
  |-- /api/capture
  |-- /api/capture/frame
  |-- /api/capture/{id}
  |-- /api/person/{id}
  `-- /api/research/{name}/stream

Convex
  |-- captures
  |-- persons
  |-- intelFragments
  |-- connections
  `-- activityLog

External services
  |-- PimEyes via cookies + httpx
  |-- Exa
  |-- Gemini
  |-- Anthropic, optional
  |-- Browser Use, optional
  |-- Sherlock, local/free
  `-- 64x / AgentMail, optional
```

## Backend Module Map

```text
backend/main.py
  FastAPI app, route declarations, dependency construction.

backend/config.py
  Pydantic settings. Reads backend/.env and root .env. All fields optional.

backend/capture/service.py
  Request-level capture facade. Validates uploads/base64 frames and queues work.

backend/capture/frame_extractor.py
  Image decode and video frame extraction. Video depends on ffmpeg availability.

backend/pipeline.py
  Main orchestration: capture lifecycle, detection, identity, enrichment, synthesis, Convex updates.

backend/identification/
  OpenCV detector, embedding stub/path, PimEyes client, reverse search manager, identity models.

backend/enrichment/
  Exa and optional enrichment clients.

backend/agents/
  DeepResearcher, Sherlock, Browser Use, social/search agents, optional account clients.

backend/synthesis/
  Gemini and Anthropic engines, dossier models, synthesis service, provider-error sanitization.

backend/db/
  ConvexGateway for real persistence and InMemoryDatabaseGateway for tests/fallback.

backend/tests/
  Regression tests for capture validation, manual identity, degraded Deep Research, synthesis errors.
```

## Frontend Module Map

```text
frontend/src/app/page.tsx
  App entry point.

frontend/src/app/layout.tsx
  Metadata and global CSS import.

frontend/src/app/globals.css
  Tailwind/global visual system.

frontend/src/components/gazer/GazerDashboard.tsx
  Main intelligence board: services, upload, webcam, captures, dossier.

frontend/src/components/gazer/DeepResearchBoard.tsx
  Deep Research controls and SSE display.

frontend/src/components/gazer/CinematicIntelCard.tsx
  Intel fragment/card rendering and source tags.

frontend/src/components/gazer/CinematicLoader.tsx
  Cinematic loading animation.

frontend/convex/
  Convex schema and mutations/queries.
```

## API Contracts

### `GET /api/health`

Returns backend status and service flags.

```json
{
  "status": "ok",
  "environment": "development",
  "services": {
    "convex": true,
    "exa": true,
    "gemini": true,
    "anthropic": false,
    "browser_use": false,
    "sherlock": true
  }
}
```

### `GET /api/services`

Returns a list of configured services with short notes. The frontend uses this for degraded-state labels.

### `POST /api/capture`

Multipart upload endpoint.

Request:

```powershell
curl -X POST "http://127.0.0.1:8000/api/capture?person_name=Elon%20Musk" `
  -F "file=@C:\path\to\face.jpg"
```

Response is fast and usually starts as `queued`.

```json
{
  "capture_id": "cap_xxx",
  "status": "queued",
  "success": true,
  "source": "upload",
  "filename": "face.jpg",
  "content_type": "image/jpeg",
  "total_frames": 0,
  "faces_detected": 0,
  "persons_created": [],
  "persons_enriched": 0
}
```

### `POST /api/capture/frame`

Base64 camera frame endpoint.

```json
{
  "frame": "data:image/jpeg;base64,...",
  "timestamp": 1712345678901,
  "source": "camera"
}
```

### `GET /api/capture/{id}`

Returns capture lifecycle state after background processing.

### `GET /api/person/{id}`

Returns a person by public `person_id`.

### `GET /api/research/{name}/stream`

SSE endpoint. Query params:

- `mode=fast|deep`
- `person_id=person_xxx`, optional but recommended
- `image_url=...`, optional

Events:

- `init`
- `result`
- `dossier`
- `complete`

## Data Lifecycle

```text
queued
-> processing
-> identifying
-> researching
-> synthesizing
-> complete
```

Failure states:

- `failed`: invalid media, no frames, processing exception.
- partial person/dossier state: enrichment succeeded but synthesis failed or quota-limited.

## Convex Schema Notes

Important bug already fixed:

- `persons.store` must persist `person_id`.
- Without `person_id`, backend-created IDs such as `person_xxx` cannot be retrieved through `GET /api/person/{id}`.

Important fields:

- `persons.identity_status`
- `persons.identity_candidates`
- `persons.identity_evidence`
- `persons.metadata.reviewUrls`
- `persons.dossier.structured`
- `persons.dossier.narrative`
- `intelFragments.person_id`

## Development Commands

Backend:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\backend
uv sync
uv run python -c "from main import app; print('OK')"
uv run pytest --override-ini addopts='' tests
uv run uvicorn main:app --reload --port 8000
```

Frontend:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\frontend
npm install
npm run build
npm run dev -- --port 3001
```

Convex:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\frontend
npx convex dev --once
```

## Repository Hygiene

Commit source, lockfiles, tests, and docs.

Do not commit:

- `backend/.env`
- `frontend/.env.local`
- `backend/identification/pimeyes_cookies.json`
- `frontend/node_modules/`
- `backend/.venv/`
- `.next/`
- `__pycache__/`
- screenshots, runtime logs, local curl outputs, temporary capture responses

## Extension Points

Best next backend extension:

- Move all enrichment outputs into a single IntelFragment interface and make agents pluggable.

Best next frontend extension:

- Add Playwright smoke tests for upload, service degradation, capture completion, and SSE rendering.

Best next product extension:

- Make Deep Research a user-controlled button with clear cost/time warning and live source-by-source progress.
