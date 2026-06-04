import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const CAPTURE_STATUS = v.union(
  v.literal("pending"),
  v.literal("queued"),
  v.literal("processing"),
  v.literal("identifying"),
  v.literal("identified"),
  v.literal("researching"),
  v.literal("synthesizing"),
  v.literal("complete"),
  v.literal("failed"),
);

function mapCaptureStatus(value: unknown) {
  const known = new Set([
    "pending",
    "queued",
    "processing",
    "identifying",
    "identified",
    "researching",
    "synthesizing",
    "complete",
    "failed",
  ]);

  if (typeof value !== "string" || !known.has(value)) {
    return "pending";
  }

  return value as
    | "pending"
    | "queued"
    | "processing"
    | "identifying"
    | "identified"
    | "researching"
    | "synthesizing"
    | "complete"
    | "failed";
}

export const create = mutation({
  args: {
    imageUrl: v.string(),
    source: v.string(),
  },
  handler: async (ctx, { imageUrl, source }) => {
    const now = Date.now();
    const captureId = `cap_${now}`;
    const id = await ctx.db.insert("captures", {
      capture_id: captureId,
      imageUrl,
      timestamp: now,
      source,
      status: "pending",
      personsCreated: [],
      personsEnriched: 0,
      totalFrames: 0,
      facesDetected: 0,
    });

    await ctx.db.insert("activityLog", {
      type: "capture",
      message: `New face captured via ${source}`,
      timestamp: now,
    });

    return id;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("captures"),
    status: CAPTURE_STATUS,
    personId: v.optional(v.id("persons")),
  },
  handler: async (ctx, { id, status, personId }) => {
    await ctx.db.patch(id, { status, ...(personId ? { personId } : {}) });
  },
});

export const listRecent = query({
  handler: async (ctx) => {
    return await ctx.db.query("captures").order("desc").take(20);
  },
});

export const get = query({
  args: { capture_id: v.string() },
  handler: async (ctx, { capture_id }) => {
    const all = await ctx.db.query("captures").collect();
    return all.find((capture) => capture.capture_id === capture_id) ?? null;
  },
});

export const store = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const captureId =
      typeof data.capture_id === "string" && data.capture_id.length > 0
        ? data.capture_id
        : `cap_${Date.now()}`;
    const now = Date.now();

    const all = await ctx.db.query("captures").collect();
    const match = all.find((capture) => capture.capture_id === captureId);

    const patch = {
      capture_id: captureId,
      imageUrl: typeof data.imageUrl === "string" ? data.imageUrl : captureId,
      timestamp: typeof data.timestamp === "number" ? data.timestamp : now,
      source: typeof data.source === "string" ? data.source : "manual_upload",
      status: mapCaptureStatus(data.status),
      ...(typeof data.filename === "string" ? { filename: data.filename } : {}),
      ...(typeof data.content_type === "string"
        ? { content_type: data.content_type }
        : {}),
      personsCreated: Array.isArray(data.persons_created)
        ? data.persons_created.filter(
            (personId: unknown) => typeof personId === "string" && personId.length > 0,
          )
        : [],
      personsEnriched:
        typeof data.persons_enriched === "number" ? data.persons_enriched : 0,
      totalFrames: typeof data.total_frames === "number" ? data.total_frames : 0,
      facesDetected: typeof data.faces_detected === "number" ? data.faces_detected : 0,
      ...(typeof data.error === "string" && data.error.length > 0
        ? { error: data.error }
        : {}),
    };

    if (match) {
      await ctx.db.patch(match._id, patch);
      return match._id;
    }

    const id = await ctx.db.insert("captures", patch);
    await ctx.db.insert("activityLog", {
      type: "capture",
      message: `New capture via ${patch.source}`,
      timestamp: now,
    });
    return id;
  },
});
