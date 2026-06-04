"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Activity,
  Camera,
  Cpu,
  Eye,
  Film,
  GitFork,
  Globe,
  Link as LinkIcon,
  Network,
  RefreshCw,
  Server,
  ShieldAlert,
  Terminal as TerminalIcon,
  Upload,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { BOOT_LOGS, EMPTY_TARGET, FRONTEND_DEMO_TARGET } from "./data";
import type {
  AgentResultEvent,
  CaptureResponse,
  DossierPayload,
  IdentityCandidateRecord,
  IdentityEvidenceRecord,
  IdentityStatus,
  IntelligenceCard,
  PersonRecord,
  ResearchCompleteEvent,
  ResearchInitEvent,
  TargetDossier,
} from "./types";
import CinematicLoader from "./CinematicLoader";
import CinematicIntelCard from "./CinematicIntelCard";
import DeepResearchBoard from "./DeepResearchBoard";
import TypewriterText from "./TypewriterText";
import VectorRadar from "./VectorRadar";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_GAZER_API_URL ?? "http://127.0.0.1:8000";

declare global {
  interface Window {
    __GAZER_TEST__?: {
      setSubjectHint: (value: string) => void;
      uploadDataUrl: (
        dataUrl: string,
        fileName: string,
        hint?: string,
      ) => Promise<void>;
    };
  }
}

const BLOCKED_NAME = "████████";
const DEFAULT_STATUS_BANNER = "Upload a file or enable camera ingestion.";
const FRONTEND_DEMO_SEARCH_SCRIPT = [
  "BIOMETRIC HASH EXTRACTED",
  "NEURAL PATHWAY ESTABLISHED",
  "BYPASSING PERIMETER SECURITY RATIO",
  "INFILTRATING SOCIAL GRAPH MATRIX",
  "DECRYPTING SUBJECT IDENTITY INDEX",
  "RESOLVING THREAT CLASSIFICATION SPECTRUM",
];

type FrontendDemoPhase = "search" | "main" | "deep";

interface FrontendDemoState {
  logs: string[];
  phase: FrontendDemoPhase;
  progress: number;
  status: string;
  target: TargetDossier;
}

const DOSSIER_SCAN_STEPS = [
  {
    scale: 1.0,
    x: "0%",
    y: "0%",
    lockX: "50%",
    lockY: "50%",
    label: "STATIC PORTRAIT CALIBRATION",
    gridAlign: "STABLE_RESTING_RAW",
    duration: 540,
  },
  {
    scale: 1.08,
    x: "0%",
    y: "0%",
    lockX: "34%",
    lockY: "31%",
    label: "OPTIC_GLS // PASSIVE SEARCH",
    gridAlign: "LOC_X: 31 // LOC_Y: 29",
    duration: 720,
  },
  {
    scale: 3.2,
    x: "13%",
    y: "16%",
    lockX: "34%",
    lockY: "31%",
    label: "OPTIC_GLS // MICRO-ETCH",
    gridAlign: "LOC_X: 31 // LOC_Y: 29",
    duration: 1100,
  },
  {
    scale: 1.02,
    x: "0%",
    y: "0%",
    lockX: "34%",
    lockY: "31%",
    label: "FIELD RESET // PARALLAX ZEROING",
    gridAlign: "MAG: 1.00X // RESETTING",
    duration: 580,
  },
  {
    scale: 1.08,
    x: "0%",
    y: "0%",
    lockX: "52%",
    lockY: "58%",
    label: "MANDIBLE // EDGE TRACE",
    gridAlign: "LOC_X: 52 // LOC_Y: 58",
    duration: 720,
  },
  {
    scale: 3.62,
    x: "-1%",
    y: "-24%",
    lockX: "52%",
    lockY: "58%",
    label: "MANDIBLE // MICRO-ETCH",
    gridAlign: "LOC_X: 52 // LOC_Y: 58",
    duration: 1020,
  },
  {
    scale: 1.03,
    x: "0%",
    y: "0%",
    lockX: "52%",
    lockY: "58%",
    label: "FIELD RESET // PARALLAX ZEROING",
    gridAlign: "MAG: 1.00X // RESETTING",
    duration: 560,
  },
  {
    scale: 1.1,
    x: "0%",
    y: "0%",
    lockX: "66%",
    lockY: "38%",
    label: "TEMPORAL LATTICE // ENTRY",
    gridAlign: "LOC_X: 66 // LOC_Y: 38",
    duration: 680,
  },
  {
    scale: 3.44,
    x: "-18%",
    y: "9%",
    lockX: "66%",
    lockY: "38%",
    label: "TEMPORAL LATTICE // MICRO-ETCH",
    gridAlign: "LOC_X: 66 // LOC_Y: 38",
    duration: 1040,
  },
  {
    scale: 1.0,
    x: "0%",
    y: "0%",
    lockX: "66%",
    lockY: "38%",
    label: "FIELD RESET // PARALLAX ZEROING",
    gridAlign: "MAG: 1.00X // RESETTING",
    duration: 540,
  },
];

const DOSSIER_IDLE_LOCK = {
  left: "50%",
  top: "50%",
  size: 72,
};

const IDENTITY_PREVIEW_FIXTURES: Record<
  IdentityStatus,
  {
    candidates: IdentityCandidateRecord[];
    evidence: IdentityEvidenceRecord[];
    statusLine: string;
  }
> = {
  confirmed: {
    statusLine: "IDENTITY CONFIRMED // CROSS-SOURCE CONSENSUS",
    candidates: [],
    evidence: [
      {
        candidate_name: "PRIMARY MATCH",
        normalized_name: "primary match",
        source_type: "portrait_match",
        source_engine: "pimeyes",
        title: "Portrait trace resolved across independent registries",
        similarity: 0.964,
        weight: 0.92,
        strong: true,
      },
      {
        candidate_name: "PRIMARY MATCH",
        normalized_name: "primary match",
        source_type: "professional_registry",
        source_engine: "exa",
        title: "Employment and publication traces align with subject",
        similarity: 0.928,
        weight: 0.85,
        strong: true,
      },
    ],
  },
  candidate: {
    statusLine: "CANDIDATE STACK // OPERATOR COMPARISON ADVISED",
    candidates: [
      {
        name: "Dr. Ana Stelline",
        normalized_name: "dr ana stelline",
        score: 0.954,
        independent_sources: 4,
        evidence_count: 7,
        source_types: ["pimeyes_url_slug", "linkedin", "employment_registry"],
        urls: ["https://example.com/ana"],
      },
      {
        name: "Ana Steline",
        normalized_name: "ana steline",
        score: 0.811,
        independent_sources: 2,
        evidence_count: 4,
        source_types: ["social", "web"],
        urls: ["https://example.com/alt-ana"],
      },
      {
        name: "A. Stelline",
        normalized_name: "a stelline",
        score: 0.744,
        independent_sources: 1,
        evidence_count: 2,
        source_types: ["web"],
        urls: ["https://example.com/stelline"],
      },
    ],
    evidence: [
      {
        candidate_name: "Dr. Ana Stelline",
        normalized_name: "dr ana stelline",
        source_type: "portrait_match",
        source_engine: "pimeyes",
        title: "Strong facial similarity but incomplete corroboration",
        similarity: 0.954,
        weight: 0.81,
        strong: true,
      },
    ],
  },
  manual_review_required: {
    statusLine: "MANUAL REVIEW REQUIRED // CONFLICTING SIGNAL GRAPH",
    candidates: [],
    evidence: [
      {
        candidate_name: "UNRESOLVED",
        normalized_name: "unresolved",
        source_type: "review_url",
        source_engine: "pimeyes",
        title: "Visual matches require operator validation",
        similarity: 0.677,
        weight: 0.7,
        strong: false,
      },
      {
        candidate_name: "UNRESOLVED",
        normalized_name: "unresolved",
        source_type: "source_conflict",
        source_engine: "exa",
        title: "Cross-source identity graph diverges beyond confidence threshold",
        similarity: 0.612,
        weight: 0.76,
        strong: false,
      },
    ],
  },
};

function toHexSignature(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return `0x${hash.toString(16).toUpperCase().padStart(8, "0")}`;
}

function formatStatus(value?: string | null) {
  if (!value) {
    return "PENDING ENRICHMENT";
  }
  return value.replaceAll("_", " ").toUpperCase();
}

function formatDossierStatus(
  value?: string | null,
  synthesisStatus?: "pending" | "partial" | "complete",
) {
  if (synthesisStatus === "partial") {
    return "DOSSIER PARTIAL // STRUCTURED LIVE";
  }
  if (synthesisStatus === "pending" || value === "synthesizing") {
    return "SYNTHESIS PENDING // PARTIAL DOSSIER";
  }
  return formatStatus(value);
}

function condenseProviderError(value?: string | null) {
  const text = value?.trim();
  if (!text) {
    return "";
  }

  const lower = text.toLowerCase();
  if (
    (lower.includes("gemini") || lower.includes("generativelanguage")) &&
    (lower.includes("quota") ||
      lower.includes("resource_exhausted") ||
      lower.includes("429"))
  ) {
    return "Gemini quota exhausted; fallback dossier generated.";
  }
  if (
    lower.includes("anthropic") &&
    (lower.includes("quota") ||
      lower.includes("rate limit") ||
      lower.includes("429"))
  ) {
    return "Anthropic quota exhausted; fallback dossier generated.";
  }
  if (
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate limit")
  ) {
    return "Provider quota exhausted; fallback dossier generated.";
  }
  if ((text.startsWith("{") || text.startsWith("[")) && text.length > 160) {
    return "Provider error received; fallback dossier generated.";
  }
  if (text.length > 220) {
    return `${text.slice(0, 180).trim()}...`;
  }
  return text;
}

function serviceConfigured(
  state: ApiSystemState,
  serviceName: string,
) {
  const service = state.services.find((entry) => entry.name === serviceName);
  if (service) {
    return service.configured;
  }
  return Boolean(state.health?.services?.[serviceName]);
}

function getDeepResearchCapability(state: ApiSystemState): DeepResearchCapability {
  if (state.status === "checking") {
    return "Checking";
  }
  if (state.status === "offline") {
    return "Unavailable";
  }

  const browserUse = serviceConfigured(state, "browser_use");
  const sherlock = serviceConfigured(state, "sherlock");
  const exa = serviceConfigured(state, "exa");

  if (browserUse) {
    return "Full";
  }
  if (exa && sherlock) {
    return "Exa+Sherlock";
  }
  if (sherlock) {
    return "Sherlock-only";
  }
  if (exa) {
    return "Exa-only";
  }
  return "Unavailable";
}

function getApiSystemLabel(status: ApiConnectionStatus) {
  switch (status) {
    case "online":
      return "ONLINE";
    case "degraded":
      return "DEGRADED";
    case "offline":
      return "OFFLINE";
    default:
      return "CHECKING";
  }
}

function getApiStatusTextClass(status: ApiConnectionStatus) {
  switch (status) {
    case "online":
      return "text-emerald-400";
    case "degraded":
      return "text-[#C8860A]";
    case "offline":
      return "text-red-400";
    default:
      return "text-gray-500";
  }
}

function getDeepResearchTextClass(capability: DeepResearchCapability) {
  switch (capability) {
    case "Full":
      return "text-emerald-400";
    case "Exa+Sherlock":
    case "Sherlock-only":
    case "Exa-only":
      return "text-[#C8860A]";
    case "Checking":
      return "text-gray-500";
    default:
      return "text-red-400";
  }
}

function formatSerial(value: string) {
  return `TG-${value.replace(/^person_/, "").replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase()}`;
}

function derivePersonName(value: string) {
  const stem = value.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return stem || "UNKNOWN SUBJECT";
}

type SourceLabel =
  | "LINKEDIN"
  | "TWITTER"
  | "GITHUB"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "WEB";

type ResearchMode = "fast" | "deep";
type ApiConnectionStatus = "checking" | "online" | "degraded" | "offline";
type DeepResearchCapability =
  | "Checking"
  | "Full"
  | "Sherlock-only"
  | "Exa+Sherlock"
  | "Exa-only"
  | "Unavailable";

interface HealthPayload {
  status?: string;
  environment?: string;
  services?: Record<string, boolean>;
}

interface ServiceStatusPayload {
  name: string;
  configured: boolean;
  notes?: string | null;
}

interface ApiSystemState {
  status: ApiConnectionStatus;
  latencyMs: number | null;
  health: HealthPayload | null;
  services: ServiceStatusPayload[];
  error: string | null;
}

const SOURCE_DOMAIN_MAP: Array<{ domain: string; label: SourceLabel }> = [
  { domain: "linkedin.com", label: "LINKEDIN" },
  { domain: "twitter.com", label: "TWITTER" },
  { domain: "x.com", label: "TWITTER" },
  { domain: "github.com", label: "GITHUB" },
  { domain: "instagram.com", label: "INSTAGRAM" },
  { domain: "facebook.com", label: "FACEBOOK" },
];

function getHostname(value: string) {
  const candidate = value.trim();
  if (!candidate) {
    return null;
  }

  try {
    const normalized = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    return new URL(normalized).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function toSourceLabel({
  urls,
  source,
  agentName,
}: {
  urls?: string[];
  source?: string | null;
  agentName?: string | null;
}): SourceLabel {
  for (const url of urls ?? []) {
    const hostname = getHostname(url);
    if (!hostname) {
      continue;
    }

    const matched = SOURCE_DOMAIN_MAP.find(
      ({ domain }) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
    if (matched) {
      return matched.label;
    }
  }

  const fallback = [source, agentName].filter(Boolean).join(" ").toLowerCase();
  if (fallback.includes("linkedin.com") || fallback.includes("linkedin")) {
    return "LINKEDIN";
  }
  if (
    fallback.includes("twitter.com") ||
    fallback.includes("x.com") ||
    /(^|[^a-z])twitter([^a-z]|$)/.test(fallback) ||
    /(^|[^a-z])x([^a-z]|$)/.test(fallback)
  ) {
    return "TWITTER";
  }
  if (fallback.includes("github.com") || fallback.includes("github")) {
    return "GITHUB";
  }
  if (fallback.includes("instagram.com") || fallback.includes("instagram")) {
    return "INSTAGRAM";
  }
  if (fallback.includes("facebook.com") || fallback.includes("facebook")) {
    return "FACEBOOK";
  }
  return "WEB";
}

function buildIntelCards(
  personId: string,
  result: AgentResultEvent,
): IntelligenceCard[] {
  const snippets =
    result.snippets?.length > 0
      ? result.snippets
      : [result.error || "Research pipeline returned no snippets."];
  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");

  return snippets.map((snippet, index) => ({
    id: `${personId}-${result.agent_name}-${Date.now()}-${index}`,
    source: toSourceLabel({
      urls: result.urls_found,
      source: result.source,
      agentName: result.agent_name,
    }),
    timestamp,
    confidence: result.confidence ?? 0.5,
    content: condenseProviderError(snippet),
    classification:
      result.status === "failed"
        ? "SIGNAL DROP"
        : result.agent_name.replaceAll("_", " ").toUpperCase(),
  }));
}

function formatWorkHistory(dossier?: DossierPayload, person?: PersonRecord) {
  const structured = dossier?.structured;
  if (structured?.workHistory?.length) {
    return structured.workHistory.map((entry) =>
      [entry.role, entry.company, entry.period].filter(Boolean).join(" // "),
    );
  }

  const fallback = [
    [person?.occupation, person?.organization].filter(Boolean).join(" // "),
    person?.summary,
  ].filter(Boolean) as string[];

  return fallback.length ? fallback : ["Awaiting work-history enrichment."];
}

function formatEducation(dossier?: DossierPayload) {
  const structured = dossier?.structured;
  if (structured?.education?.length) {
    return structured.education.map((entry) =>
      [entry.degree, entry.school].filter(Boolean).join(" // "),
    );
  }

  return ["No academic credentials returned yet."];
}

function formatSocialProfiles(dossier?: DossierPayload, person?: PersonRecord) {
  const structured = dossier?.structured;
  const socialLines = Object.entries(structured?.socialProfiles ?? {}).map(
    ([platform, url]) => `${platform.toUpperCase()}: ${url}`,
  );

  if (structured?.notableActivity?.length) {
    socialLines.push(
      ...structured.notableActivity.map((activity) => `ACTIVITY: ${activity}`),
    );
  }

  if (person?.organization) {
    socialLines.unshift(`ORG: ${person.organization}`);
  }

  return socialLines.length ? socialLines : ["No linked signatures resolved."];
}

function formatConversationHooks(dossier?: DossierPayload) {
  const structured = dossier?.structured;
  const hooks = [...(structured?.conversationHooks ?? [])];

  if (structured?.riskFlags?.length) {
    hooks.push(...structured.riskFlags.map((flag) => `RISK FLAG // ${flag}`));
  }

  return hooks.length ? hooks : ["No interrogation hooks synthesized yet."];
}

function formatNarrativeSummary(dossier?: DossierPayload, person?: PersonRecord) {
  const summary = dossier?.narrative?.summary || person?.summary || "";
  if (summary.trim()) {
    return condenseProviderError(summary);
  }

  const synthesisError = condenseProviderError(dossier?.synthesisError);
  if (synthesisError) {
    return synthesisError;
  }

  if (dossier?.synthesisStatus === "pending") {
    return "Narrative dossier pending. Structured signals will continue to populate while synthesis retries or degrades.";
  }

  if (dossier?.synthesisStatus === "partial") {
    return "Narrative dossier incomplete. Showing structured and partial evidence instead of an empty card.";
  }

  return "No narrative dossier synthesized yet.";
}

function getIdentityTone(status?: IdentityStatus | null) {
  switch (status) {
    case "confirmed":
      return {
        accent: "text-emerald-300",
        badge: "border-emerald-700/40 bg-emerald-950/25 text-emerald-200",
        border: "border-emerald-800/40",
        chip: "border-emerald-800/35 bg-emerald-950/20 text-emerald-200",
        overlay:
          "bg-[radial-gradient(circle_at_50%_22%,rgba(110,231,183,0.24),transparent_42%),linear-gradient(180deg,rgba(6,78,59,0.12),rgba(6,78,59,0.02))]",
        panel: "border-emerald-800/35 bg-emerald-950/12 text-emerald-50",
        progress: "bg-emerald-400",
      };
    case "candidate":
      return {
        accent: "text-slate-200",
        badge: "border-slate-500/35 bg-slate-950/40 text-slate-200",
        border: "border-slate-700/40",
        chip: "border-slate-600/35 bg-slate-950/30 text-slate-200",
        overlay:
          "bg-[radial-gradient(circle_at_50%_22%,rgba(148,163,184,0.2),transparent_42%),linear-gradient(180deg,rgba(51,65,85,0.18),rgba(15,23,42,0.04))]",
        panel: "border-slate-700/35 bg-slate-950/22 text-slate-100",
        progress: "bg-slate-300",
      };
    case "manual_review_required":
      return {
        accent: "text-orange-300",
        badge: "border-orange-800/45 bg-[#3a180f]/50 text-orange-200",
        border: "border-orange-900/45",
        chip: "border-orange-800/40 bg-[#2b120c]/55 text-orange-200",
        overlay:
          "bg-[radial-gradient(circle_at_50%_22%,rgba(251,146,60,0.18),transparent_42%),linear-gradient(180deg,rgba(127,29,29,0.12),rgba(69,10,10,0.02))]",
        panel: "border-orange-900/35 bg-[#1f0f0b]/45 text-orange-50",
        progress: "bg-orange-400",
      };
    default:
      return {
        accent: "text-[#C8860A]",
        badge: "border-[rgba(200,134,10,0.22)] bg-black/45 text-[#C8860A]",
        border: "border-[rgba(245,240,232,0.12)]",
        chip: "border-[rgba(200,134,10,0.18)] bg-black/45 text-[#C8860A]",
        overlay: "",
        panel: "border-[rgba(245,240,232,0.12)] bg-black/25 text-[#F5F0E8]",
        progress: "bg-[#C8860A]",
      };
  }
}

function formatIdentityStatusLabel(status?: IdentityStatus | null) {
  if (!status) {
    return "IDENTITY LINK UNRESOLVED";
  }

  return status.replaceAll("_", " ").toUpperCase();
}

function buildTargetFromPerson(
  person: PersonRecord,
  existing: TargetDossier | undefined,
  fallbackPhotoUrl: string,
  fallbackName: string,
): TargetDossier {
  const personId = person.person_id || person._id || fallbackName;
  const name = (person.name || fallbackName || "UNKNOWN SUBJECT").toUpperCase();
  const confidence = Math.max(0, Math.min(person.confidence ?? existing?.confidence ?? 0.78, 1));

  return {
    id: personId,
    name,
    serialNumber: existing?.serialNumber ?? formatSerial(personId),
    confidence,
    status: formatDossierStatus(person.status, person.dossier?.synthesisStatus),
    identityStatus: person.identity_status ?? existing?.identityStatus ?? null,
    identityCandidates: person.identity_candidates ?? existing?.identityCandidates ?? [],
    identityEvidence: person.identity_evidence ?? existing?.identityEvidence ?? [],
    synthesisStatus: person.dossier?.synthesisStatus ?? existing?.synthesisStatus ?? "pending",
    photoUrl: existing?.photoUrl || person.photoUrl || fallbackPhotoUrl,
    narrativeSummary: formatNarrativeSummary(person.dossier, person),
    workHistory: formatWorkHistory(person.dossier, person),
    education: formatEducation(person.dossier),
    socialProfiles: formatSocialProfiles(person.dossier, person),
    conversationHooks: formatConversationHooks(person.dossier),
    intelList: existing?.intelList ?? [],
    hexSignature: existing?.hexSignature ?? toHexSignature(personId),
    sectorOrigin:
      existing?.sectorOrigin ||
      person.organization?.toUpperCase() ||
      (person.capture_id ? `CAPTURE // ${person.capture_id}` : "LOCAL REGISTER SOURCE"),
  };
}

function createFallbackTarget(
  personId: string,
  name: string,
  photoUrl: string,
  status: string,
): TargetDossier {
  return {
    id: personId,
    name: name.toUpperCase(),
    serialNumber: formatSerial(personId),
    confidence: 0.72,
    status,
    identityStatus: null,
    identityCandidates: [],
    identityEvidence: [],
    synthesisStatus: "pending",
    photoUrl,
    narrativeSummary:
      "Narrative dossier pending. Frontend is holding the partial subject card until structured synthesis lands.",
    workHistory: ["Awaiting backend dossier payload."],
    education: ["Awaiting backend dossier payload."],
    socialProfiles: ["STREAM: waiting for research results"],
    conversationHooks: ["Operator may supply a better subject hint if name resolution fails."],
    intelList: [],
    hexSignature: toHexSignature(personId),
    sectorOrigin: "LOCAL REGISTER SOURCE",
  };
}

function createUploadPreviewTarget(
  fileName: string,
  previewUrl: string,
  hintValue?: string,
): TargetDossier {
  const inferredName = derivePersonName(hintValue || fileName).toUpperCase();
  const previewId = `preview_${Date.now().toString(16)}`;

  return {
    id: previewId,
    name: inferredName,
    serialNumber: formatSerial(previewId),
    confidence: 0.72,
    status: "USER FEED DECODED // PENDING ANALYSIS",
    identityStatus: null,
    identityCandidates: [],
    identityEvidence: [],
    synthesisStatus: "pending",
    photoUrl: previewUrl,
    narrativeSummary:
      "Preview target staged from local upload. Narrative dossier will be replaced once a real person record is resolved.",
    workHistory: [
      `LOCAL PAYLOAD: ${fileName.toUpperCase()}`,
      "SPRING-LOCKED INTO DOSSIER PREVIEW BUFFER",
    ],
    education: [
      "Awaiting backend dossier payload.",
    ],
    socialProfiles: [
      "SOURCE: LOCAL OPERATOR UPLOAD",
      `FILENAME: ${fileName}`,
    ],
    conversationHooks: [
      "Operator preview target is staged while the backend resolves the real subject.",
    ],
    intelList: [],
    hexSignature: toHexSignature(previewId),
    sectorOrigin: "LOCAL REGISTER SOURCE",
  };
}

export default function GazerDashboard() {
  const [targets, setTargets] = useState<TargetDossier[]>([EMPTY_TARGET]);
  const [selectedTargetId, setSelectedTargetId] = useState(EMPTY_TARGET.id);
  const [scanState, setScanState] = useState<"IDLE" | "SCANNING" | "COMPLETED" | "ERROR">("IDLE");
  const [scanProgress, setScanProgress] = useState(0);
  const [displayConfidence, setDisplayConfidence] = useState(0);
  const [scrambledName, setScrambledName] = useState(BLOCKED_NAME);
  const [terminalLogs, setTerminalLogs] = useState<string[]>(BOOT_LOGS);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("00:00:00");
  const [currentDate, setCurrentDate] = useState("ROZOOKA.SYS");
  const [subjectHint, setSubjectHint] = useState("");
  const [statusBanner, setStatusBanner] = useState(DEFAULT_STATUS_BANNER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [dossierNegativeFlash, setDossierNegativeFlash] = useState(false);
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const [frontendDemo, setFrontendDemo] = useState<FrontendDemoState | null>(null);
  const [identityPreviewStatus, setIdentityPreviewStatus] = useState<IdentityStatus | null>(null);
  const [apiSystem, setApiSystem] = useState<ApiSystemState>({
    status: "checking",
    latencyMs: null,
    health: null,
    services: [],
    error: null,
  });

  const targetsRef = useRef<TargetDossier[]>(targets);
  const currentSelectedTarget =
    targets.find((target) => target.id === selectedTargetId) ?? targets[0] ?? EMPTY_TARGET;
  const frontendDemoTimersRef = useRef<number[]>([]);
  const selectedTarget = frontendDemo?.target ?? currentSelectedTarget;
  const visibleTargets = frontendDemo
    ? [frontendDemo.target, ...targets.filter((target) => target.id !== frontendDemo.target.id)]
    : targets;
  const visibleSelectedTargetId = frontendDemo?.target.id ?? selectedTargetId;
  const visibleScanState = frontendDemo
    ? frontendDemo.phase === "search"
      ? "SCANNING"
      : "COMPLETED"
    : scanState;
  const visibleScanProgress = frontendDemo?.progress ?? scanProgress;
  const visibleDisplayConfidence = frontendDemo
    ? Number(
        (
          frontendDemo.phase === "search"
            ? frontendDemo.target.confidence * Math.min(frontendDemo.progress, 0.92)
            : frontendDemo.target.confidence
        ).toFixed(3),
      )
    : displayConfidence;
  const visibleTerminalLogs = frontendDemo?.logs ?? terminalLogs;
  const visibleStatusBanner = frontendDemo
    ? frontendDemo.status
    : statusBanner;
  const visibleIsDeepResearch = frontendDemo?.phase === "deep" || isDeepResearch;
  const visibleCameraActive = frontendDemo ? false : isCameraActive;
  const visibleUploadedVideoUrl = frontendDemo ? null : uploadedVideoUrl;
  const visibleScrambledName =
    frontendDemo?.phase === "search" ? BLOCKED_NAME : scrambledName;
  const showCinematicLoader =
    visibleScanState === "SCANNING" &&
    (frontendDemo?.phase === "search" || isSubmitting || selectedTarget.intelList.length === 0);
  const loaderStatus = isSubmitting
    ? "CAPTURE PAYLOAD INGESTION"
    : "STREAMING DOSSIER ENRICHMENT";
  const loaderTargetName =
    selectedTarget.id === EMPTY_TARGET.id
      ? derivePersonName(subjectHint || "unknown subject").toUpperCase()
      : selectedTarget.name;
  const dossierScanStep =
    visibleScanState === "SCANNING" ? DOSSIER_SCAN_STEPS[zoomIndex] : DOSSIER_SCAN_STEPS[0];
  const dossierLockPosition =
    visibleScanState === "SCANNING"
      ? { left: dossierScanStep.lockX, top: dossierScanStep.lockY }
      : { left: DOSSIER_IDLE_LOCK.left, top: DOSSIER_IDLE_LOCK.top };
  const dossierLockSize =
    visibleScanState === "SCANNING"
      ? 72
      : DOSSIER_IDLE_LOCK.size;
  const identityFixture = identityPreviewStatus
    ? IDENTITY_PREVIEW_FIXTURES[identityPreviewStatus]
    : null;
  const displayedIdentityStatus = identityPreviewStatus ?? selectedTarget.identityStatus ?? null;
  const displayedIdentityCandidates = identityFixture?.candidates ?? selectedTarget.identityCandidates;
  const displayedIdentityEvidence = identityFixture?.evidence ?? selectedTarget.identityEvidence;
  const identityTone = getIdentityTone(displayedIdentityStatus);
  const shouldShowIdentityPanel =
    Boolean(identityPreviewStatus) || selectedTarget.id !== EMPTY_TARGET.id;
  const apiSystemLabel = getApiSystemLabel(apiSystem.status);
  const apiStatusTextClass = getApiStatusTextClass(apiSystem.status);
  const deepResearchCapability = getDeepResearchCapability(apiSystem);
  const deepResearchTextClass = getDeepResearchTextClass(deepResearchCapability);
  const latencyLabel =
    apiSystem.latencyMs === null
      ? apiSystem.status === "offline"
        ? "OFFLINE"
        : "CHECKING"
      : `${apiSystem.latencyMs.toFixed(0)}ms`;
  const loaderLogs = visibleTerminalLogs.slice(-8);
  const progressTimerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const terminalContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const pollingIntervalsRef = useRef<Record<string, number>>({});
  const capturePollingIntervalsRef = useRef<Record<string, number>>({});
  const capturePersonIdsRef = useRef<Record<string, string[]>>({});
  const eventSourcesRef = useRef<Record<string, EventSource>>({});
  const researchModesRef = useRef<Record<string, ResearchMode>>({});
  const cameraInFlightRef = useRef(false);

  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-GB", { hour12: false }));
      setCurrentDate(
        `ROZOOKA.${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`,
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshApiSystem = async () => {
      const startedAt = performance.now();

      try {
        const healthResponse = await fetch(`${API_BASE_URL}/api/health`, {
          cache: "no-store",
        });
        const latencyMs = performance.now() - startedAt;

        if (!healthResponse.ok) {
          throw new Error(`GET /api/health returned ${healthResponse.status}`);
        }

        const health = (await healthResponse.json()) as HealthPayload;
        let services: ServiceStatusPayload[] = [];
        let servicesReachable = true;

        try {
          const servicesResponse = await fetch(`${API_BASE_URL}/api/services`, {
            cache: "no-store",
          });
          if (!servicesResponse.ok) {
            servicesReachable = false;
          } else {
            services = (await servicesResponse.json()) as ServiceStatusPayload[];
          }
        } catch {
          servicesReachable = false;
        }

        if (cancelled) {
          return;
        }

        setApiSystem({
          status: health.status === "ok" && servicesReachable ? "online" : "degraded",
          latencyMs,
          health,
          services,
          error: servicesReachable ? null : "GET /api/services unavailable",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setApiSystem({
          status: "offline",
          latencyMs: null,
          health: null,
          services: [],
          error:
            error instanceof Error
              ? condenseProviderError(error.message)
              : "Backend health check failed.",
        });
      }
    };

    void refreshApiSystem();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [visibleTerminalLogs]);

  useEffect(() => {
    setZoomIndex(0);
    setDossierNegativeFlash(false);
    setIdentityPreviewStatus(null);
  }, [selectedTarget.id]);

  useEffect(() => {
    if (visibleScanState !== "SCANNING") {
      setZoomIndex(0);
      setDossierNegativeFlash(false);
      return;
    }

    const preset = DOSSIER_SCAN_STEPS[zoomIndex];
    const timer = window.setTimeout(() => {
      setZoomIndex((current) => (current + 1) % DOSSIER_SCAN_STEPS.length);
      if (Math.random() < 0.16) {
        setDossierNegativeFlash(true);
        window.setTimeout(() => setDossierNegativeFlash(false), 160);
      } else {
        setDossierNegativeFlash(false);
      }
    }, preset.duration);

    return () => window.clearTimeout(timer);
  }, [visibleScanState, zoomIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (frontendDemo) {
        if (event.key === "Escape") {
          stopFrontendDemo();
        }
        return;
      }

      if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        if (isDeepResearch) {
          setIsDeepResearch(false);
          addTerminalLog("DEEP RESEARCH INTERFACE OFFLINE // RETURNING TO PRIMARY CONSOLE");
        } else {
          void triggerDeepResearch();
        }
      } else if (event.key === "Escape" && isDeepResearch) {
        setIsDeepResearch(false);
        addTerminalLog("ESCAPE KEY // DEEP RESEARCH BRIEFING DISMISSED");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [frontendDemo, isDeepResearch, selectedTargetId]);

  useEffect(() => {
    if (!isCameraActive) {
      return;
    }

    const interval = window.setInterval(() => {
      void submitCameraFrame();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [isCameraActive, subjectHint]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      Object.values(eventSourcesRef.current).forEach((source) => source.close());
      Object.values(pollingIntervalsRef.current).forEach((interval) => {
        window.clearInterval(interval);
      });
      Object.values(capturePollingIntervalsRef.current).forEach((interval) => {
        window.clearInterval(interval);
      });

      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }

      frontendDemoTimersRef.current.forEach((timer) => {
        window.clearTimeout(timer);
      });
    };
  }, []);

  const addTerminalLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
    setTerminalLogs((current) => [...current, `[${timestamp}] ${message}`]);
  };

  const applyIdentityPreview = (status: IdentityStatus | null) => {
    setIdentityPreviewStatus(status);
    addTerminalLog(
      status
        ? `IDENTITY PREVIEW // ${status.replaceAll("_", " ").toUpperCase()}`
        : "IDENTITY PREVIEW // RETURNING TO LIVE BACKEND STATUS",
    );
  };

  const confirmTopCandidateLocally = () => {
    const topCandidate = displayedIdentityCandidates[0];
    if (!topCandidate || selectedTarget.id === EMPTY_TARGET.id) {
      return;
    }

    const nextTarget: TargetDossier = {
      ...selectedTarget,
      name: topCandidate.name.toUpperCase(),
      identityStatus: "confirmed",
      identityCandidates: [],
      identityEvidence:
        displayedIdentityEvidence.length > 0
          ? displayedIdentityEvidence
          : IDENTITY_PREVIEW_FIXTURES.confirmed.evidence,
    };

    storeTarget(nextTarget, true);
    setIdentityPreviewStatus(null);
    addTerminalLog(`IDENTITY PROMOTED // ${topCandidate.name.toUpperCase()} // LOCAL CONFIRM`);
  };

  const clearFrontendDemoTimers = () => {
    frontendDemoTimersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
    });
    frontendDemoTimersRef.current = [];
  };

  const stopFrontendDemo = () => {
    clearFrontendDemoTimers();
    setFrontendDemo(null);
  };

  const startFrontendDemo = () => {
    clearFrontendDemoTimers();
    setIsDeepResearch(false);

    const target = FRONTEND_DEMO_TARGET;
    const initialLogs = [
      "[22:59:39] FRONTEND TEST // ALIGNING ULTIMATE GAZER VISUAL FLOW",
      "[22:59:40] QUICK SEARCH // INTAKE STAGED IN CLIENT-SIDE DEMO MODE",
    ];

    setFrontendDemo({
      logs: initialLogs,
      phase: "search",
      progress: 0.08,
      status: "QUICK SEARCH // COMPILING TARGET COGNITION MATRIX",
      target,
    });

    FRONTEND_DEMO_SEARCH_SCRIPT.forEach((entry, index) => {
      const timer = window.setTimeout(() => {
        const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
        setFrontendDemo((current) => {
          if (!current || current.phase !== "search") {
            return current;
          }

          return {
            ...current,
            logs: [...current.logs, `[${timestamp}] ${entry}`],
            progress: Math.min(0.18 + (index + 1) * 0.14, 0.94),
            status:
              index >= FRONTEND_DEMO_SEARCH_SCRIPT.length - 2
                ? "QUICK SEARCH // FINALIZING PRIMARY MATCH VECTOR"
                : "QUICK SEARCH // SYSTEM DIAGNOSTICS RECORD ACTIVE",
          };
        });
      }, index * 900);
      frontendDemoTimersRef.current.push(timer);
    });

    const mainTimer = window.setTimeout(() => {
      setFrontendDemo((current) =>
        current
          ? {
              ...current,
              phase: "main",
              progress: 1,
              status: "DEMO FLOW // PRIMARY CONSOLE WITH ACTIVE DOSSIER",
            }
          : current,
      );
    }, 5600);

    const deepTimer = window.setTimeout(() => {
      setFrontendDemo((current) =>
        current
          ? {
              ...current,
              phase: "deep",
              progress: 1,
              status: "DEMO FLOW // DEEP RESEARCH BRIEFING ACTIVE",
            }
          : current,
      );
    }, 8600);

    frontendDemoTimersRef.current.push(mainTimer, deepTimer);
  };

  const storeTarget = (nextTarget: TargetDossier, select = false) => {
    setTargets((current) => {
      const base =
        nextTarget.id === EMPTY_TARGET.id
          ? current
          : current.filter((target) => target.id !== EMPTY_TARGET.id);
      const index = base.findIndex((target) => target.id === nextTarget.id);
      if (index === -1) {
        return [nextTarget, ...base];
      }

      const updated = [...base];
      updated[index] = nextTarget;
      return updated;
    });

    if (select) {
      setSelectedTargetId(nextTarget.id);
    }
  };

  const patchTarget = (
    personId: string,
    updater: (target: TargetDossier) => TargetDossier,
  ) => {
    setTargets((current) =>
      current.map((target) => (target.id === personId ? updater(target) : target)),
    );
  };

  const beginScan = (subjectName: string) => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
    }

    setScanState("SCANNING");
    setScanProgress(0.02);
    setDisplayConfidence(0);
    setScrambledName(BLOCKED_NAME);

    progressTimerRef.current = window.setInterval(() => {
      setScanProgress((current) => {
        if (current >= 0.9) {
          return current;
        }
        return Number(Math.min(current + 0.08, 0.9).toFixed(2));
      });
      setDisplayConfidence((current) =>
        Number(Math.min(current + 0.09, 0.92).toFixed(3)),
      );
      setScrambledName(
        Array.from({ length: Math.max(subjectName.length, 8) }, () =>
          "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 36)],
        ).join(""),
      );
    }, 350);
  };

  const completeScan = (targetName: string, confidence: number) => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    setScanState("COMPLETED");
    setScanProgress(1);
    setDisplayConfidence(Number(Math.min(confidence || 0.91, 0.999).toFixed(3)));
    setScrambledName(targetName.toUpperCase());
  };

  const failScan = (message: string) => {
    const safeMessage = condenseProviderError(message);
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    setScanState("ERROR");
    setStatusBanner(safeMessage);
    addTerminalLog(`ERROR // ${safeMessage}`);
  };

  const fetchPerson = async (personId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/person/${personId}`);
    if (!response.ok) {
      throw new Error(`GET /api/person/${personId} returned ${response.status}`);
    }
    return (await response.json()) as PersonRecord;
  };

  const fetchCapture = async (captureId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/capture/${captureId}`);
    if (!response.ok) {
      throw new Error(`GET /api/capture/${captureId} returned ${response.status}`);
    }
    return (await response.json()) as CaptureResponse;
  };

  const appendIntelCards = (personId: string, cards: IntelligenceCard[]) => {
    patchTarget(personId, (target) => ({
      ...target,
      intelList: [...target.intelList, ...cards],
    }));
  };

  const syncPersonTarget = (
    personId: string,
    person: PersonRecord,
    fallbackPhotoUrl: string,
    fallbackName: string,
    select = false,
  ) => {
    const existing = targetsRef.current.find((target) => target.id === personId);
    const nextTarget = buildTargetFromPerson(
      person,
      existing,
      fallbackPhotoUrl,
      fallbackName,
    );
    storeTarget(nextTarget, select);
  };

  const startPersonPolling = (
    personId: string,
    fallbackPhotoUrl: string,
    fallbackName: string,
  ) => {
    const existingInterval = pollingIntervalsRef.current[personId];
    if (existingInterval) {
      window.clearInterval(existingInterval);
    }

    pollingIntervalsRef.current[personId] = window.setInterval(async () => {
      try {
        const person = await fetchPerson(personId);
        syncPersonTarget(personId, person, fallbackPhotoUrl, fallbackName);
        if (person.status === "complete") {
          const interval = pollingIntervalsRef.current[personId];
          if (interval) {
            window.clearInterval(interval);
            delete pollingIntervalsRef.current[personId];
          }
        }
      } catch (error) {
        console.error(error);
      }
    }, 5000);
  };

  const startCapturePolling = (
    captureId: string,
    fallbackName: string,
    fallbackPhotoUrl: string,
  ) => {
    const existingInterval = capturePollingIntervalsRef.current[captureId];
    if (existingInterval) {
      window.clearInterval(existingInterval);
    }

    const poll = async () => {
      try {
        const capture = await fetchCapture(captureId);
        const seen = new Set(capturePersonIdsRef.current[captureId] ?? []);
        const nextPersonIds = capture.persons_created.filter(
          (personId) => typeof personId === "string" && personId.length > 0,
        );

        for (const personId of nextPersonIds) {
          if (seen.has(personId)) {
            continue;
          }
          seen.add(personId);
          await ingestPersons([personId], fallbackName, fallbackPhotoUrl);
        }
        capturePersonIdsRef.current[captureId] = Array.from(seen);

        if (capture.status === "failed" || capture.status === "error") {
          const interval = capturePollingIntervalsRef.current[captureId];
          if (interval) {
            window.clearInterval(interval);
            delete capturePollingIntervalsRef.current[captureId];
          }
          failScan(capture.error || `Capture ${captureId} failed.`);
          return;
        }

        if (capture.status === "complete" || capture.status === "processed") {
          const interval = capturePollingIntervalsRef.current[captureId];
          if (interval) {
            window.clearInterval(interval);
            delete capturePollingIntervalsRef.current[captureId];
          }
          if (!nextPersonIds.length) {
            completeScan(fallbackName, 0.45);
            setStatusBanner("Capture completed, but no faces were detected.");
          } else {
            setStatusBanner(
              `CAPTURE COMPLETE // ${capture.persons_created.length} PERSON(S) // ENRICHED ${capture.persons_enriched}`,
            );
          }
          return;
        }

        setStatusBanner(
          `CAPTURE ${capture.status.toUpperCase()} // FACES ${capture.faces_detected} // PERSONS ${capture.persons_created.length}`,
        );
      } catch (error) {
        console.error(error);
      }
    };

    capturePollingIntervalsRef.current[captureId] = window.setInterval(() => {
      void poll();
    }, 1500);
    void poll();
  };

  const startResearchStream = (
    personId: string,
    personName: string,
    fallbackPhotoUrl: string,
    mode: ResearchMode = "fast",
  ) => {
    const existingSource = eventSourcesRef.current[personId];
    if (existingSource) {
      existingSource.close();
    }

    beginScan(personName);
    researchModesRef.current[personId] = mode;
    setStatusBanner(
      `${mode === "deep" ? "DEEP RESEARCH" : "STREAMING RESEARCH"} FOR ${personName.toUpperCase()}`,
    );
    const researchParams = new URLSearchParams({ person_id: personId, mode });
    if (fallbackPhotoUrl) {
      researchParams.set("image_url", fallbackPhotoUrl);
    }
    const researchUrl = `${API_BASE_URL}/api/research/${encodeURIComponent(personName)}/stream?${researchParams.toString()}`;
    addTerminalLog(`SSE OPEN // MODE ${mode.toUpperCase()} // ${researchUrl}`);

    const eventSource = new EventSource(researchUrl);
    eventSourcesRef.current[personId] = eventSource;

    eventSource.addEventListener("init", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as ResearchInitEvent;
      addTerminalLog(
        `STREAM INIT // MODE ${(payload.mode || mode).toUpperCase()} // PERSON ${payload.person_id || personId} // NAME ${(payload.person_name || personName).toUpperCase()}`,
      );
    });

    eventSource.addEventListener("result", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as AgentResultEvent;
      const cards = buildIntelCards(personId, payload);
      appendIntelCards(personId, cards);
      setStatusBanner(
        `${mode === "deep" ? "DEEP" : "FAST"} INTEL // ${payload.agent_name.replaceAll("_", " ").toUpperCase()}`,
      );
      addTerminalLog(
        `INTEL RESULT // MODE ${mode.toUpperCase()} // ${payload.agent_name.toUpperCase()} // ${cards.length} CARD(S)`,
      );
    });

    eventSource.addEventListener("dossier", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as DossierPayload;
      const existing = targetsRef.current.find((target) => target.id === personId);
      syncPersonTarget(
        personId,
        {
          person_id: personId,
          name: existing?.name || personName,
          confidence: existing?.confidence ?? 0.92,
          status: "complete",
          organization: payload.structured?.company,
          occupation: payload.structured?.title,
          dossier: payload,
        },
        fallbackPhotoUrl,
        personName,
      );
      addTerminalLog(
        `DOSSIER UPDATE // ${personName.toUpperCase()} // ${(payload.synthesisStatus || "pending").toUpperCase()}`,
      );
    });

    eventSource.addEventListener("complete", (event) => {
      const payload = JSON.parse(
        (event as MessageEvent<string>).data,
      ) as ResearchCompleteEvent;
      const currentTarget = targetsRef.current.find((target) => target.id === personId);
      completeScan(currentTarget?.name || personName, currentTarget?.confidence ?? 0.94);
      setStatusBanner(
        `${(payload.mode || mode).toUpperCase()} COMPLETE // SOURCES ${payload.total_sources ?? 0} // URLS ${payload.total_urls ?? 0}`,
      );
      addTerminalLog(
        `STREAM COMPLETE // MODE ${(payload.mode || mode).toUpperCase()} // PERSON ${payload.person_id || personId} // SOURCES ${payload.total_sources ?? 0}`,
      );
      eventSource.close();
      delete eventSourcesRef.current[personId];
      delete researchModesRef.current[personId];
    });

    eventSource.onerror = () => {
      appendIntelCards(personId, [
        {
          id: `${personId}-stream-error-${Date.now()}`,
          source: "SYSTEM",
          timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
          confidence: 0.35,
          content: `Research stream closed unexpectedly for ${personName}. Check backend SSE availability.`,
          classification: "SIGNAL DROP",
        },
      ]);
      failScan(`Research stream interrupted for ${personName}.`);
      eventSource.close();
      delete eventSourcesRef.current[personId];
      delete researchModesRef.current[personId];
    };
  };

  const triggerDeepResearch = async () => {
    if (frontendDemo) {
      setFrontendDemo((current) =>
        current ? { ...current, phase: "deep", status: "DEMO FLOW // DEEP RESEARCH BRIEFING ACTIVE" } : current,
      );
      return;
    }

    const target =
      targetsRef.current.find((entry) => entry.id === selectedTargetId) ??
      targetsRef.current[0] ??
      EMPTY_TARGET;
    const isRealTarget =
      target.id !== EMPTY_TARGET.id && !target.id.startsWith("preview_");

    setIsDeepResearch(true);

    if (!isRealTarget) {
      addTerminalLog("DEEP RESEARCH ARMED // WAITING FOR A LOCKED PERSON RECORD");
      setStatusBanner("Deep research armed. Awaiting a resolved target.");
      return;
    }

    let resolvedName = target.name;
    try {
      const person = await fetchPerson(target.id);
      resolvedName = person.name || resolvedName;
      syncPersonTarget(target.id, person, target.photoUrl, resolvedName);
    } catch (error) {
      console.error(error);
    }

    addTerminalLog(`DEEP RESEARCH START // ${resolvedName.toUpperCase()}`);
    startResearchStream(target.id, resolvedName, target.photoUrl, "deep");
  };

  const ingestPersons = async (
    personIds: string[],
    fallbackName: string,
    fallbackPhotoUrl: string,
  ) => {
    for (const personId of personIds) {
      try {
        const person = await fetchPerson(personId);
        const resolvedName = person.name || fallbackName || personId;
        syncPersonTarget(personId, person, fallbackPhotoUrl, resolvedName, true);
        startPersonPolling(personId, fallbackPhotoUrl, resolvedName);
        startResearchStream(personId, resolvedName, fallbackPhotoUrl, "fast");
      } catch (error) {
        console.error(error);
        const fallbackTarget = createFallbackTarget(
          personId,
          fallbackName || personId,
          fallbackPhotoUrl,
          "DETECTED // FETCH PENDING",
        );
        storeTarget(fallbackTarget, true);
        startPersonPolling(personId, fallbackPhotoUrl, fallbackName || personId);
        startResearchStream(
          personId,
          fallbackName || personId,
          fallbackPhotoUrl,
          "fast",
        );
      }
    }
  };

  const submitUpload = async (
    file: File,
    previewUrl: string,
    subjectNameOverride?: string,
  ) => {
    const hintValue = subjectNameOverride?.trim() || subjectHint.trim();
    const fallbackName = derivePersonName(hintValue || file.name);
    const formData = new FormData();
    formData.append("file", file);

    if (hintValue) {
      formData.append("person_name", hintValue);
    }

    setIsSubmitting(true);
    setStatusBanner(`Submitting ${file.name} to /api/capture`);
    addTerminalLog(`UPLOAD START // ${file.name.toUpperCase()} // ${(file.size / 1024).toFixed(1)} KB`);
    beginScan(fallbackName);

    try {
      const response = await fetch(`${API_BASE_URL}/api/capture`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`POST /api/capture returned ${response.status}`);
      }

      const payload = (await response.json()) as CaptureResponse;
      addTerminalLog(
        `UPLOAD ACCEPTED // CAPTURE ${payload.capture_id} // STATUS ${payload.status.toUpperCase()}`,
      );
      setStatusBanner(`Capture queued // ${payload.capture_id}`);
      startCapturePolling(payload.capture_id, fallbackName, previewUrl);
    } catch (error) {
      console.error(error);
      failScan(error instanceof Error ? error.message : "Capture request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitCameraFrame = async () => {
    if (cameraInFlightRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      return;
    }

    cameraInFlightRef.current = true;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      cameraInFlightRef.current = false;
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = canvas.toDataURL("image/jpeg", 0.9);
    const fallbackName = derivePersonName(subjectHint || `camera_subject_${Date.now()}`);

    beginScan(fallbackName);
    setStatusBanner("Submitting live camera frame to /api/capture/frame");
    addTerminalLog("CAMERA FRAME // dispatching base64 frame to backend");

    try {
      const response = await fetch(`${API_BASE_URL}/api/capture/frame`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          frame,
          source: "camera",
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`POST /api/capture/frame returned ${response.status}`);
      }

      const payload = (await response.json()) as CaptureResponse;
      addTerminalLog(
        `CAMERA FRAME ACCEPTED // CAPTURE ${payload.capture_id} // STATUS ${payload.status.toUpperCase()}`,
      );
      setStatusBanner(`Camera frame queued // ${payload.capture_id}`);
      startCapturePolling(payload.capture_id, fallbackName, frame);
    } catch (error) {
      console.error(error);
      failScan(error instanceof Error ? error.message : "Camera frame submission failed.");
    } finally {
      cameraInFlightRef.current = false;
    }
  };

  const startCamera = async () => {
    setCameraError(null);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          aspectRatio: 16 / 9,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsCameraActive(true);
      setUploadedVideoUrl(null);
      addTerminalLog("OPTICAL SENSOR ACQUIRED // WEBCAM STREAM ROUTING SUCCESSFUL");
    } catch (error) {
      console.error(error);
      setCameraError("PHYSICAL SENSOR OFFLINE. CHECK CAMERA PERMISSIONS.");
      setIsCameraActive(false);
      addTerminalLog("WARNING // WEBCAM UNREACHABLE. FALLING BACK TO RADAR VIEW.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    addTerminalLog("OPTICAL SENSOR DETACHED // STREAM TERMINATED");
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const previewTarget = createUploadPreviewTarget(
      file.name,
      previewUrl,
      subjectHint,
    );
    setUploadedVideoUrl(null);
    storeTarget(previewTarget, true);
    await submitUpload(file, previewUrl, subjectHint);
    event.target.value = "";
  };

  const handleVideoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (isCameraActive) {
      stopCamera();
    }

    const previewUrl = URL.createObjectURL(file);
    setUploadedVideoUrl(previewUrl);
    await submitUpload(file, previewUrl, subjectHint);
    event.target.value = "";
  };

  useEffect(() => {
    window.__GAZER_TEST__ = {
      setSubjectHint: (value: string) => {
        setSubjectHint(value);
      },
      uploadDataUrl: async (dataUrl: string, fileName: string, hint?: string) => {
        if (hint) {
          setSubjectHint(hint);
        }

        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, {
          type: blob.type || "image/jpeg",
        });
        const previewTarget = createUploadPreviewTarget(fileName, dataUrl, hint);
        storeTarget(previewTarget, true);
        await submitUpload(file, dataUrl, hint);
      },
    };

    return () => {
      delete window.__GAZER_TEST__;
    };
  }, [submitUpload]);

  return (
    <div className="relative min-h-screen select-none overflow-x-hidden bg-[#0A0906] p-4 font-mono text-[#F5F0E8] selection:bg-[#C8860A] selection:text-black lg:p-6">
      <div className="ambient-glow-alpha" />
      <div className="ambient-glow-beta" />
      <div className="grain-overlay" />
      <div className="scan-screen-hum pointer-events-none absolute inset-0 z-0" />
      <div className="tech-grid" />
      <div className="tech-subgrid" />

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col gap-5">
        <header className="flex flex-col items-start justify-between gap-4 border-b border-[rgba(245,240,232,0.12)] pb-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <div className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[1px] border border-[#C8860A]/40 bg-[#C8860A]/5">
              <Eye className="h-5 w-5 animate-pulse text-[#C8860A] crt-glow-amber" />
              <span className="absolute left-0 top-0 h-1.5 w-1.5 border-l border-t border-[#C8860A]/60" />
              <span className="absolute bottom-0 right-0 h-1.5 w-1.5 border-b border-r border-[#C8860A]/60" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h1 className="crt-glow text-sm font-black uppercase leading-none tracking-[0.25em] text-[#F5F0E8]">
                  ROZOOKA // THE GAZER
                </h1>
                <span className="rounded-[1px] border border-[#8B6914]/40 bg-black/40 px-1.5 py-0.5 text-[8px] font-bold tracking-widest text-[#C8860A]">
                  ACTIVE COREG_V4
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-gray-500">
                <span>SYSTEM: NEURAL GAZER</span>
                <span className="hidden md:inline">/</span>
                <span className="crt-glow-amber font-semibold text-[#C8860A]">
                  ALIGNMENT: SENSOR_STABLE
                </span>
                <span className="hidden md:inline">/</span>
                <span>CORE_PORT: 3001</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch overflow-x-auto pb-1 md:self-auto md:pb-0">
            <span className="mr-2 shrink-0 text-[10px] uppercase tracking-wide text-gray-400">
              CHANNEL:
            </span>
            {visibleTargets.map((target) => {
              const active = visibleSelectedTargetId === target.id;
              return (
                <button
                  key={target.id}
                  onClick={() => {
                    if (!frontendDemo) {
                      setSelectedTargetId(target.id);
                    }
                  }}
                  className={`cursor-pointer border px-3 py-1 text-[11px] tracking-wider transition-all ${
                    active
                      ? "crt-glow-amber border-[#C8860A] bg-[#C8860A]/10 text-[#C8860A]"
                      : "border-[rgba(245,240,232,0.12)] text-gray-400 hover:border-gray-500 hover:text-[#F5F0E8]"
                  }`}
                  style={{ borderRadius: "2px" }}
                >
                  {target.serialNumber}
                </button>
              );
            })}

            <button
              id="header-btn-deep-research"
              onClick={() => {
                if (visibleIsDeepResearch && !frontendDemo) {
                  setIsDeepResearch(false);
                  addTerminalLog("USER TOGGLED RESEARCH MODE: OFF");
                  return;
                }
                addTerminalLog("USER TOGGLED RESEARCH MODE: ACTIVE");
                void triggerDeepResearch();
              }}
              className={`ml-4 flex cursor-pointer items-center gap-2 rounded-[1px] border px-3 py-1 text-[11.5px] font-black tracking-widest transition-all ${
                visibleIsDeepResearch
                  ? "crt-glow-success border-emerald-500 bg-emerald-950/25 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                  : "crt-glow-amber border-[#C8860A]/60 bg-[#C8860A]/5 text-[#C8860A] hover:border-[#C8860A] hover:bg-[#C8860A]/15"
              }`}
            >
              <Network className={`h-3.5 w-3.5 ${visibleIsDeepResearch ? "animate-spin" : ""}`} />
              <span>DEEP RESEARCH</span>
              <kbd className="rounded border border-[rgba(245,240,232,0.2)] bg-black/65 px-1 py-[1px] text-[8px] font-normal text-gray-400">
                E
              </kbd>
            </button>

            <button
              onClick={() => {
                if (frontendDemo) {
                  stopFrontendDemo();
                } else {
                  startFrontendDemo();
                }
              }}
              className={`ml-2 flex cursor-pointer items-center gap-2 rounded-[1px] border px-3 py-1 text-[11px] font-bold tracking-widest transition-all ${
                frontendDemo
                  ? "border-rose-500/55 bg-rose-950/20 text-rose-300 hover:bg-rose-950/35"
                  : "border-sky-500/35 bg-sky-950/10 text-sky-300 hover:border-sky-400 hover:bg-sky-950/20"
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              <span>{frontendDemo ? "END DEMO" : "FRONTEND TEST"}</span>
            </button>
          </div>

          <div className="shrink-0 text-right font-mono text-[10px] tracking-widest text-[#C8860A]">
            <div>CHRONO: {currentDate}</div>
            <div className="crt-glow-amber mt-0.5 font-semibold">
              LOCAL_UTC: {currentTime}
            </div>
          </div>
        </header>

        <main className="grid min-h-[75vh] grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
          <section className="relative flex flex-col gap-4 overflow-hidden border border-[rgba(245,240,232,0.12)] bg-black/30 p-4 lg:col-span-4">
            <div className="hud-corner-bone tl" />
            <div className="hud-corner-bone tr" />
            <div className="hud-corner-bone bl" />
            <div className="hud-corner-bone br" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(245,240,232,0.02),transparent_18%,transparent_74%,rgba(200,134,10,0.05))]" />

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#F5F0E8]">
                <Camera className="h-3 w-3 text-[#C8860A]" />
                Ingestion Viewfinder
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#C8860A]">
                <span className="glow-amber h-1.5 w-1.5 animate-pulse rounded-full bg-[#C8860A]" />
                {visibleCameraActive ? "STATION LIVE" : "SYNTH CARRIER"}
              </span>
            </div>

            <div className="relative aspect-video w-full overflow-hidden border border-[rgba(245,240,232,0.15)] bg-black shadow-[0_0_20px_rgba(0,0,0,0.35)]">
              <div className="hud-corner tl" />
              <div className="hud-corner tr" />
              <div className="hud-corner bl" />
              <div className="hud-corner br" />
              <div className="radar-vignette pointer-events-none absolute inset-0 z-[11]" />

              <div className="absolute left-2 top-2 z-20 bg-black/60 px-1 py-0.5 text-[9px] font-semibold tracking-wider text-[#C8860A]">
                OPTICAL SENSOR ACTIVE
              </div>
              <div className="absolute right-2 top-2 z-20 bg-black/60 px-1 py-0.5 text-[9px] text-gray-400">
                RES 1280x720
              </div>
              <div className="absolute bottom-2 left-2 z-20 bg-black/60 px-1 py-0.5 font-mono text-[9px] tracking-tighter text-gray-500">
                FPS: 0.33Hz // REF: {selectedTarget.hexSignature}
              </div>
              <div className="absolute bottom-2 right-2 z-20 max-w-[140px] truncate bg-black/60 px-1 py-0.5 text-[9px] text-gray-400">
                DEC_M: {visibleScanState}
              </div>

              <div className="pointer-events-none absolute inset-x-8 inset-y-6 z-[15] flex items-center justify-center border border-dashed border-[#C8860A]/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dotted border-[#C8860A]/20">
                  <div className="h-2 w-2 rounded-full bg-[#8B2A2A]/40" />
                </div>
              </div>
              <div className="pointer-events-none absolute left-3 top-1/2 z-[16] -translate-y-1/2 bg-black/60 px-1 py-0.5 text-[8px] tracking-[0.18em] text-[#C8860A]">
                RADAR VECTOR
              </div>
              <div className="pointer-events-none absolute bottom-3 right-3 z-[16] bg-black/60 px-1 py-0.5 text-[8px] tracking-[0.18em] text-[#F5F0E8]/55">
                SWEEP {Math.round(scanProgress * 100)}%
              </div>

              <div className="scanline-active" />
              <div className="pointer-events-none absolute inset-0 z-10 bg-black/10 mix-blend-overlay" />

              {visibleCameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full scale-x-[-1] object-cover"
                  style={{ mixBlendMode: "luminosity" }}
                />
              ) : visibleUploadedVideoUrl ? (
                <video
                  src={visibleUploadedVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                  style={{ mixBlendMode: "luminosity" }}
                />
              ) : (
                <VectorRadar isScanning={visibleScanState === "SCANNING"} scanProgress={visibleScanProgress} />
              )}
            </div>

            {cameraError && (
              <div className="flex items-start gap-1.5 border border-red-900/40 bg-red-950/20 px-2 py-1.5 text-[10px] text-red-400">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                <span>{cameraError}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  if (frontendDemo) {
                    return;
                  }
                  if (visibleCameraActive) {
                    void submitCameraFrame();
                  } else {
                    void startCamera();
                  }
                }}
                disabled={Boolean(frontendDemo)}
                className="glitch-flicker relative col-span-3 cursor-pointer border border-[#F5F0E8] py-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-[#F5F0E8] transition-all hover:border-[#C8860A] hover:bg-[#C8860A]/5 hover:text-[#C8860A]"
                style={{ borderRadius: "2px" }}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Camera className="h-3.5 w-3.5" />
                  {visibleCameraActive ? "Capture Live Frame" : "Arm Webcam Feed"}
                </div>
              </button>

              <button
                onClick={() => {
                  if (!frontendDemo) {
                    fileInputRef.current?.click();
                  }
                }}
                disabled={Boolean(frontendDemo)}
                className="flex cursor-pointer flex-col items-center justify-center gap-1 border border-[rgba(245,240,232,0.3)] py-2 text-[10px] tracking-wider text-gray-300 transition-all hover:border-[#C8860A] hover:bg-[#C8860A]/5 hover:text-[#C8860A] disabled:cursor-not-allowed disabled:opacity-45"
                style={{ borderRadius: "2px" }}
              >
                <Upload className="h-3.5 w-3.5" />
                <span className="text-[8px] uppercase tracking-wide">Upload Image</span>
              </button>

              <button
                onClick={() => {
                  if (!frontendDemo) {
                    videoFileInputRef.current?.click();
                  }
                }}
                disabled={Boolean(frontendDemo)}
                className="flex cursor-pointer flex-col items-center justify-center gap-1 border border-[rgba(245,240,232,0.3)] py-2 text-[10px] tracking-wider text-gray-300 transition-all hover:border-[#C8860A] hover:bg-[#C8860A]/5 hover:text-[#C8860A] disabled:cursor-not-allowed disabled:opacity-45"
                style={{ borderRadius: "2px" }}
              >
                <Film className="h-3.5 w-3.5" />
                <span className="text-[8px] uppercase tracking-wide">Upload Video</span>
              </button>

              <button
                onClick={() => {
                  if (!frontendDemo) {
                    void (visibleCameraActive ? stopCamera() : startCamera());
                  }
                }}
                disabled={Boolean(frontendDemo)}
                className={`flex cursor-pointer flex-col items-center justify-center gap-1 border py-2 text-[10px] tracking-wider transition-all ${
                  visibleCameraActive
                    ? "border-[#8B2A2A] text-red-400 hover:bg-red-950/20"
                    : "border-[rgba(245,240,232,0.3)] text-gray-300 hover:border-[#C8860A] hover:bg-[#C8860A]/5 hover:text-[#C8860A]"
                } disabled:cursor-not-allowed disabled:opacity-45`}
                style={{ borderRadius: "2px" }}
              >
                {visibleCameraActive ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-[8px] uppercase tracking-wide">De-link Cam</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-3.5 w-3.5" />
                    <span className="text-[8px] uppercase tracking-wide">Feed Webcam</span>
                  </>
                )}
              </button>
            </div>

            <div className="border-t border-[rgba(245,240,232,0.12)] pt-3">
              <label className="mb-1.5 block text-[9px] font-semibold uppercase tracking-widest text-gray-400">
                Operator Subject Hint
              </label>
              <input
                value={subjectHint}
                onChange={(event) => setSubjectHint(event.target.value)}
                placeholder="Optional person name for upload / stream"
                disabled={Boolean(frontendDemo)}
                className="w-full border border-[rgba(245,240,232,0.2)] bg-black/50 px-3 py-2 text-[11px] tracking-wide text-[#F5F0E8] outline-none placeholder:text-gray-600 focus:border-[#C8860A] disabled:cursor-not-allowed disabled:opacity-45"
              />
              <p className="mt-2 text-[9px] leading-relaxed text-gray-500">
                This value is sent as <code>person_name</code> during upload when present.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <input
              ref={videoFileInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoChange}
              className="hidden"
            />
            <canvas ref={canvasRef} className="hidden" />

            <div className="mt-2 flex flex-1 flex-col gap-2 overflow-hidden border-t border-[rgba(245,240,232,0.12)] pt-3">
              <div className="flex items-center justify-between text-[9px] font-semibold uppercase text-gray-400">
                <span className="flex items-center gap-1.5">
                  <TerminalIcon className="h-3 w-3 text-[#C8860A]" />
                  Telemetry Log Carrier
                </span>
                <span>{isSubmitting ? "INGEST: ACTIVE" : "BYTES_INGEST: OK"}</span>
              </div>

              <div className="overflow-hidden border border-[rgba(245,240,232,0.08)] bg-black/35 px-2 py-1 text-[8px] uppercase tracking-[0.24em] text-[#C8860A]/72">
                <div className="animate-marquee">
                  {`${visibleStatusBanner} // ${selectedTarget.serialNumber} // ${visibleScanState} // LIVE FEED // `}
                  {`${visibleStatusBanner} // ${selectedTarget.serialNumber} // ${visibleScanState} // LIVE FEED // `}
                </div>
              </div>

              <div
                ref={terminalContainerRef}
                className="scrollbar-thin terminal-mask min-h-[110px] max-h-[160px] flex-1 space-y-1.5 overflow-y-auto border border-black/80 bg-black/45 p-2.5 font-mono text-[9px] text-[#F5F0E8]/70"
              >
                {visibleTerminalLogs.map((log, index) => (
                  <div
                    key={`${log}-${index}`}
                    className={`whitespace-pre-wrap border-b border-white/[0.03] pb-1 leading-relaxed selection:bg-[#C8860A] ${
                      index === visibleTerminalLogs.length - 1
                        ? "text-[#C8860A]"
                        : index >= visibleTerminalLogs.length - 3
                          ? "text-[#F5F0E8]/82"
                          : "text-[#F5F0E8]/55"
                    }`}
                  >
                    {log.startsWith("[") ? (
                      <>
                        <span className="font-semibold text-[#C8860A]/85">
                          {log.slice(0, 10)}
                        </span>
                        <span>{log.slice(10)}</span>
                      </>
                    ) : (
                      log
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative flex flex-col gap-4 overflow-hidden border border-[rgba(245,240,232,0.12)] bg-black/30 p-4 lg:col-span-5">
            <div className="hud-corner-bone tl" />
            <div className="hud-corner-bone tr" />
            <div className="hud-corner-bone bl" />
            <div className="hud-corner-bone br" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(245,240,232,0.02),transparent_16%,transparent_82%,rgba(200,134,10,0.04))]" />

            <div className="flex items-center justify-between gap-3 overflow-x-auto border-b border-[rgba(245,240,232,0.1)] pb-2">
              <div className="flex shrink-0 items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="glow-amber h-1.5 w-1.5 animate-pulse rounded-full bg-[#C8860A]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#C8860A]">
                    Neural Net
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C8860A]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                    SSE Linked
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C8860A]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                    Person Polling
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${visibleIsDeepResearch ? "bg-emerald-400" : "bg-gray-600"}`} />
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${deepResearchTextClass}`}>
                    Deep Recon: {deepResearchCapability}
                  </span>
                </div>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-gray-500">
                COGNIZANCE: {visibleDisplayConfidence.toFixed(3)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 text-[9px] font-bold uppercase tracking-wider text-gray-500">
              <span>MAPPED DATASTREAM CORRELATION</span>
              <span className="max-w-[52%] truncate text-right">{visibleStatusBanner}</span>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="border border-[rgba(245,240,232,0.08)] bg-black/35 p-2">
                <div className="mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-[#C8860A]">
                  <Server className="h-3.5 w-3.5" />
                  Capture Queue
                </div>
                <div className="text-[11px] text-[#F5F0E8]/72">
                  {frontendDemo ? "CLIENT DEMO" : isSubmitting ? "PAYLOAD ACTIVE" : "QUEUE STABLE"}
                </div>
              </div>
              <div className="border border-[rgba(245,240,232,0.08)] bg-black/35 p-2">
                <div className="mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-[#C8860A]">
                  <Zap className="h-3.5 w-3.5" />
                  Live Fragments
                </div>
                <div className="text-[11px] text-[#F5F0E8]/72">
                  {selectedTarget.intelList.length} CARD(S)
                </div>
              </div>
              <button
                onClick={() => {
                  void triggerDeepResearch();
                }}
                className="flex items-center justify-between border border-[rgba(16,185,129,0.28)] bg-emerald-950/10 p-2 text-left transition hover:bg-emerald-950/20"
              >
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-emerald-400">
                    <GitFork className="h-3.5 w-3.5" />
                    Deep Research
                  </div>
                  <div className={`text-[11px] ${deepResearchTextClass}`}>
                    Capability: {deepResearchCapability}
                  </div>
                </div>
                <span className="rounded border border-emerald-500/30 px-1.5 py-0.5 text-[9px] text-emerald-400">
                  E
                </span>
              </button>
            </div>

            <div className="max-h-[80vh] flex-1 overflow-y-auto space-y-3 pr-1">
              {visibleScanState === "SCANNING" && selectedTarget.intelList.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-gray-500">
                  <Activity className="h-8 w-8 animate-spin text-[#C8860A]" />
                  <div className="crt-glow-amber text-[10px] uppercase tracking-widest text-[#C8860A]">
                    PARSING INTELLIGENCE STREAM...
                  </div>
                  <div className="relative h-1 w-48 overflow-hidden bg-[rgba(245,240,232,0.1)]">
                    <motion.div
                      className="absolute left-0 top-0 h-full bg-[#C8860A]"
                      style={{ width: `${visibleScanProgress * 100}%` }}
                    />
                  </div>
                  <span className="mt-1 font-mono text-[9px] text-gray-500">
                    LIVE SSE RESULT BUFFER
                  </span>
                </div>
              ) : selectedTarget.intelList.length ? (
                <AnimatePresence mode="popLayout">
                  {selectedTarget.intelList.map((card, index) => (
                    <CinematicIntelCard key={card.id} card={card} index={index} />
                  ))}
                </AnimatePresence>
              ) : (
                <div className="relative min-h-[360px] overflow-hidden border border-[rgba(245,240,232,0.08)] bg-black/25 p-5">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(200,134,10,0.06),transparent_42%)]" />
                  <div className="absolute inset-0 cyber-stripes opacity-[0.04]" />
                  <div className="relative z-10 space-y-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#F5F0E8]/34">
                    <div className="flex items-center justify-between border-b border-[rgba(245,240,232,0.08)] pb-2">
                      <span>INTEL REGISTER STANDBY</span>
                      <span className="text-[#C8860A]/72">SSE BUFFER ARMED</span>
                    </div>
                    <div className="space-y-2">
                      <div className="border-l border-[#C8860A]/30 pl-3">
                        Awaiting first live result fragment from active capture pipeline.
                      </div>
                      <div className="border-l border-[rgba(245,240,232,0.12)] pl-3">
                        Upload an image, upload video, or arm webcam ingestion to seed the stream.
                      </div>
                      <div className="border-l border-[rgba(245,240,232,0.12)] pl-3">
                        Deep Research remains isolated until a target is positively locked.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between border-t border-[rgba(245,240,232,0.1)] pt-2 text-[9px] uppercase text-gray-500">
              <span>SECTOR PARSE SECURE // DATA DENSITY: MAX</span>
              <span className={visibleScanState === "ERROR" ? "text-red-400" : apiStatusTextClass}>
                {visibleScanState === "ERROR" ? "FAULT DETECTED" : `API SYSTEM: ${apiSystemLabel}`}
              </span>
            </div>
          </section>

          <section className="relative flex flex-col gap-4 overflow-hidden border border-[rgba(245,240,232,0.12)] bg-[#0A0906] p-4 lg:col-span-3">
            <div className="hud-corner-bone tl" />
            <div className="hud-corner-bone tr" />
            <div className="hud-corner-bone bl" />
            <div className="hud-corner-bone br" />
            <div className="dossier-sheen" />

            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#F5F0E8]">
              <span className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-[#C8860A]" />
                BIOMETRIC IDENTITY
              </span>
              <span className="rounded-[1px] border border-[rgba(200,134,10,0.22)] bg-black/45 px-1.5 py-0.5 text-[8px] text-[#C8860A]">
                REG: ROZOOKA_V4
              </span>
            </div>

            <div className="relative aspect-[4/5] w-full overflow-hidden border border-[rgba(245,240,232,0.15)] bg-black shadow-[0_0_24px_rgba(0,0,0,0.4)]">
              <div className="hud-corner tl" />
              <div className="hud-corner tr" />
              <div className="hud-corner bl" />
              <div className="hud-corner br" />
              <div className="crt-vignette z-[6]" />

              <div className="pointer-events-none absolute left-2 top-2 z-20 border border-[rgba(245,240,232,0.15)] bg-black/65 p-1 font-mono text-[8px] leading-normal text-[#C8860A]">
                <div className="flex items-center gap-1">
                  <span className="h-1 w-1 animate-ping rounded-full bg-[#C8860A]" />
                  <span>ZOOM: {dossierScanStep.scale.toFixed(2)}x</span>
                </div>
                <div className="mt-0.5 max-w-[150px] truncate text-[7px] text-[#F5F0E8]">
                  {dossierScanStep.label}
                </div>
              </div>

              <div className="pointer-events-none absolute right-2 top-2 z-20 border border-[rgba(245,240,232,0.15)] bg-black/65 p-1 text-right font-mono text-[8.5px] leading-normal text-[#C8860A]">
                <div>FOCUS: {dossierScanStep.gridAlign}</div>
                <div className="text-[7px] text-gray-400">APERTURE: F/1.2 DYN</div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedTarget.id}
                  initial={{ y: -150, opacity: 0, scale: 1.05 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 150, opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 85, damping: 14, mass: 1.3 }}
                  className="relative h-full w-full"
                >
                  <motion.img
                    src={selectedTarget.photoUrl}
                    alt={selectedTarget.name}
                    className="h-full w-full object-cover"
                    animate={{
                      scale: dossierScanStep.scale,
                      x: visibleScanState === "SCANNING" ? dossierScanStep.x : "0%",
                      y: visibleScanState === "SCANNING" ? dossierScanStep.y : "0%",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 50,
                      damping: 16,
                      mass: 1.1,
                    }}
                    style={{
                      mixBlendMode:
                        visibleScanState === "SCANNING"
                          ? dossierNegativeFlash
                            ? "screen"
                            : "luminosity"
                          : "screen",
                      filter:
                        visibleScanState === "SCANNING"
                          ? dossierNegativeFlash
                            ? "invert(1) grayscale(1) contrast(1.85) brightness(1.1)"
                            : "grayscale(1) contrast(1.45) brightness(0.88) sepia(0.24) saturate(0.6)"
                          : "grayscale(1) contrast(1.34) brightness(0.9) sepia(0.18) hue-rotate(2deg)",
                      transformOrigin: "center center",
                    }}
                  />
                </motion.div>
              </AnimatePresence>

              {displayedIdentityStatus ? (
                <div
                  className={`pointer-events-none absolute inset-0 z-[7] opacity-70 mix-blend-screen ${identityTone.overlay}`}
                />
              ) : null}

              <div
                className="pointer-events-none absolute z-[15]"
                style={{
                  left: dossierLockPosition.left,
                  top: dossierLockPosition.top,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <motion.div
                  animate={{
                    opacity: visibleScanState === "SCANNING" ? 1 : 0.72,
                    scale: visibleScanState === "SCANNING" ? 1 : 1,
                    width: dossierLockSize,
                    height: dossierLockSize,
                  }}
                  transition={{ type: "spring", stiffness: 100, damping: 18, mass: 0.92 }}
                  className="relative"
                >
                  <div className="absolute inset-0 border border-[#C8860A]/26 bg-[radial-gradient(circle,rgba(200,134,10,0.05),transparent_72%)]" />
                  <span className="absolute left-0 top-0 h-3.5 w-3.5 -translate-x-1 -translate-y-1 border-l border-t border-[#C8860A]" />
                  <span className="absolute right-0 top-0 h-3.5 w-3.5 translate-x-1 -translate-y-1 border-r border-t border-[#C8860A]" />
                  <span className="absolute bottom-0 left-0 h-3.5 w-3.5 -translate-x-1 translate-y-1 border-b border-l border-[#C8860A]" />
                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 translate-x-1 translate-y-1 border-b border-r border-[#C8860A]" />
                  <motion.span
                    animate={{ opacity: [0.18, 0.62, 0.18] }}
                    transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 bg-[#C8860A]/55"
                  />
                  <motion.span
                    animate={{ opacity: [0.1, 0.44, 0.1] }}
                    transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut", delay: 0.14 }}
                    className="absolute bottom-2 top-2 left-1/2 w-px -translate-x-1/2 bg-[#C8860A]/38"
                  />
                </motion.div>
              </div>

              <div className="pointer-events-none absolute inset-0 border border-dashed border-[#C8860A]/10" />
              <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-px bg-[#C8860A]/20" />
              <div className="pointer-events-none absolute bottom-3 top-3 left-1/2 w-px bg-[#C8860A]/20" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-2/5 w-full bg-gradient-to-t from-black to-transparent" />

              <div className="pointer-events-none absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-end justify-between font-mono text-[9px]">
                <div className="flex flex-col border border-[rgba(245,240,232,0.1)] bg-black/60 px-1 py-0.5">
                  <span className="text-gray-400">SIG_CODE</span>
                  <span className="max-w-[80px] truncate tracking-tight text-[#C8860A]">
                    {selectedTarget.hexSignature}
                  </span>
                </div>

                <div className="flex flex-col items-end border border-[rgba(245,240,232,0.1)] bg-black/60 px-1 py-0.5">
                  <span className="text-gray-400">SECTOR</span>
                  <span className="text-[#C8860A]">
                    {selectedTarget.sectorOrigin.split(" ")[0]}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-[rgba(245,240,232,0.1)] pt-3 text-[10px] leading-relaxed tracking-wider">
              <div className="flex flex-col border-b border-[rgba(245,240,232,0.06)] pb-1.5">
                <span className="font-bold text-gray-500">NAME DESIGNATION:</span>
                <span className="crt-glow mt-0.5 text-xs font-bold tracking-widest text-[#F5F0E8]">
                  {visibleScanState === "SCANNING" ? (
                    <span className="text-[#C8860A]">{visibleScrambledName}</span>
                  ) : (
                    <TypewriterText
                      key={`${selectedTarget.id}-${visibleScanState}`}
                      text={selectedTarget.name}
                      speed={24}
                      scramble
                      decode
                    />
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-[rgba(245,240,232,0.06)] pb-1.5">
                <div className="flex flex-col">
                  <span className="text-gray-500">CONFIDENCE:</span>
                  <span
                    className={`mt-0.5 font-bold ${
                      visibleScanState === "SCANNING"
                        ? "animate-pulse text-[#C8860A]"
                        : "text-[#F5F0E8]"
                    }`}
                  >
                    {visibleDisplayConfidence.toFixed(3)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500">SERIAL ID:</span>
                  <span className="mt-0.5 font-bold text-gray-300">
                    {selectedTarget.serialNumber}
                  </span>
                </div>
              </div>

              {shouldShowIdentityPanel ? (
                <div className={`border-b pb-2 ${identityTone.border}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold tracking-[0.18em] ${identityTone.accent}`}>
                      IDENTITY RESOLUTION
                    </span>
                    <span className={`rounded-[1px] border px-2 py-0.5 text-[8px] font-bold tracking-[0.18em] ${identityTone.badge}`}>
                      {formatIdentityStatusLabel(displayedIdentityStatus)}
                    </span>
                  </div>

                  <div className={`rounded-[2px] border p-2 text-[9px] leading-relaxed ${identityTone.panel}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {identityFixture?.statusLine ??
                          (displayedIdentityStatus
                            ? `LIVE STATUS // ${formatIdentityStatusLabel(displayedIdentityStatus)}`
                            : "IDENTITY LINK UNRESOLVED // AWAITING CONFIRMATION")}
                      </span>
                      <span className="text-[8px] uppercase tracking-[0.16em] text-[#F5F0E8]/55">
                        EVIDENCE {displayedIdentityEvidence.length}
                      </span>
                    </div>

                    {!displayedIdentityStatus ? (
                      <div className="mt-2 border-l border-[#C8860A]/30 pl-2 text-[#F5F0E8]/62">
                        Backend has not returned identity_status for this subject. Holding dossier in
                        unresolved state until a candidate or confirmation arrives.
                      </div>
                    ) : null}

                    {displayedIdentityStatus === "confirmed" ? (
                      <div className="mt-2 space-y-1.5">
                        {displayedIdentityEvidence.slice(0, 2).map((item) => (
                          <div key={`${item.source_engine}-${item.title}`} className="border-l border-emerald-700/30 pl-2 text-[#D1FAE5]">
                            {item.title || `${item.source_engine} corroboration`}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {displayedIdentityStatus === "candidate" ? (
                      <div className="mt-2 space-y-2">
                        {displayedIdentityCandidates.slice(0, 3).map((candidate, index) => (
                          <div
                            key={`${candidate.normalized_name}-${index}`}
                            className="rounded-[1px] border border-slate-700/35 bg-slate-950/28 px-2 py-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-100">{candidate.name.toUpperCase()}</span>
                              <span className="text-slate-300">{candidate.score.toFixed(3)}</span>
                            </div>
                            <div className="mt-1 text-[8px] uppercase tracking-[0.14em] text-slate-400">
                              {candidate.independent_sources} source(s) // {candidate.evidence_count} evidence // {candidate.source_types.slice(0, 2).join(" / ")}
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={confirmTopCandidateLocally}
                          className="w-full rounded-[1px] border border-slate-500/35 bg-slate-900/35 px-2 py-1.5 text-[9px] font-bold tracking-[0.18em] text-slate-100 transition hover:border-slate-300/45 hover:bg-slate-800/35"
                        >
                          PROMOTE TOP CANDIDATE
                        </button>
                      </div>
                    ) : null}

                    {displayedIdentityStatus === "manual_review_required" ? (
                      <div className="mt-2 space-y-1.5">
                        {displayedIdentityEvidence.slice(0, 2).map((item) => (
                          <div key={`${item.source_engine}-${item.title}`} className="border-l border-orange-800/35 pl-2 text-orange-100/90">
                            {item.title || `${item.source_engine} review signal`}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-2 h-[3px] overflow-hidden bg-white/10">
                      <div
                        className={`h-full ${identityTone.progress}`}
                        style={{
                          width:
                            displayedIdentityStatus === "confirmed"
                              ? "100%"
                              : displayedIdentityStatus === "candidate"
                                ? "68%"
                                : displayedIdentityStatus === "manual_review_required"
                                  ? "42%"
                                  : "24%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col border-b border-[rgba(245,240,232,0.06)] pb-1.5">
                <span className="text-gray-500">SCAN_STATUS:</span>
                <span
                  className={`mt-0.5 font-bold tracking-tight ${
                    visibleScanState === "SCANNING"
                      ? "animate-pulse text-yellow-500"
                      : visibleScanState === "COMPLETED"
                        ? "crt-glow-amber text-[#C8860A]"
                        : visibleScanState === "ERROR"
                          ? "text-red-400"
                          : "text-gray-400"
                  }`}
                >
                  {visibleScanState === "SCANNING"
                    ? "COMPILING COGNITION ENGINE..."
                    : selectedTarget.status}
                </span>
                <div className="mt-2 h-[3px] overflow-hidden bg-[rgba(245,240,232,0.06)]">
                  <motion.div
                    className="h-full bg-[#C8860A]"
                    animate={{ width: `${Math.max(visibleScanProgress, selectedTarget.confidence) * 100}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="flex flex-col border-b border-[rgba(245,240,232,0.06)] pb-2">
                <span className="text-gray-500">NARRATIVE DOSSIER:</span>
                <span
                  className={`mt-1 font-mono text-[9px] leading-relaxed ${
                    selectedTarget.synthesisStatus === "complete"
                      ? "text-[#F5F0E8]/78"
                      : selectedTarget.synthesisStatus === "partial"
                        ? "text-[#C8860A]"
                        : "text-gray-400"
                  }`}
                >
                  {selectedTarget.narrativeSummary}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-3.5 overflow-y-auto pr-0.5 font-mono text-[9px] leading-relaxed text-[#F5F0E8]/80">
              <div className="border-b border-[rgba(245,240,232,0.08)] pb-2.5">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#C8860A]">
                  <Globe className="h-3 w-3" />
                  WORK RECORD CHRONICLE
                </div>
                <div className="space-y-1.5 pl-2 text-gray-400">
                  {selectedTarget.workHistory.map((item) => (
                    <p key={item} className="border-l border-[rgba(245,240,232,0.15)] pl-2">
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              <div className="border-b border-[rgba(245,240,232,0.08)] pb-2.5">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#C8860A]">
                  <Cpu className="h-3 w-3" />
                  ACADEMIC CREDENTIALS
                </div>
                <div className="space-y-1.5 pl-2 text-gray-400">
                  {selectedTarget.education.map((item) => (
                    <p key={item} className="border-l border-[rgba(245,240,232,0.15)] pl-2">
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              <div className="border-b border-[rgba(245,240,232,0.08)] pb-2.5">
                <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#C8860A]">
                  <LinkIcon className="h-3 w-3" />
                  COGNITIVE SIGNATURE ADDRESSES
                </div>
                <div className="space-y-1.5 pl-2 font-mono text-gray-400">
                  {selectedTarget.socialProfiles.map((item) => (
                    <p
                      key={item}
                      className="border-l border-[rgba(245,240,232,0.15)] pl-2 selection:bg-[#C8860A]"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <div className="crt-glow-danger mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#8B2A2A]">
                  <ShieldAlert className="h-3 w-3" />
                  INTERROGATION CONVERSIBILITY CORES
                </div>
                <div className="space-y-1.5 pl-2 text-gray-400">
                  {selectedTarget.conversationHooks.map((item) => (
                    <p
                      key={item}
                      className="border-l border-red-950/40 pl-2 font-serif italic text-[#F5F0E8]/70"
                    >
                      &ldquo;{item}&rdquo;
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="mt-2 flex flex-col items-center justify-between gap-2 border-t border-[rgba(245,240,232,0.12)] pt-3 text-[10px] text-gray-500 md:flex-row">
          <span>COGNITIVE COMPILER INTEL REGISTER // AUTH_SEC: CLASS A DISCLOSURE PRESERVATION</span>
          <div className="flex items-center gap-3">
            <span>
              {frontendDemo
                ? "CLIENT DEMO MODE: ACTIVE"
                : isSubmitting
                  ? "NETWORK SYSTEM LATENCY: ACTIVE"
                  : `NETWORK SYSTEM LATENCY: ${latencyLabel}`}
            </span>
            <span className="hidden md:inline">/</span>
            <span className={deepResearchTextClass}>
              DEEP RESEARCH: {deepResearchCapability}
            </span>
            <span
              className="cursor-pointer text-[#C8860A] hover:underline"
              onClick={() => {
                setStatusBanner(DEFAULT_STATUS_BANNER);
                addTerminalLog("SYSTEM RESET // STATUS BANNER CLEARED");
              }}
            >
              RE-INIT PORT 3001
            </span>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {showCinematicLoader ? (
          <CinematicLoader
            status={frontendDemo ? visibleStatusBanner : loaderStatus}
            targetPhotoUrl={selectedTarget.photoUrl}
            scanProgress={visibleScanProgress}
            targetId={selectedTarget.serialNumber}
            targetName={frontendDemo ? selectedTarget.name : loaderTargetName}
            logs={loaderLogs}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {visibleIsDeepResearch ? (
          <DeepResearchBoard
            activeTarget={selectedTarget}
            deepResearchCapability={deepResearchCapability}
            systemStatusLabel={apiSystemLabel}
            onClose={() => {
              if (frontendDemo) {
                setFrontendDemo((current) =>
                  current
                    ? {
                        ...current,
                        phase: "main",
                        status: "DEMO FLOW // RETURNED TO PRIMARY CONSOLE",
                      }
                    : current,
                );
              } else {
                setIsDeepResearch(false);
                addTerminalLog(
                  "DEEP RESEARCH INTERFACE TERMINATED // RETURNING TO PRIMARY CONSOLE",
                );
              }
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
