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

export const listAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("connections").collect();
  },
});

export const getForPerson = query({
  args: { personId: v.string() },
  handler: async (ctx, { personId }) => {
    const docId = await resolvePersonDocId(ctx, personId);
    if (!docId) {
      return [];
    }

    const asA = await ctx.db
      .query("connections")
      .withIndex("by_person_a", (q) => q.eq("personAId", docId))
      .collect();
    const asB = await ctx.db
      .query("connections")
      .withIndex("by_person_b", (q) => q.eq("personBId", docId))
      .collect();
    return [...asA, ...asB];
  },
});

export const create = mutation({
  args: {
    personAId: v.string(),
    personBId: v.string(),
    relationshipType: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const personAId = await resolvePersonDocId(ctx, args.personAId);
    const personBId = await resolvePersonDocId(ctx, args.personBId);
    if (!personAId || !personBId) {
      return null;
    }

    return await ctx.db.insert("connections", {
      personAId,
      personBId,
      relationshipType: args.relationshipType,
      description: args.description,
    });
  },
});
