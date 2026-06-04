import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function resolvePersonDocId(ctx: any, personId: string) {
  const all = await ctx.db.query("persons").collect();
  return (
    all.find(
      (person: Record<string, unknown>) =>
        person._id === personId || person.person_id === personId,
    )?._id ?? null
  );
}

export const getByPerson = query({
  args: { personId: v.string() },
  handler: async (ctx, { personId }) => {
    const docId = await resolvePersonDocId(ctx, personId);
    if (!docId) {
      return [];
    }
    return await ctx.db
      .query("intelFragments")
      .withIndex("by_person", (q) => q.eq("personId", docId))
      .collect();
  },
});

export const create = mutation({
  args: {
    personId: v.string(),
    source: v.string(),
    agentName: v.string(),
    url: v.string(),
    claim: v.string(),
    evidenceText: v.string(),
    timestamp: v.optional(v.number()),
    dataType: v.string(),
    confidence: v.number(),
    verified: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { personId, source, agentName, url, claim, evidenceText, timestamp, dataType, confidence, verified },
  ) => {
    const docId = await resolvePersonDocId(ctx, personId);
    if (!docId) {
      return null;
    }

    const now = typeof timestamp === "number" ? timestamp : Date.now();
    const fragmentId = await ctx.db.insert("intelFragments", {
      personId: docId,
      person_id: personId,
      source,
      agentName,
      url,
      claim,
      evidenceText,
      confidence,
      verified: verified ?? false,
      timestamp: now,
      dataType,
    });

    const person = (await ctx.db.get(docId)) as { name?: string } | null;
    await ctx.db.insert("activityLog", {
      type: "research",
      message: `[${source.toUpperCase()}] New ${dataType} intel for ${person?.name ?? "unknown"}`,
      personId: docId,
      agentName,
      timestamp: now,
    });

    return fragmentId;
  },
});

export const recentActivity = query({
  handler: async (ctx) => {
    return await ctx.db.query("activityLog").order("desc").take(50);
  },
});
