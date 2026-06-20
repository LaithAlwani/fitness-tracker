import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrow, requireAccess } from "./model";

const measurements = v.object({
  waist: v.optional(v.number()),
  chest: v.optional(v.number()),
  arms: v.optional(v.number()),
  hips: v.optional(v.number()),
  thighs: v.optional(v.number()),
});

export const create = mutation({
  args: {
    weight: v.number(),
    date: v.optional(v.number()),
    notes: v.optional(v.string()),
    measurements: v.optional(measurements),
  },
  handler: async (ctx, { weight, date, notes, measurements: m }) => {
    const user = await getCurrentUserOrThrow(ctx);
    requireAccess(user, Date.now());
    if (!(weight > 0)) throw new Error("Enter a valid weight");

    return await ctx.db.insert("bodyEntries", {
      userId: user._id,
      date: date ?? Date.now(),
      weight,
      notes: notes?.trim() || undefined,
      measurements: m,
    });
  },
});

export const listForUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("bodyEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit ?? 365);
  },
});

export const update = mutation({
  args: {
    entryId: v.id("bodyEntries"),
    weight: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { entryId, weight, notes }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const entry = await ctx.db.get(entryId);
    if (!entry || entry.userId !== user._id) throw new Error("Entry not found");

    const patch: { weight?: number; notes?: string | undefined } = {};
    if (weight !== undefined) {
      if (!(weight > 0)) throw new Error("Enter a valid weight");
      patch.weight = weight;
    }
    if (notes !== undefined) patch.notes = notes.trim() || undefined;
    await ctx.db.patch(entryId, patch);
  },
});

export const remove = mutation({
  args: { entryId: v.id("bodyEntries") },
  handler: async (ctx, { entryId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const entry = await ctx.db.get(entryId);
    if (!entry || entry.userId !== user._id) throw new Error("Entry not found");
    await ctx.db.delete(entryId);
  },
});
