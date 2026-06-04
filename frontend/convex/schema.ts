// JARVIS — Convex Schema
// Real-time person intelligence database
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const identityStatus = v.union(
  v.literal("confirmed"),
  v.literal("candidate"),
  v.literal("manual_review_required")
);

const identityCandidate = v.object({
  name: v.string(),
  normalized_name: v.string(),
  score: v.number(),
  independent_sources: v.number(),
  evidence_count: v.number(),
  source_types: v.array(v.string()),
  urls: v.array(v.string()),
});

const identityEvidence = v.object({
  candidate_name: v.optional(v.string()),
  normalized_name: v.optional(v.string()),
  source_type: v.string(),
  source_engine: v.string(),
  url: v.optional(v.string()),
  title: v.optional(v.string()),
  similarity: v.optional(v.number()),
  weight: v.number(),
  strong: v.boolean(),
});

const structuredDossier = v.object({
  title: v.optional(v.string()),
  company: v.optional(v.string()),
  workHistory: v.array(
    v.object({
      role: v.string(),
      company: v.string(),
      period: v.optional(v.string()),
    })
  ),
  education: v.array(
    v.object({
      school: v.string(),
      degree: v.optional(v.string()),
    })
  ),
  socialProfiles: v.object({
    linkedin: v.optional(v.string()),
    twitter: v.optional(v.string()),
    instagram: v.optional(v.string()),
    github: v.optional(v.string()),
    website: v.optional(v.string()),
  }),
  notableActivity: v.array(v.string()),
  conversationHooks: v.array(v.string()),
  riskFlags: v.array(v.string()),
});

const narrativeDossier = v.object({
  summary: v.string(),
  paragraphs: v.array(v.string()),
});

const legacyDossier = v.object({
  summary: v.string(),
  title: v.optional(v.string()),
  company: v.optional(v.string()),
  workHistory: v.array(
    v.object({
      role: v.string(),
      company: v.string(),
      period: v.optional(v.string()),
    })
  ),
  education: v.array(
    v.object({
      school: v.string(),
      degree: v.optional(v.string()),
    })
  ),
  socialProfiles: v.object({
    linkedin: v.optional(v.string()),
    twitter: v.optional(v.string()),
    instagram: v.optional(v.string()),
    github: v.optional(v.string()),
    website: v.optional(v.string()),
  }),
  notableActivity: v.array(v.string()),
  conversationHooks: v.array(v.string()),
  riskFlags: v.array(v.string()),
});

const layeredDossier = v.object({
  structured: structuredDossier,
  narrative: narrativeDossier,
  synthesisStatus: v.union(
    v.literal("pending"),
    v.literal("partial"),
    v.literal("complete")
  ),
  synthesisError: v.optional(v.string()),
  structuredBy: v.optional(v.string()),
  narrativeBy: v.optional(v.string()),
});

export default defineSchema({
  captures: defineTable({
    capture_id: v.optional(v.string()),
    imageUrl: v.string(),
    timestamp: v.optional(v.number()),
    source: v.string(), // "glasses" | "telegram" | "upload"
    filename: v.optional(v.string()),
    content_type: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("processing"),
      v.literal("identifying"),
      v.literal("identified"),
      v.literal("researching"),
      v.literal("synthesizing"),
      v.literal("complete"),
      v.literal("failed")
    ),
    personId: v.optional(v.id("persons")),
    personsCreated: v.optional(v.array(v.string())),
    personsEnriched: v.optional(v.number()),
    totalFrames: v.optional(v.number()),
    facesDetected: v.optional(v.number()),
    error: v.optional(v.string()),
  }),

  persons: defineTable({
    name: v.string(),
    person_id: v.optional(v.string()),
    capture_id: v.optional(v.string()),
    photoUrl: v.string(),
    confidence: v.number(), // 0-1 identification confidence
    status: v.union(
      v.literal("identified"),
      v.literal("researching"),
      v.literal("synthesizing"),
      v.literal("complete")
    ),
    summary: v.optional(v.string()),
    occupation: v.optional(v.string()),
    organization: v.optional(v.string()),
    identity_status: v.optional(identityStatus),
    identity_candidates: v.optional(v.array(identityCandidate)),
    identity_evidence: v.optional(v.array(identityEvidence)),
    boardPosition: v.object({ x: v.number(), y: v.number() }),
    metadata: v.optional(
      v.object({
        identityStatus: v.optional(v.string()),
        reviewMessage: v.optional(v.string()),
        reviewUrls: v.optional(v.array(v.string())),
      })
    ),
    dossier: v.optional(v.union(layeredDossier, legacyDossier)),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  intelFragments: defineTable({
    personId: v.id("persons"),
    person_id: v.optional(v.string()),
    source: v.string(),
    agentName: v.optional(v.string()),
    url: v.optional(v.string()),
    claim: v.optional(v.string()),
    confidence: v.optional(v.number()),
    evidenceText: v.optional(v.string()),
    content: v.optional(v.string()),
    verified: v.boolean(),
    timestamp: v.number(),
    dataType: v.string(),
  }).index("by_person", ["personId"]),

  connections: defineTable({
    personAId: v.id("persons"),
    personBId: v.id("persons"),
    relationshipType: v.string(), // "colleague" | "classmate" | "mutual_follow"
    description: v.string(),
  })
    .index("by_person_a", ["personAId"])
    .index("by_person_b", ["personBId"]),

  // Live activity feed for the sidebar
  activityLog: defineTable({
    type: v.string(), // "capture" | "identify" | "research" | "complete"
    message: v.string(),
    personId: v.optional(v.id("persons")),
    agentName: v.optional(v.string()),
    timestamp: v.number(),
  }),
});
