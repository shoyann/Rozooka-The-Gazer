<p align="center">
  <img src="Rozooka-The%20Gazer.png" alt="Rozooka eye emblem on a warm paper background" width="220" />
</p>

<h1 align="center">ROZOOKA // THE GAZER</h1>

<p align="center">
  <strong>A public-source due diligence research console.</strong><br>
  Capture. Resolve. Enrich. Synthesize. Display.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-0.1.0-C79A46?style=for-the-badge" alt="Project version 0.1.0" />
  <img src="https://img.shields.io/badge/Status-Prototype-9B6BCC?style=for-the-badge" alt="Status: prototype" />
  <img src="https://img.shields.io/badge/Research-Public_Sources-56876D?style=for-the-badge" alt="Public-source research" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&amp;logo=nextdotjs&amp;logoColor=white" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&amp;logo=typescript&amp;logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Python-3.11–3.13-3776AB?style=for-the-badge&amp;logo=python&amp;logoColor=white" alt="Python 3.11 through 3.13" />
  <img src="https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&amp;logo=fastapi&amp;logoColor=white" alt="FastAPI backend" />
  <img src="https://img.shields.io/badge/Convex-Realtime-EE342F?style=for-the-badge" alt="Convex real-time persistence" />
</p>

<p align="center">
  <a href="#overview">Overview</a> ·
  <a href="#capabilities">Capabilities</a> ·
  <a href="#setup-and-api-reference">Setup</a> ·
  <a href="#verification">Verification</a> ·
  <a href="#documentation">Documentation</a>
</p>

---

## Overview

The Gazer is a public-source due diligence prototype adapted from the JARVIS pipeline. It brings media intake, research, structured dossiers, and a live operator board into one console.

The interface presents source material and research findings for review. Identity matches remain candidates unless corroborated; weak evidence must remain weak evidence.

**Project version: 0.1.0.** This matches the frontend and backend package metadata. The project is intended for controlled demonstrations and consent-aware research experiments.

## Workflow

```text
Capture → Resolve → Enrich → Synthesize → Display
```

| Stage | Purpose |
| --- | --- |
| Capture | Accept image, video, or camera input. |
| Resolve | Present identity candidates or operator-supplied context. |
| Enrich | Gather public-source research and supporting signals. |
| Synthesize | Organize findings into a structured dossier. |
| Display | Present records, sources, and service status in the live console. |

## Capabilities

| Area | Included components |
| --- | --- |
| Media intake | Image uploads, video frames, and camera frames |
| Detection and candidate handling | OpenCV detection, identity candidates, and manual review |
| Public-source research | Exa search, Sherlock, and optional Browser Use research |
| Dossier synthesis | Anthropic when configured, with Gemini fallback |
| Live console | Convex-backed records, intelligence cards, dossiers, and service indicators |
| Reduced-capability reporting | Missing-service status and partial findings when integrations are unavailable |

## Project structure

```text
Rozooka-The-Gazer/
├── backend/             # FastAPI research pipeline
├── frontend/            # Next.js console and Convex functions
├── HANDOFF.md           # Recorded project status and handoff
├── SYSTEM_DESIGN.md     # Product behavior and design
├── ARCHITECTURE.md      # Runtime architecture and API contracts
└── README.md            # Project overview and setup reference
```

## Setup and API reference

Expand the sections below for the existing local setup and API instructions. The example paths refer to the original development checkout; use the corresponding folder in your own checkout.

<details>
<summary><strong>Backend startup</strong></summary>

Open the backend directory:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\backend
```

Start the backend:

```powershell
uv run uvicorn main:app --reload --port 8000
```

Check backend health:

```powershell
curl http://127.0.0.1:8000/api/health
```

The health endpoint returns the backend status. Check `/api/services` for individual integration availability.

</details>

<details>
<summary><strong>Frontend startup</strong></summary>

Open the frontend directory:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\frontend
```

Install dependencies:

```powershell
npm install
```

Start the frontend:

```powershell
npm run dev -- --port 3001
```

Open the console:

```text
http://127.0.0.1:3001/
```

</details>

<details>
<summary><strong>Convex persistence</strong></summary>

Move into the frontend directory:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\frontend
```

Start Convex live persistence:

```powershell
npx convex dev
```

One-shot function deployment:

```powershell
npx convex dev --once
```

Convex is the live data plane.

Without Convex, the operator board loses real-time persistence.

</details>

<details>
<summary><strong>Environment configuration</strong></summary>

Create:

```text
backend/.env
```

from:

```text
backend/.env.example
```

Core service settings:

```text
CONVEX_URL=
EXA_API_KEY=
GEMINI_API_KEY=
```

Optional service settings:

```text
ANTHROPIC_API_KEY=       # optional dossier provider
BROWSER_USE_API_KEY=     # browser-driven deep research
```

Identity-search configuration:

```text
backend/identification/pimeyes_cookies.json
```

Keep credentials and private artifacts out of Git.

```text
DO NOT COMMIT:
- real API keys
- cookies
- local .env files
- operator secrets
- private research artifacts
```

</details>

<details>
<summary><strong>API reference</strong></summary>

Primary system endpoints:

```text
GET  /api/health
GET  /api/services
POST /api/capture
POST /api/capture/frame
GET  /api/capture/{id}
GET  /api/person/{id}
GET  /api/research/{name}/stream
```

Image upload example:

```powershell
curl -X POST "http://127.0.0.1:8000/api/capture?person_name=Elon%20Musk" `
  -F "file=@C:\path\to\face.jpg"
```

</details>

## Verification

Backend verification:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\backend
uv run python -c "from main import app; print('BACKEND_IMPORT_OK')"
uv run pytest --override-ini addopts='' tests
```

Frontend verification:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\frontend
npm run build
```

The [handoff record](HANDOFF.md) dated June 4, 2026 reports a successful backend import, 12 passing backend tests, and a successful frontend build. These are recorded results, not a guarantee that every external integration is currently available.

## Project status

This is a prototype with a documented end-to-end demo workflow. Its available features depend on configured services, provider quotas, and the local environment. See the [handoff record](HANDOFF.md) for the original readiness notes.

<details>
<summary><strong>Service availability and degraded behavior</strong></summary>

Unavailable integrations are reported as reduced capability.

Missing APIs should not hard-crash the system.

Unavailable modules report reduced capability.

```text
If Exa is missing:
  enrichment capability reduced

If Gemini is missing:
  fallback synthesis unavailable

If Anthropic is missing:
  Gemini handles dossier generation

If PimEyes cookies are stale:
  identity search requires manual fallback

If Browser Use is missing:
  deep research module remains offline

If Convex is unavailable:
  real-time persistence is degraded
```

</details>

## Research principles

The project is intended for controlled demonstrations, consent-aware due diligence, public-source research experiments, and analyst-interface prototyping.

- **Keep candidates distinct from confirmed findings.** Identity inference can be wrong and may require manual review.
- **Preserve source context.** Include source links, timestamps, conflicting evidence, and missing evidence wherever possible.
- **Keep uncertainty visible.** Public signals can be stale, duplicated, misleading, or fabricated.
- **Treat dossiers as research artifacts.** A generated narrative does not establish that its claims are true.

> Evidence before narrative. Sources before assumptions. Manual review before certainty.

## Documentation

| Document | What it covers |
| --- | --- |
| [Development handoff](HANDOFF.md) | Recorded project state, setup notes, and prior verification |
| [System design](SYSTEM_DESIGN.md) | Product behavior and next-stage design |
| [Architecture](ARCHITECTURE.md) | Runtime components and API contracts |
| [Backend configuration example](backend/.env.example) | Available backend environment settings |
| [Frontend configuration example](frontend/.env.local.example) | Frontend environment settings |

---

<p align="center">
  <strong>ROZOOKA // THE GAZER</strong><br>
  A research console. A structured record. A human review.
</p>
