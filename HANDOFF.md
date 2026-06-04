# The Gazer Handoff

Last updated: 2026-06-04

## Current State

The Gazer is a non-glasses adaptation of the JARVIS person-intelligence pipeline. The current project has a working backend, Convex persistence, and a Next.js intelligence-board frontend.

```text
the-gazer/
|-- backend/
|   |-- agents/             # Deep research, Sherlock, Browser Use, social/search agents
|   |-- capture/            # Upload, video frame extraction, camera frame ingestion
|   |-- db/                 # Convex gateway + in-memory fallback
|   |-- enrichment/         # Exa and optional 64x enrichment clients
|   |-- identification/     # OpenCV face detection, embeddings, PimEyes direct HTTP client
|   |-- intel/              # Intel fragment models
|   |-- synthesis/          # Gemini/Anthropic dossier synthesis and safe error handling
|   |-- tests/              # Backend regression tests
|   |-- config.py
|   |-- main.py
|   |-- pipeline.py
|   |-- pyproject.toml
|   `-- schemas.py
|-- frontend/
|   |-- convex/             # Convex schema/functions
|   |-- src/app/            # Next.js app shell
|   |-- src/components/gazer/
|   |-- package.json
|   `-- tailwind.config.js
|-- HANDOFF.md
|-- SYSTEM_DESIGN.md
|-- ARCHITECTURE.md
`-- .gitignore
```

Completed capabilities:

- Upload image files and detect faces with OpenCV Haar Cascade.
- Upload video files and extract frames through ffmpeg at 1 FPS.
- Submit base64 camera frames for live webcam-style capture.
- Queue capture requests quickly, then process detection, identity, enrichment, and synthesis in the background.
- Store capture/person/intel/dossier data in Convex.
- Use PimEyes cookies through `backend/identification/pimeyes_cookies.json` and direct `httpx` requests.
- Use optional manual subject hint (`person_name`) as a demo fallback identity.
- Run Exa enrichment when a usable name exists.
- Run Deep Research SSE in fast/deep modes, with graceful degraded output when Browser Use is not configured.
- Generate partial dossier state even when Gemini/Anthropic synthesis fails or is rate-limited.
- Frontend shows the sci-fi intelligence board, upload controls, webcam controls, source-tagged intel cards, service health/degraded states, and dossier panel.

Verified API endpoints:

- `GET /api/health`
- `GET /api/services`
- `POST /api/capture`
- `POST /api/capture/frame`
- `GET /api/capture/{id}`
- `GET /api/person/{id}`
- `GET /api/research/{name}/stream`

Recent QA status:

- Backend import passed: `uv run python -c "from main import app; print('BACKEND_IMPORT_OK')"`
- Backend tests passed: `uv run pytest --override-ini addopts='' tests` -> `12 passed`
- Frontend build passed: `npm run build`
- Smoke test passed with manual hint: upload returned queued, capture completed, one face detected, one person enriched, person name stored, synthesis error sanitized when Gemini quota was hit.

## How To Run

Backend:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\backend
uv run uvicorn main:app --reload --port 8000
```

Frontend:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\frontend
npm install
npm run dev -- --port 3001
```

Convex:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\frontend
npx convex dev
```

One-shot Convex deploy/check:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\frontend
npx convex dev --once
```

## Environment

Do not commit `.env`, `.env.local`, or PimEyes cookies. They are intentionally ignored by Git.

Backend env path:

```text
C:\Users\Yann\Desktop\the-gazer\backend\.env
```

Current backend key status:

| Key | Status | Purpose |
| --- | --- | --- |
| `CONVEX_URL` | filled | Convex backend persistence |
| `EXA_API_KEY` | filled | Fast OSINT/search enrichment |
| `GEMINI_API_KEY` | filled, but quota/rate-limit can fail synthesis | Structured/narrative dossier fallback |
| `ANTHROPIC_API_KEY` | empty | Preferred high-quality dossier synthesis |
| `BROWSER_USE_API_KEY` | empty | Browser-driven Deep Research |
| `OPENAI_API_KEY` | empty | Optional browser/social agent support |
| `SIXTYFOUR_API_KEY` | empty | Optional structured enrichment/deep search |
| `AGENTMAIL_API_KEY` | empty | Optional account/workflow support |
| `PIMEYES_EMAIL` / `PIMEYES_PASSWORD` | empty | Not used by current cookie path |
| `PIMEYES_ACCOUNT_POOL` | empty | Optional future account pool |
| `MONGODB_URI` | empty | Not used currently; Convex is the active store |

PimEyes cookie path:

```text
C:\Users\Yann\Desktop\the-gazer\backend\identification\pimeyes_cookies.json
```

Current note: PimEyes is account/cookie dependent. If the rented account expires, identity matching will degrade or fail until cookies are refreshed.

Frontend env path:

```text
C:\Users\Yann\Desktop\the-gazer\frontend\.env.local
```

Current frontend Convex values:

```text
CONVEX_DEPLOYMENT=dev:impartial-egret-747
NEXT_PUBLIC_CONVEX_URL=https://impartial-egret-747.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://impartial-egret-747.convex.site
```

## Demo Checklist

Minimum demo:

1. Start backend on port `8000`.
2. Start frontend on port `3001`.
3. Start Convex dev if schema/functions changed.
4. Confirm `GET http://127.0.0.1:8000/api/health`.
5. Upload a known-good face image through the UI.
6. Watch capture card move from queued/processing to complete.
7. Confirm intel fragments and dossier appear or partial dossier appears.

Recommended "ammunition" before recording:

- Fresh PimEyes cookies.
- Usable Gemini quota or an Anthropic key.
- Browser Use key if demonstrating Deep Research.
- Two or three pre-verified public test images.
- One short test video containing clearly visible frontal faces.

## Next Development Priorities

1. Add stronger identity confirmation: multiple independent sources must agree before `confirmed`; otherwise use `candidate` or `manual_review_required`.
2. Improve source weighting: LinkedIn, GitHub, university/company pages high trust; social profiles medium; forums/aggregators low.
3. Finish Deep Research button behavior: keep it optional, stream extra SSE fragments, and clearly show degraded mode when Browser Use is missing.
4. Improve dossier synthesis: Anthropic as preferred narrative engine, Gemini as fallback, partial dossier always visible.
5. Add frontend regression tests or Playwright smoke tests for upload, service status, and SSE rendering.
6. Prepare a stable demo dataset and document expected outputs.

## Known Risks

- Face identity can be wrong if PimEyes top results are wrong. Treat current identity as candidate unless evidence is strong.
- Gemini quota failures are currently sanitized, but final dossier quality depends on available LLM quota.
- Deep Research is intentionally degraded without `BROWSER_USE_API_KEY`.
- The app is a local demo/prototype, not a privacy-reviewed production system.
