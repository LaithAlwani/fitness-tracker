import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getCurrentUser, getCurrentUserOrThrow, requireAccess } from "./model";

const exerciseEntry = v.object({
  name: v.string(),
  sets: v.number(),
  reps: v.number(),
  weight: v.number(),
});

export const create = mutation({
  args: {
    name: v.optional(v.string()),
    date: v.optional(v.number()),
    exercises: v.array(exerciseEntry),
  },
  handler: async (ctx, { name, date, exercises }) => {
    const user = await getCurrentUserOrThrow(ctx);
    requireAccess(user, Date.now());

    const cleaned = exercises
      .map((e) => ({
        name: e.name.trim(),
        sets: Math.max(0, Math.round(e.sets)),
        reps: Math.max(0, Math.round(e.reps)),
        weight: Math.max(0, e.weight),
      }))
      .filter((e) => e.name.length > 0);

    if (cleaned.length === 0) {
      throw new Error("Add at least one exercise");
    }

    return await ctx.db.insert("workouts", {
      userId: user._id,
      name: name?.trim() || "Workout",
      date: date ?? Date.now(),
      exercises: cleaned,
    });
  },
});

export const listForUser = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit ?? 100);
  },
});

export const getLast = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
  },
});

export const remove = mutation({
  args: { workoutId: v.id("workouts") },
  handler: async (ctx, { workoutId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const workout = await ctx.db.get(workoutId);
    if (!workout || workout.userId !== user._id) {
      throw new Error("Workout not found");
    }
    await ctx.db.delete(workoutId);
  },
});
