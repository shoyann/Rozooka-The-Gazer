# ROZOOKA // THE GAZER

> Tactical person-intelligence console for controlled OSINT demonstrations.

The Gazer is a cinematic intelligence-board system adapted from the JARVIS pipeline. It ingests images, videos, or live camera frames, detects visible faces, attempts identity resolution, enriches public web intelligence, synthesizes dossiers, and streams results to a real-time operator console.

This repository is a prototype system, not a production surveillance platform.

---

## System Class

```text
PROGRAM:        ROZOOKA // THE GAZER
CLASS:          Local OSINT intelligence board
MISSION:        Capture -> Identify -> Enrich -> Synthesize -> Display
FRONTEND:       Next.js 14 tactical console
BACKEND:        FastAPI intelligence pipeline
DATA PLANE:     Convex real-time persistence
STATUS:         Prototype / demo-ready with configured API keys
```

## Operational Capabilities

- Image intake: upload a face image and process it through the full pipeline.
- Video intake: upload a video and extract frames at 1 FPS for face detection.
- Camera intake: submit base64 frames from a webcam stream.
- Face detection: OpenCV Haar Cascade.
- Identity search: PimEyes cookie-backed direct HTTP flow.
- Enrichment: Exa fast search, Sherlock local OSINT, optional Browser Use deep research.
- Dossier synthesis: Gemini fallback, Anthropic preferred when configured.
- Real-time board: Convex-backed frontend with intel cards, status panels, and dossier display.
- Degraded mode: missing APIs do not hard-crash the system; unavailable modules report reduced capability.

## Repository Layout

```text
the-gazer/
|-- backend/              # FastAPI capture, identity, enrichment, synthesis pipeline
|-- frontend/             # Next.js + Tailwind intelligence board
|-- HANDOFF.md            # Current project status and handoff notes
|-- SYSTEM_DESIGN.md      # Product/system design
|-- ARCHITECTURE.md       # Runtime architecture and API contracts
`-- README.md             # This file
```

## Backend Launch

```powershell
cd C:\Users\Yann\Desktop\the-gazer\backend
uv run uvicorn main:app --reload --port 8000
```

Health check:

```powershell
curl http://127.0.0.1:8000/api/health
```

## Frontend Launch

```powershell
cd C:\Users\Yann\Desktop\the-gazer\frontend
npm install
npm run dev -- --port 3001
```

Open:

```text
http://127.0.0.1:3001/
```

## Convex Launch

```powershell
cd C:\Users\Yann\Desktop\the-gazer\frontend
npx convex dev
```

One-shot function deployment:

```powershell
npx convex dev --once
```

## Required Ammunition

Create `backend/.env` from `backend/.env.example`.

Minimum useful configuration:

```text
CONVEX_URL=
EXA_API_KEY=
GEMINI_API_KEY=
```

High-impact configuration:

```text
ANTHROPIC_API_KEY=       # stronger dossier narrative
BROWSER_USE_API_KEY=     # browser-driven Deep Research
```

Identity-search configuration:

```text
backend/identification/pimeyes_cookies.json
```

Do not commit real keys, cookies, or local env files.

## Primary API Surface

```text
GET  /api/health
GET  /api/services
POST /api/capture
POST /api/capture/frame
GET  /api/capture/{id}
GET  /api/person/{id}
GET  /api/research/{name}/stream
```

Upload example:

```powershell
curl -X POST "http://127.0.0.1:8000/api/capture?person_name=Elon%20Musk" `
  -F "file=@C:\path\to\face.jpg"
```

## Verification Protocol

Backend:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\backend
uv run python -c "from main import app; print('BACKEND_IMPORT_OK')"
uv run pytest --override-ini addopts='' tests
```

Frontend:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\frontend
npm run build
```

Expected current baseline:

```text
BACKEND_IMPORT_OK
12 backend tests passed
Next.js production build passed
```

## Current Readiness

The core chain is operational:

```text
Input media
-> face detection
-> identity candidate / manual fallback
-> Convex person record
-> Exa enrichment
-> partial or full dossier synthesis
-> live frontend board
```

The system becomes materially stronger when the following are configured:

- Fresh PimEyes cookies.
- Usable Gemini quota or Anthropic key.
- Browser Use key for optional Deep Research.
- Pre-verified demo images/videos.

## Safety Boundary

The Gazer is intended for controlled demonstrations, research workflows, and consent-aware OSINT experiments. Identity inference can be wrong. The system should preserve evidence, show uncertainty, and avoid presenting single-source matches as confirmed truth.

Operational rule:

```text
If evidence is weak, classify as candidate or manual_review_required.
Do not fake certainty.
```

## Documentation

For development handoff:

- `HANDOFF.md`

For system behavior and next-stage design:

- `SYSTEM_DESIGN.md`

For runtime architecture and API contracts:

- `ARCHITECTURE.md`

