import { v } from "convex/values";

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

import { XP_REWARDS } from "@fitness/shared";

import {
  checkAchievements,
  grantXp,
  progressQuests,
} from "./gamification";

async function getCurrentUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) {
    throw new Error("User row missing — call getOrCreateCurrentUser first");
  }
  return user;
}

const measurementsValidator = v.object({
  chest: v.optional(v.number()),
  waist: v.optional(v.number()),
  hips: v.optional(v.number()),
  thigh: v.optional(v.number()),
  arm: v.optional(v.number()),
});

// ----- Queries -----

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const all = await ctx.db
      .query("bodyMetrics")
      .withIndex("by_user_recorded", (q) => q.eq("userId", user._id))
      .collect();

    return all.sort((a, b) => b.recordedAt - a.recordedAt);
  },
});

export const latest = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const all = await ctx.db
      .query("bodyMetrics")
      .withIndex("by_user_recorded", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(1);
    return all[0] ?? null;
  },
});

// ----- Mutations -----

export const log = mutation({
  args: {
    bodyweight: v.optional(v.number()),
    bodyFatPct: v.optional(v.number()),
    measurements: v.optional(measurementsValidator),
    recordedAt: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { bodyweight, bodyFatPct, measurements, recordedAt },
  ) => {
    const user = await getCurrentUserOrThrow(ctx);

    const hasAny =
      bodyweight !== undefined ||
      bodyFatPct !== undefined ||
      (measurements &&
        Object.values(measurements).some((value) => value !== undefined));
    if (!hasAny) {
      throw new Error("Log at least one value");
    }

    const id = await ctx.db.insert("bodyMetrics", {
      userId: user._id,
      recordedAt: recordedAt ?? Date.now(),
      bodyweight,
      bodyFatPct,
      measurements,
      source: "manual",
    });

    await grantXp(ctx, user._id, "metric_logged", XP_REWARDS.METRIC_LOGGED);
    if (bodyweight !== undefined) {
      await progressQuests(ctx, user._id, { type: "metric_logged" });
    }
    await checkAchievements(ctx, user._id);

    return id;
  },
});

export const update = mutation({
  args: {
    metricId: v.id("bodyMetrics"),
    bodyweight: v.optional(v.number()),
    bodyFatPct: v.optional(v.number()),
    measurements: v.optional(measurementsValidator),
  },
  handler: async (ctx, { metricId, bodyweight, bodyFatPct, measurements }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const metric = await ctx.db.get(metricId);
    if (!metric) throw new Error("Metric not found");
    if (metric.userId !== user._id) throw new Error("Not your metric");

    const patch: Partial<Doc<"bodyMetrics">> = {};
    if (bodyweight !== undefined) patch.bodyweight = bodyweight;
    if (bodyFatPct !== undefined) patch.bodyFatPct = bodyFatPct;
    if (measurements !== undefined) patch.measurements = measurements;
    await ctx.db.patch(metricId, patch);
  },
});

export const remove = mutation({
  args: { metricId: v.id("bodyMetrics") },
  handler: async (ctx, { metricId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const metric = await ctx.db.get(metricId);
    if (!metric) throw new Error("Metric not found");
    if (metric.userId !== user._id) throw new Error("Not your metric");
    await ctx.db.delete(metricId);
  },
});
