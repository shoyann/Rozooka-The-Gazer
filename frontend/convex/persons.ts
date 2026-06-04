import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const PERSON_STATUS = v.union(
  v.literal("identified"),
  v.literal("researching"),
  v.literal("synthesizing"),
  v.literal("complete"),
);

type IdentityStatus = "confirmed" | "candidate" | "manual_review_required";

const IDENTITY_STATUS_VALUES = new Set<IdentityStatus>([
  "confirmed",
  "candidate",
  "manual_review_required",
]);

function mapPersonStatus(value: unknown) {
  const statusMap: Record<string, "identified" | "researching" | "synthesizing" | "complete"> = {
    detected: "identified",
    identified: "identified",
    enriching: "researching",
    researching: "researching",
    synthesizing: "synthesizing",
    enriched: "complete",
    enriched_no_synthesis: "complete",
    synthesis_failed: "identified",
    complete: "complete",
  };

  if (typeof value !== "string") {
    return "identified";
  }

  return statusMap[value] ?? "identified";
}

function mapIdentityStatus(value: unknown): IdentityStatus | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return IDENTITY_STATUS_VALUES.has(value as IdentityStatus)
    ? (value as IdentityStatus)
    : undefined;
}

function parseIdentityCandidates(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const rawSourceTypes = record.source_types;
      const rawUrls = record.urls;
      const sourceTypes = Array.isArray(rawSourceTypes)
        ? rawSourceTypes.filter(
            (item: unknown): item is string => typeof item === "string" && item.length > 0,
          )
        : [];
      const urls = Array.isArray(rawUrls)
        ? rawUrls.filter(
            (item: unknown): item is string => typeof item === "string" && item.length > 0,
          )
        : [];

      if (
        typeof record.name !== "string" ||
        typeof record.normalized_name !== "string" ||
        typeof record.score !== "number" ||
        typeof record.independent_sources !== "number" ||
        typeof record.evidence_count !== "number"
      ) {
        return null;
      }

      return {
        name: record.name,
        normalized_name: record.normalized_name,
        score: record.score,
        independent_sources: record.independent_sources,
        evidence_count: record.evidence_count,
        source_types: sourceTypes,
        urls,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function parseIdentityEvidence(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      if (
        typeof record.source_type !== "string" ||
        typeof record.source_engine !== "string" ||
        typeof record.weight !== "number" ||
        typeof record.strong !== "boolean"
      ) {
        return null;
      }

      return {
        ...(typeof record.candidate_name === "string"
          ? { candidate_name: record.candidate_name }
          : {}),
        ...(typeof record.normalized_name === "string"
          ? { normalized_name: record.normalized_name }
          : {}),
        source_type: record.source_type,
        source_engine: record.source_engine,
        ...(typeof record.url === "string" ? { url: record.url } : {}),
        ...(typeof record.title === "string" ? { title: record.title } : {}),
        ...(typeof record.similarity === "number" ? { similarity: record.similarity } : {}),
        weight: record.weight,
        strong: record.strong,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function parseMetadata(value: unknown, identityStatus?: IdentityStatus) {
  if (!value || typeof value !== "object") {
    return identityStatus ? { identityStatus } : undefined;
  }

  const record = value as Record<string, unknown>;
  return {
    ...(identityStatus ? { identityStatus } : {}),
    ...(typeof record.identityStatus === "string"
      ? { identityStatus: record.identityStatus }
      : {}),
    ...(typeof record.reviewMessage === "string"
      ? { reviewMessage: record.reviewMessage }
      : {}),
    ...(Array.isArray(record.reviewUrls)
      ? {
          reviewUrls: record.reviewUrls.filter(
            (url: unknown) => typeof url === "string" && url.length > 0,
          ),
        }
      : {}),
  };
}

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function toStructuredDossier(value: unknown, _fallbackSummary?: string, fallbackTitle?: string, fallbackCompany?: string) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawWorkHistory = record.work_history ?? record.workHistory;
  const rawSocial = record.social_profiles ?? record.socialProfiles;
  const socialProfiles: Record<string, string> = {};
  if (rawSocial && typeof rawSocial === "object") {
    for (const [key, rawValue] of Object.entries(rawSocial as Record<string, unknown>)) {
      if (typeof rawValue === "string" && rawValue.length > 0) {
        socialProfiles[key] = rawValue;
      }
    }
  }

  return {
    ...(typeof record.title === "string"
      ? { title: record.title }
      : typeof fallbackTitle === "string" && fallbackTitle.length > 0
        ? { title: fallbackTitle }
        : {}),
    ...(typeof record.company === "string"
      ? { company: record.company }
      : typeof fallbackCompany === "string" && fallbackCompany.length > 0
        ? { company: fallbackCompany }
        : {}),
    workHistory: Array.isArray(rawWorkHistory)
      ? (rawWorkHistory as Array<Record<string, unknown>>).map(
          (entry: Record<string, unknown>) => ({
            role: String(entry.role ?? ""),
            company: String(entry.company ?? ""),
            ...(entry.period ? { period: String(entry.period) } : {}),
          }),
        )
      : [],
    education: Array.isArray(record.education)
      ? (record.education as Array<Record<string, unknown>>).map(
          (entry: Record<string, unknown>) => ({
            school: String(entry.school ?? entry.institution ?? ""),
            ...(entry.degree ? { degree: String(entry.degree) } : {}),
          }),
        )
      : [],
    socialProfiles,
    notableActivity: toStringArray(record.notable_activity ?? record.notableActivity),
    conversationHooks: toStringArray(record.conversation_hooks ?? record.conversationHooks),
    riskFlags: toStringArray(record.risk_flags ?? record.riskFlags),
  };
}

function toNarrativeDossier(value: unknown, fallbackSummary?: string) {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const summary =
    typeof record.summary === "string"
      ? record.summary
      : typeof fallbackSummary === "string"
        ? fallbackSummary
        : "";
  return {
    summary,
    paragraphs: toStringArray(record.paragraphs).length
      ? toStringArray(record.paragraphs)
      : summary
        ? [summary]
        : [],
  };
}

function toDossier(value: unknown, fallbackSummary?: string, fallbackTitle?: string, fallbackCompany?: string) {
  if (!value || typeof value !== "object") {
    return {
      structured: toStructuredDossier({}, fallbackSummary, fallbackTitle, fallbackCompany),
      narrative: toNarrativeDossier({}, fallbackSummary),
      synthesisStatus: "pending" as const,
    };
  }

  const record = value as Record<string, unknown>;
  const hasNestedLayers = !!record.structured || !!record.narrative;

  if (hasNestedLayers) {
    return {
      structured: toStructuredDossier(
        record.structured,
        fallbackSummary,
        fallbackTitle,
        fallbackCompany,
      ),
      narrative: toNarrativeDossier(record.narrative, fallbackSummary),
      synthesisStatus:
        record.synthesis_status === "pending" ||
        record.synthesis_status === "partial" ||
        record.synthesis_status === "complete"
          ? record.synthesis_status
          : record.synthesisStatus === "pending" ||
              record.synthesisStatus === "partial" ||
              record.synthesisStatus === "complete"
            ? record.synthesisStatus
            : "pending",
      ...(typeof record.synthesis_error === "string"
        ? { synthesisError: record.synthesis_error }
        : typeof record.synthesisError === "string"
          ? { synthesisError: record.synthesisError }
          : {}),
      ...(typeof record.structured_by === "string"
        ? { structuredBy: record.structured_by }
        : typeof record.structuredBy === "string"
          ? { structuredBy: record.structuredBy }
          : {}),
      ...(typeof record.narrative_by === "string"
        ? { narrativeBy: record.narrative_by }
        : typeof record.narrativeBy === "string"
          ? { narrativeBy: record.narrativeBy }
          : {}),
    };
  }

  return {
    structured: toStructuredDossier(record, fallbackSummary, fallbackTitle, fallbackCompany),
    narrative: toNarrativeDossier(record, fallbackSummary),
    synthesisStatus: "complete" as const,
  };
}

export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("persons").collect();
  },
});

export const getById = query({
  args: { id: v.id("persons") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getByStatus = query({
  args: { status: PERSON_STATUS },
  handler: async (ctx, { status }) => {
    return await ctx.db
      .query("persons")
      .filter((q) => q.eq(q.field("status"), status))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    photoUrl: v.string(),
    confidence: v.number(),
    boardPosition: v.optional(v.object({ x: v.number(), y: v.number() })),
  },
  handler: async (ctx, { name, photoUrl, confidence, boardPosition }) => {
    const now = Date.now();
    const pos = boardPosition ?? {
      x: 100 + Math.random() * 800,
      y: 100 + Math.random() * 500,
    };

    const personId = await ctx.db.insert("persons", {
      name,
      photoUrl,
      confidence,
      status: "identified",
      boardPosition: pos,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("activityLog", {
      type: "identify",
      message: `Identified: ${name} (${Math.round(confidence * 100)}% confidence)`,
      personId,
      timestamp: now,
    });

    return personId;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("persons"),
    status: PERSON_STATUS,
  },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status, updatedAt: Date.now() });

    const person = await ctx.db.get(id);
    if (person) {
      await ctx.db.insert("activityLog", {
        type: status === "complete" ? "complete" : "research",
        message: `${person.name}: status -> ${status.toUpperCase()}`,
        personId: id,
        timestamp: Date.now(),
      });
    }
  },
});

export const updateDossier = mutation({
  args: {
    id: v.id("persons"),
    dossier: v.object({
      structured: v.object({
        title: v.optional(v.string()),
        company: v.optional(v.string()),
        workHistory: v.array(
          v.object({
            role: v.string(),
            company: v.string(),
            period: v.optional(v.string()),
          }),
        ),
        education: v.array(
          v.object({
            school: v.string(),
            degree: v.optional(v.string()),
          }),
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
      }),
      narrative: v.object({
        summary: v.string(),
        paragraphs: v.array(v.string()),
      }),
      synthesisStatus: v.union(
        v.literal("pending"),
        v.literal("partial"),
        v.literal("complete"),
      ),
      synthesisError: v.optional(v.string()),
      structuredBy: v.optional(v.string()),
      narrativeBy: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { id, dossier }) => {
    await ctx.db.patch(id, {
      dossier,
      summary: dossier.narrative.summary,
      occupation: dossier.structured.title,
      organization: dossier.structured.company,
      status: "complete",
      updatedAt: Date.now(),
    });
  },
});

export const updatePosition = mutation({
  args: {
    id: v.id("persons"),
    boardPosition: v.object({ x: v.number(), y: v.number() }),
  },
  handler: async (ctx, { id, boardPosition }) => {
    await ctx.db.patch(id, { boardPosition });
  },
});

export const store = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = Date.now();
    const name = data.name ?? "Unknown";
    const confidence = typeof data.confidence === "number" ? data.confidence : 0.5;
    const person_id =
      typeof data.person_id === "string" && data.person_id.length > 0
        ? data.person_id
        : undefined;
    const capture_id =
      typeof data.capture_id === "string" && data.capture_id.length > 0
        ? data.capture_id
        : undefined;
    const identity_status = mapIdentityStatus(data.identity_status);
    const identity_candidates = parseIdentityCandidates(data.identity_candidates);
    const identity_evidence = parseIdentityEvidence(data.identity_evidence);
    const metadata = parseMetadata(data.metadata, identity_status);

    const personStatus = mapPersonStatus(data.status);
    const photoUrl = typeof data.photoUrl === "string" ? data.photoUrl : "";

    const personId = await ctx.db.insert("persons", {
      name,
      ...(person_id ? { person_id } : {}),
      ...(capture_id ? { capture_id } : {}),
      ...(metadata ? { metadata } : {}),
      ...(identity_status ? { identity_status } : {}),
      ...(identity_candidates ? { identity_candidates } : {}),
      ...(identity_evidence ? { identity_evidence } : {}),
      photoUrl,
      confidence,
      status: personStatus,
      ...(typeof data.summary === "string" ? { summary: data.summary } : {}),
      ...(typeof data.occupation === "string" ? { occupation: data.occupation } : {}),
      ...(typeof data.organization === "string" ? { organization: data.organization } : {}),
      boardPosition: {
        x: 100 + Math.random() * 800,
        y: 100 + Math.random() * 500,
      },
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("activityLog", {
      type: "identify",
      message: `Identified: ${name} (${Math.round(confidence * 100)}% confidence)`,
      personId,
      timestamp: now,
    });

    return personId;
  },
});

export const update = mutation({
  args: {
    person_id: v.string(),
    data: v.any(),
  },
  handler: async (ctx, { person_id, data }) => {
    const all = await ctx.db.query("persons").collect();
    const match = all.find(
      (person) =>
        person._id === person_id ||
        (person as Record<string, unknown>)["person_id"] === person_id,
    );

    if (!match) {
      return;
    }

    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
      status: mapPersonStatus(data.status),
    };

    if (typeof data.capture_id === "string" && data.capture_id.length > 0) {
      patch.capture_id = data.capture_id;
    }
    if (typeof data.summary === "string") {
      patch.summary = data.summary;
    }
    if (typeof data.occupation === "string" && data.occupation.length > 0) {
      patch.occupation = data.occupation;
    }
    if (typeof data.organization === "string" && data.organization.length > 0) {
      patch.organization = data.organization;
    }
    const identity_status = mapIdentityStatus(data.identity_status);
    if (identity_status) {
      patch.identity_status = identity_status;
    }
    const identity_candidates = parseIdentityCandidates(data.identity_candidates);
    if (identity_candidates) {
      patch.identity_candidates = identity_candidates;
    }
    const identity_evidence = parseIdentityEvidence(data.identity_evidence);
    if (identity_evidence) {
      patch.identity_evidence = identity_evidence;
    }

    if (data.dossier || data.summary) {
      patch.dossier = toDossier(
        data.dossier,
        typeof data.summary === "string" ? data.summary : undefined,
        typeof data.occupation === "string" ? data.occupation : undefined,
        typeof data.organization === "string" ? data.organization : undefined,
      );
    }

    const metadata = parseMetadata(data.metadata, identity_status);
    if (metadata) {
      patch.metadata = metadata;
    }

    await ctx.db.patch(match._id, patch);
  },
});

export const deleteAll = mutation({
  handler: async (ctx) => {
    const persons = await ctx.db.query("persons").collect();
    for (const person of persons) {
      await ctx.db.delete(person._id);
    }
    const logs = await ctx.db.query("activityLog").collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    const frags = await ctx.db.query("intelFragments").collect();
    for (const fragment of frags) {
      await ctx.db.delete(fragment._id);
    }
    const conns = await ctx.db.query("connections").collect();
    for (const connection of conns) {
      await ctx.db.delete(connection._id);
    }
    return { deleted: persons.length };
  },
});

export const get = query({
  args: { person_id: v.string() },
  handler: async (ctx, { person_id }) => {
    const all = await ctx.db.query("persons").collect();
    return (
      all.find(
        (person) =>
          person._id === person_id ||
          (person as Record<string, unknown>)["person_id"] === person_id,
      ) ?? null
    );
  },
});
