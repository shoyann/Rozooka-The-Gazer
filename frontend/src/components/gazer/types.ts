export type IntelligenceSource =
  | "LINKEDIN"
  | "TWITTER"
  | "GITHUB"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "WEB"
  | "EXA"
  | "GOOGLE"
  | "SYSTEM"
  | "DEEP_DIVE"
  | string;

export interface IntelligenceCard {
  id: string;
  source: IntelligenceSource;
  timestamp: string;
  confidence: number;
  content: string;
  classification: string;
}

export type IdentityStatus =
  | "confirmed"
  | "candidate"
  | "manual_review_required";

export interface TargetDossier {
  id: string;
  name: string;
  serialNumber: string;
  confidence: number;
  status: string;
  identityStatus?: IdentityStatus | null;
  identityCandidates: IdentityCandidateRecord[];
  identityEvidence: IdentityEvidenceRecord[];
  synthesisStatus: "pending" | "partial" | "complete";
  photoUrl: string;
  narrativeSummary: string;
  workHistory: string[];
  education: string[];
  socialProfiles: string[];
  conversationHooks: string[];
  intelList: IntelligenceCard[];
  hexSignature: string;
  sectorOrigin: string;
}

export interface WorkHistoryEntry {
  role: string;
  company: string;
  period?: string | null;
}

export interface EducationEntry {
  school: string;
  degree?: string | null;
}

export interface DossierPayload {
  structured?: {
    title?: string | null;
    company?: string | null;
    workHistory?: WorkHistoryEntry[];
    education?: EducationEntry[];
    socialProfiles?: Record<string, string>;
    notableActivity?: string[];
    conversationHooks?: string[];
    riskFlags?: string[];
  };
  narrative?: {
    summary?: string;
    paragraphs?: string[];
  };
  synthesisStatus?: "pending" | "partial" | "complete";
  synthesisError?: string | null;
  structuredBy?: string | null;
  narrativeBy?: string | null;
}

export interface IdentityCandidateRecord {
  name: string;
  normalized_name: string;
  score: number;
  independent_sources: number;
  evidence_count: number;
  source_types: string[];
  urls: string[];
}

export interface IdentityEvidenceRecord {
  candidate_name?: string;
  normalized_name?: string;
  source_type: string;
  source_engine: string;
  url?: string;
  title?: string;
  similarity?: number;
  weight: number;
  strong: boolean;
}

export interface PersonRecord {
  _id?: string;
  person_id?: string;
  capture_id?: string;
  name?: string;
  confidence?: number;
  status?: string;
  summary?: string;
  occupation?: string | null;
  organization?: string | null;
  photoUrl?: string;
  dossier?: DossierPayload;
  identity_status?: IdentityStatus;
  identity_candidates?: IdentityCandidateRecord[];
  identity_evidence?: IdentityEvidenceRecord[];
}

export interface CaptureResponse {
  capture_id: string;
  status:
    | "queued"
    | "processing"
    | "identifying"
    | "researching"
    | "synthesizing"
    | "complete"
    | "processed"
    | "error"
    | "failed";
  success: boolean;
  source: "upload" | "video" | "camera";
  filename?: string | null;
  content_type?: string | null;
  timestamp?: number | null;
  total_frames: number;
  faces_detected: number;
  persons_created: string[];
  persons_enriched: number;
  error?: string | null;
}

export interface AgentResultEvent {
  agent_name: string;
  source?: string;
  status: string;
  snippets: string[];
  urls_found: string[];
  error?: string | null;
  confidence?: number;
}

export interface ResearchInitEvent {
  person_id?: string | null;
  person_name?: string | null;
  image_url?: string | null;
  mode?: "fast" | "deep";
}

export interface ResearchCompleteEvent {
  person_id?: string | null;
  mode?: "fast" | "deep";
  total_sources?: number;
  total_urls?: number;
}
