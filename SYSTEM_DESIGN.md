# The Gazer System Design

Last updated: 2026-06-04

## Product Intent

The Gazer is a cinematic person-intelligence board. It ingests an image, video, or webcam frame, finds visible faces, tries to resolve identity, enriches the person with public web intelligence, synthesizes a dossier, and streams state into the frontend through Convex and SSE.

The system is intentionally not the original JARVIS glasses stack. It keeps the intelligence pipeline but replaces glasses/Telegram/WebRTC inputs with upload, video, and camera-frame inputs.

## Core User Flows

### 1. Image Upload

```text
Frontend upload
-> POST /api/capture
-> CaptureService queues request
-> CapturePipeline processes image
-> OpenCV detects faces
-> PimEyes/manual hint resolves identity candidate
-> Convex stores capture/person/intel/dossier state
-> Exa and optional agents enrich
-> Gemini/Anthropic synthesize dossier
-> Frontend updates from Convex and polling/SSE
```

### 2. Video Upload

```text
Frontend video upload
-> POST /api/capture
-> ffmpeg extracts frames at 1 FPS
-> Each frame is scanned for faces
-> Persons are created/enriched from detected faces
-> Capture totals show frame and face counts
```

### 3. Camera Frame

```text
Frontend getUserMedia
-> base64 frame
-> POST /api/capture/frame
-> Same detection/identity/enrichment path as image upload
```

### 4. Optional Deep Research

```text
Deep Research button
-> GET /api/research/{name}/stream?mode=deep&person_id=...
-> SSE emits init/result/complete
-> Exa/Sherlock run when available
-> Browser Use runs only when BROWSER_USE_API_KEY is configured
-> Results persist as IntelFragment records
```

## Identity Design

Current identity inputs:

- PimEyes matches from direct HTTP calls with stored cookies.
- URL/title parsing from PimEyes result pages.
- Manual `person_name` hint for controlled demos.

Current status model:

- `confirmed`: strong/manual identity or enough evidence.
- `candidate`: a plausible but not fully verified identity.
- `manual_review_required`: no reliable name; preserve review URLs instead of pretending certainty.

Target production rule:

- Never treat a single weak source as final truth.
- Require at least two independent sources or one high-trust source plus strong supporting evidence.
- Preserve evidence trail in `identity_candidates` and `identity_evidence`.

## Enrichment Design

Fast enrichment:

- Exa runs against the resolved name.
- Results become Convex `intelFragments`.
- Dossier synthesis uses available fragments.

Deep enrichment:

- Sherlock can scan usernames/platforms without paid API keys.
- Browser Use can operate LinkedIn, search engines, X/Twitter, Instagram, or other browser-only sources when configured.
- 64x and AgentMail are optional future accelerators.

Design rule:

- Each source should emit normalized IntelFragment objects instead of custom one-off payloads.

Preferred IntelFragment shape:

```text
person_id
source
agent_name
url
claim
confidence
evidence_text
verified
timestamp
```

## Dossier Design

The dossier is layered:

- Structured dossier: title, company, education, work history, social profiles, notable activity, hooks, risk flags.
- Narrative dossier: short paragraphs that explain the person in readable form.

Fallback rules:

- If synthesis fails, frontend still displays partial dossier and `synthesis pending` or sanitized error.
- Anthropic should be preferred when available.
- Gemini should remain a fallback/fast path.

## Storage Design

Active store:

- Convex is the source of truth for frontend-visible state.

Main tables:

- `captures`: capture lifecycle, source, frame/face totals, created persons.
- `persons`: person identity, status, metadata, dossier.
- `intelFragments`: normalized research/evidence snippets.
- `connections`: person-to-person relationships.
- `activityLog`: optional live system feed.

MongoDB:

- `MONGODB_URI` exists as configuration but is not currently active.
- Do not assume long-term Mongo persistence exists until implemented.

## Service Capability Model

`GET /api/health` and `GET /api/services` expose configured capabilities. The frontend should trust these endpoints instead of hardcoding "online" states.

Important degraded modes:

- No Browser Use key: Deep Research still streams a `browser_use_skipped` result.
- No Anthropic key: Gemini or partial dossier fallback is used.
- Gemini quota exhausted: sanitized message is shown instead of raw provider JSON.
- PimEyes cookies expired: identity resolution degrades to manual review or manual hint.

## Demo Operating Model

For a reliable demo, use known public figures or pre-verified public test images. If the identity is not stable, use `OPERATOR SUBJECT HINT` to demonstrate the downstream enrichment/dossier pipeline without pretending the face-search result is certain.

## Safety And Privacy Notes

The project handles identity inference. Keep evidence visible, avoid false certainty, and keep secrets/cookies out of Git. For anything beyond local demos, add explicit consent/privacy review, audit logging, retention policy, and rate limiting.
