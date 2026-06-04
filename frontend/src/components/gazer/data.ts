import type { TargetDossier } from "./types";

const PLACEHOLDER_PORTRAIT =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1000'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' x2='1' y1='0' y2='1'%3E%3Cstop offset='0%25' stop-color='%230a0906'/%3E%3Cstop offset='100%25' stop-color='%2318150d'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='1000' fill='url(%23bg)'/%3E%3Cg stroke='%23c8860a' stroke-opacity='0.35' fill='none'%3E%3Ccircle cx='400' cy='420' r='160'/%3E%3Ccircle cx='400' cy='420' r='110'/%3E%3Cpath d='M180 860c80-170 360-170 440 0'/%3E%3Cpath d='M260 420h280M400 280v280'/%3E%3C/g%3E%3Ctext x='400' y='170' text-anchor='middle' fill='%23f5f0e8' font-size='40' font-family='monospace' letter-spacing='8'%3ETHE GAZER%3C/text%3E%3Ctext x='400' y='930' text-anchor='middle' fill='%23c8860a' font-size='28' font-family='monospace' letter-spacing='10'%3EAWAITING INGEST%3C/text%3E%3C/svg%3E";

export const BOOT_LOGS = [
  "SYSTEM INITIALIZED // COGNITIVE COMPILER VT-49.12",
  "FASTAPI LINK READY AT HOST 127.0.0.1:8000",
  "WAITING FOR SENSOR INGESTION COMMAND...",
];

export const EMPTY_TARGET: TargetDossier = {
  id: "system-bootstrap",
  name: "AWAITING SUBJECT",
  serialNumber: "TG-BOOT-00",
  confidence: 0,
  status: "NO ACTIVE TARGET",
  identityStatus: null,
  identityCandidates: [],
  identityEvidence: [],
  synthesisStatus: "pending",
  photoUrl: PLACEHOLDER_PORTRAIT,
  narrativeSummary:
    "No dossier is active yet. The panel will switch to partial or complete mode as soon as backend research resolves a person.",
  workHistory: [
    "Upload an image or video to start capture.",
    "Enable the webcam to submit a frame every 3 seconds.",
  ],
  education: [
    "Live dossier sections populate from GET /api/person/{id}.",
  ],
  socialProfiles: [
    "API: POST /api/capture",
    "API: POST /api/capture/frame",
    "API: GET /api/research/{person_name}/stream",
  ],
  conversationHooks: [
    "Provide an operator hint if the backend cannot resolve the subject name.",
  ],
  intelList: [],
  hexSignature: "0xBOOTSTRAP",
  sectorOrigin: "LOCAL OPERATOR CONSOLE",
};

export const FRONTEND_DEMO_TARGET: TargetDossier = {
  id: "demo_ana_stelline",
  name: "DR. ANA STELLINE",
  serialNumber: "TG-9901-S",
  confidence: 0.954,
  status: "MONITOR STATUS / CLASS A IMMUNITY",
  identityStatus: "confirmed",
  identityCandidates: [],
  identityEvidence: [
    {
      candidate_name: "Dr. Ana Stelline",
      normalized_name: "dr ana stelline",
      source_type: "portrait_match",
      source_engine: "pimeyes",
      url: "https://pimeyes.com/demo/stelline",
      title: "Portrait match resolved against secure register",
      similarity: 0.954,
      weight: 0.91,
      strong: true,
    },
    {
      candidate_name: "Dr. Ana Stelline",
      normalized_name: "dr ana stelline",
      source_type: "employment_registry",
      source_engine: "exa",
      url: "https://exa.ai/demo/stelline",
      title: "Employment record aligns with subject profile",
      similarity: 0.918,
      weight: 0.84,
      strong: true,
    },
  ],
  synthesisStatus: "complete",
  photoUrl:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=900",
  narrativeSummary:
    "Dr. Ana Stelline sits at the center of several high-value memory-engineering programs, with a work history spanning elite research, defense-adjacent contracting, and public academic prestige. Her dossier reads as polished on the surface, but the surrounding telemetry suggests restricted experimental lines, unusual client renewals, and signals worth keeping under active review.",
  workHistory: [
    "STELLINE LABORATORIES // FOUNDER & CHIEF MEMORY DESIGNER (2041-ACTIVE)",
    "WALLACE CONTRACTORS GROUP // DIRECT MEMORY SYNTH CO-CHAIR (2038-2041)",
    "NEURO-DYNAMICS ACADEMY // PROFESSOR ASSOCIATE (EMERITUS, 2036-2038)",
  ],
  education: [
    "PH.D. NEURO-COGNITIVE EMULATED MODELLING // MIT LAB BEYOND CELL (2035)",
    "M.S. PSYCHO-DYNAMICS OF MEMORIAL IMPLANTS // TOKYO SYNAPSE (2033)",
  ],
  socialProfiles: [
    "EXA SECURE LOG: @Stelline_Memories_Official",
    "WALLACE EXECUTIVE PORTAL: #S_MEM_VIRT_99",
    "SATELLITE PATH: SECTOR-01 METROPOLIS SANCTUM",
  ],
  conversationHooks: [
    "Ask how authentic rain textures are built without physically standing in weather.",
    "Reference a childhood memory involving a wooden horse to test emotional recall.",
    "Mention a hermetically sealed glass workspace and watch for correction behavior.",
  ],
  intelList: [
    {
      id: "demo-intel-1",
      source: "LINKEDIN",
      timestamp: "2026-06-01 22:59:33",
      confidence: 0.985,
      content:
        'LABORATORY CONTRACTS WITH WALLACE CORP WERE AUTOMATICALLY RENEWED FOR A "HERO MEMORY PACK V-9" LINE.',
      classification: "PROPRIETARY",
    },
    {
      id: "demo-intel-2",
      source: "EXA",
      timestamp: "2026-06-01 22:59:37",
      confidence: 0.963,
      content:
        'SYSTEM CACHE CAPTURED A "FORBIDDEN RECALL CORE" WITH SNOW-DIRT ORPHANAGE FRAGMENTS MATCHING PRIOR BLACKLISTED TRAINING MATERIAL.',
      classification: "TACTICAL WARNING",
    },
    {
      id: "demo-intel-3",
      source: "WEB",
      timestamp: "2026-06-01 22:59:41",
      confidence: 0.922,
      content:
        "MEDIC TRANSPORT LEAVING THE SANCTUARY DISPATCHED NULL-RANGE OUTBOUND TELEMETRY TO AN UNRESOLVED RECIPIENT.",
      classification: "IMMUNE SYSTEM SECURE",
    },
  ],
  hexSignature: "0x992BBDC882103",
  sectorOrigin: "SECTOR-01 METROPOLIS SANCTUM",
};
