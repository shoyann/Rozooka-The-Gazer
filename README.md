# ROZOOKA // THE GAZER

```text
██████████████████████████████████████████████████████
██████████████████████████████████████████████████████
██████████████████████████████████████████████████████
████████████████████              ████████████████████
████████████████                      ████████████████
█████████████                            █████████████
███████████           ██████████           ███████████
██████████           ████████████           ██████████
█████████           ██████████████           █████████
██████████           ████████████           ██████████
████████████          ██████████          ████████████
██████████████                          ██████████████
██████████████████                  ██████████████████
████████████████████████      ████████████████████████
██████████████████████████████████████████████████████
████████████████  ████████████████          ██████████
████████████████   ███████████████            ████████
████████████████     ████████████████           ██████
████████████████       ████████████████           ████
████████████████         ████████████████           ██
████████████████           ████████████████
████████████████             ███████████████
████████████████              ████████████████
████████████████                ████████████████
████████████████                  ████████████████
```

> PUBLIC-SOURCE DUE DILIGENCE AGENT  
> Controlled OSINT research console.  
> Capture. Resolve. Enrich. Synthesize. Display.

---

## 00 // SYSTEM DESIGNATION

```text
WEAPON:         ROZOOKA // THE GAZER
CLASS:          Local public-source due diligence agent
ROLE:           Person-level OSINT research and intelligence board
MISSION:        Capture -> Resolve -> Enrich -> Synthesize -> Display
FRONTEND:       Next.js 14 tactical console
BACKEND:        FastAPI intelligence pipeline
DATA PLANE:     Convex real-time persistence
STATUS:         Prototype / demo-ready when armed with valid keys
```

The Gazer is a public-source due diligence agent adapted from the JARVIS pipeline.

It ingests image, video, or live camera input.  
It detects visible faces.  
It attempts identity resolution.  
It enriches findings with public web intelligence.  
It synthesizes structured due diligence dossiers.  
It streams results to a live operator console.

This is not a production surveillance platform.

This is a controlled OSINT and due diligence demonstration system.

---

## 01 // MISSION PROFILE

```text
INPUT MEDIA
   ↓
FACE ACQUISITION
   ↓
IDENTITY CANDIDATE GENERATION
   ↓
PUBLIC-SOURCE ENRICHMENT
   ↓
DUE DILIGENCE DOSSIER SYNTHESIS
   ↓
REAL-TIME OPERATOR DISPLAY
```

The system is built to demonstrate a person-level public-source research workflow:

```text
See subject
-> detect face
-> generate candidate identity
-> collect public signals
-> synthesize due diligence dossier
-> display intelligence card
```

If confidence is weak, the system does not fake certainty.

Weak evidence must remain weak evidence.

---

## 02 // CAPABILITIES

### Acquisition

- Image intake  
  Upload a face image and process it through the full pipeline.

- Video intake  
  Upload a video and extract frames at 1 FPS for face detection.

- Camera intake  
  Submit base64 frames from a webcam stream.

### Detection

- Face detection  
  OpenCV Haar Cascade.

### Identity Resolution

- Identity search  
  PimEyes cookie-backed direct HTTP flow.

- Manual fallback  
  Operator-supplied person name when automated identity confidence is insufficient.

- Candidate handling  
  Identity matches are treated as candidates unless corroborated by supporting evidence.

### Enrichment

- Exa fast search.
- Sherlock local OSINT.
- Optional Browser Use deep research.
- Public-source profile and signal aggregation.
- Evidence-aware enrichment with degraded-mode reporting.

### Synthesis

- Anthropic preferred when configured.
- Gemini fallback when Anthropic is unavailable.
- Structured dossier generation.
- Confidence-aware narrative synthesis.

### Display

- Convex-backed real-time board.
- Intel cards.
- Status panels.
- Dossier display.
- Capture records.
- Person records.
- Service capability indicators.

---

## 03 // SYSTEM LAYOUT

```text
the-gazer/
|-- backend/              # FastAPI capture, identity, enrichment, synthesis pipeline
|-- frontend/             # Next.js + Tailwind tactical console
|-- HANDOFF.md            # Current project status and handoff notes
|-- SYSTEM_DESIGN.md      # Product/system design
|-- ARCHITECTURE.md       # Runtime architecture and API contracts
`-- README.md             # Operator manual
```

---

## 04 // BACKEND ARMING SEQUENCE

Move into the backend chamber:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\backend
```

Start the intelligence pipeline:

```powershell
uv run uvicorn main:app --reload --port 8000
```

Confirm the system is alive:

```powershell
curl http://127.0.0.1:8000/api/health
```

Expected heartbeat:

```text
Backend online.
Services reporting.
Pipeline ready.
```

---

## 05 // FRONTEND ARMING SEQUENCE

Move into the frontend console:

```powershell
cd C:\Users\Yann\Desktop\the-gazer\frontend
```

Install payload dependencies:

```powershell
npm install
```

Start the tactical board:

```powershell
npm run dev -- --port 3001
```

Open the operator console:

```text
http://127.0.0.1:3001/
```

---

## 06 // CONVEX DATA PLANE

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

---

## 07 // AMMUNITION

Create:

```text
backend/.env
```

from:

```text
backend/.env.example
```

Minimum useful loadout:

```text
CONVEX_URL=
EXA_API_KEY=
GEMINI_API_KEY=
```

High-impact loadout:

```text
ANTHROPIC_API_KEY=       # stronger dossier narrative
BROWSER_USE_API_KEY=     # browser-driven deep research
```

Identity-search loadout:

```text
backend/identification/pimeyes_cookies.json
```

Never commit live ammunition.

```text
DO NOT COMMIT:
- real API keys
- cookies
- local .env files
- operator secrets
- private research artifacts
```

---

## 08 // API FIRE CONTROL

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

Image upload strike:

```powershell
curl -X POST "http://127.0.0.1:8000/api/capture?person_name=Elon%20Musk" `
  -F "file=@C:\path\to\face.jpg"
```

---

## 09 // VERIFICATION PROTOCOL

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

Current expected baseline:

```text
BACKEND_IMPORT_OK
12 backend tests passed
Next.js production build passed
```

If these checks pass, the system is assembled.

---

## 10 // CURRENT READINESS

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

System strength increases when armed with:

- Fresh PimEyes cookies.
- Usable Gemini quota or Anthropic key.
- Browser Use key for optional deep research.
- Pre-verified demo images and videos.
- Known consent-based demonstration subjects.
- Clean operator test cases.

---

## 11 // DEGRADED MODE

The Gazer is built to degrade, not detonate.

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

---

## 12 // RULES OF ENGAGEMENT

The Gazer is intended for:

- Controlled demonstrations.
- Consent-aware due diligence workflows.
- Public-source research experiments.
- Intelligence UI prototyping.
- Evidence-handling demonstrations.
- Internal analyst workflow design.

The system must not present weak signals as confirmed truth.

Identity inference can be wrong.

Public signals can be stale, misleading, duplicated, or fabricated.

Operational law:

```text
If evidence is weak:
  classify as candidate

If identity is uncertain:
  mark manual_review_required

If confidence is not earned:
  do not display certainty

If only one source exists:
  preserve uncertainty

If the system does not know:
  say it does not know
```

Do not fake confirmation.

Do not overwrite doubt.

Do not turn candidates into confirmed identities.

---

## 13 // EVIDENCE DOCTRINE

The Gazer should preserve source context wherever possible.

A dossier is not truth.

A dossier is a structured research artifact.

```text
Evidence > narrative
Sources > assumptions
Corroboration > confidence
Uncertainty > false certainty
Manual review > automated overreach
```

Every generated profile should make room for:

- Source links.
- Confidence level.
- Conflicting evidence.
- Missing evidence.
- Manual review status.
- Timestamped findings.

---

## 14 // DOCUMENTATION

Development handoff:

```text
HANDOFF.md
```

System behavior and next-stage design:

```text
SYSTEM_DESIGN.md
```

Runtime architecture and API contracts:

```text
ARCHITECTURE.md
```

---

## 15 // OPERATOR SUMMARY

```text
ROZOOKA // THE GAZER
is a local public-source due diligence agent.

It sees.
It resolves.
It searches.
It enriches.
It synthesizes.
It displays.

But it does not decide truth.

The operator does.
```
