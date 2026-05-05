import { v } from "convex/values";

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

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

async function getOwnedPlan(
  ctx: QueryCtx | MutationCtx,
  planId: Id<"plans">,
): Promise<Doc<"plans">> {
  const user = await getCurrentUserOrThrow(ctx);
  const plan = await ctx.db.get(planId);
  if (!plan) throw new Error("Plan not found");
  if (plan.userId !== user._id) throw new Error("Not your plan");
  return plan;
}

async function getOwnedDay(
  ctx: QueryCtx | MutationCtx,
  planDayId: Id<"planDays">,
): Promise<{ day: Doc<"planDays">; plan: Doc<"plans"> }> {
  const day = await ctx.db.get(planDayId);
  if (!day) throw new Error("Day not found");
  const plan = await getOwnedPlan(ctx, day.planId);
  return { day, plan };
}

async function getOwnedPlanExercise(
  ctx: QueryCtx | MutationCtx,
  planExerciseId: Id<"planExercises">,
): Promise<{
  planExercise: Doc<"planExercises">;
  day: Doc<"planDays">;
  plan: Doc<"plans">;
}> {
  const planExercise = await ctx.db.get(planExerciseId);
  if (!planExercise) throw new Error("Exercise entry not found");
  const { day, plan } = await getOwnedDay(ctx, planExercise.planDayId);
  return { planExercise, day, plan };
}

// ----- Queries -----

export const listMyPlans = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const plans = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return plans
      .filter((plan) => !plan.archived)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getPlan = query({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const plan = await ctx.db.get(planId);
    if (!plan) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user || plan.userId !== user._id) return null;

    const allDays = await ctx.db
      .query("planDays")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();
    const days = allDays.sort((a, b) => a.order - b.order);

    const hydratedDays = await Promise.all(
      days.map(async (day) => {
        const planExercises = await ctx.db
          .query("planExercises")
          .withIndex("by_plan_day", (q) => q.eq("planDayId", day._id))
          .collect();
        const sortedPlanExercises = planExercises.sort(
          (a, b) => a.order - b.order,
        );
        const exercises = await Promise.all(
          sortedPlanExercises.map(async (planExercise) => {
            const exercise = await ctx.db.get(planExercise.exerciseId);
            return { ...planExercise, exercise };
          }),
        );
        return { ...day, exercises };
      }),
    );

    return { plan, days: hydratedDays };
  },
});

// Flat list of every (plan, day) pair the user has, used by the workout
// start picker so the user can tap straight into a specific day.
export const listAvailablePlanDays = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const plans = await ctx.db
      .query("plans")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const activePlans = plans
      .filter((plan) => !plan.archived)
      .sort((a, b) => b.createdAt - a.createdAt);

    const result: Array<{
      planId: Id<"plans">;
      planName: string;
      dayId: Id<"planDays">;
      dayName: string;
      exerciseCount: number;
    }> = [];

    for (const plan of activePlans) {
      const days = await ctx.db
        .query("planDays")
        .withIndex("by_plan", (q) => q.eq("planId", plan._id))
        .collect();
      const sortedDays = days.sort((a, b) => a.order - b.order);
      for (const day of sortedDays) {
        const planExercises = await ctx.db
          .query("planExercises")
          .withIndex("by_plan_day", (q) => q.eq("planDayId", day._id))
          .collect();
        result.push({
          planId: plan._id,
          planName: plan.name,
          dayId: day._id,
          dayName: day.name,
          exerciseCount: planExercises.length,
        });
      }
    }

    return result;
  },
});

// ----- Plan mutations -----

export const createPlan = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { name, description }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const trimmedName = name.trim();
    if (trimmedName.length === 0) throw new Error("Name is required");

    return await ctx.db.insert("plans", {
      userId: user._id,
      name: trimmedName,
      description: description?.trim() || undefined,
      archived: false,
      createdAt: Date.now(),
    });
  },
});

export const updatePlan = mutation({
  args: {
    planId: v.id("plans"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { planId, name, description }) => {
    await getOwnedPlan(ctx, planId);
    const patch: Partial<Doc<"plans">> = {};
    if (name !== undefined) {
      const trimmed = name.trim();
      if (trimmed.length === 0) throw new Error("Name cannot be empty");
      patch.name = trimmed;
    }
    if (description !== undefined) {
      patch.description = description.trim() || undefined;
    }
    await ctx.db.patch(planId, patch);
  },
});

export const archivePlan = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    await getOwnedPlan(ctx, planId);
    await ctx.db.patch(planId, { archived: true });
  },
});

export const deletePlan = mutation({
  args: { planId: v.id("plans") },
  handler: async (ctx, { planId }) => {
    const plan = await getOwnedPlan(ctx, planId);

    const days = await ctx.db
      .query("planDays")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();

    // Detach (don't delete) the user's past sessions that referenced any day
    // in this plan — the workout history stays valid, it just loses its link.
    const dayIds = new Set(days.map((day) => day._id));
    if (dayIds.size > 0) {
      const userSessions = await ctx.db
        .query("sessions")
        .withIndex("by_user_started", (q) => q.eq("userId", plan.userId))
        .collect();
      for (const session of userSessions) {
        if (session.planDayId && dayIds.has(session.planDayId)) {
          await ctx.db.patch(session._id, { planDayId: undefined });
        }
      }
    }

    for (const day of days) {
      const planExercises = await ctx.db
        .query("planExercises")
        .withIndex("by_plan_day", (q) => q.eq("planDayId", day._id))
        .collect();
      for (const planExercise of planExercises) {
        await ctx.db.delete(planExercise._id);
      }
      await ctx.db.delete(day._id);
    }

    await ctx.db.delete(planId);
  },
});

// ----- Day mutations -----

export const addDay = mutation({
  args: {
    planId: v.id("plans"),
    name: v.string(),
  },
  handler: async (ctx, { planId, name }) => {
    await getOwnedPlan(ctx, planId);
    const trimmedName = name.trim();
    if (trimmedName.length === 0) throw new Error("Day name is required");

    const existingDays = await ctx.db
      .query("planDays")
      .withIndex("by_plan", (q) => q.eq("planId", planId))
      .collect();
    const nextOrder =
      existingDays.length === 0
        ? 0
        : Math.max(...existingDays.map((d) => d.order)) + 1;

    return await ctx.db.insert("planDays", {
      planId,
      name: trimmedName,
      order: nextOrder,
    });
  },
});

export const updateDay = mutation({
  args: {
    planDayId: v.id("planDays"),
    name: v.string(),
  },
  handler: async (ctx, { planDayId, name }) => {
    await getOwnedDay(ctx, planDayId);
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new Error("Day name cannot be empty");
    await ctx.db.patch(planDayId, { name: trimmed });
  },
});

export const moveDay = mutation({
  args: {
    planDayId: v.id("planDays"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, { planDayId, direction }) => {
    const { day } = await getOwnedDay(ctx, planDayId);

    const siblings = await ctx.db
      .query("planDays")
      .withIndex("by_plan", (q) => q.eq("planId", day.planId))
      .collect();
    const sorted = siblings.sort((a, b) => a.order - b.order);
    const currentIndex = sorted.findIndex((sibling) => sibling._id === day._id);
    if (currentIndex === -1) return;

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const target = sorted[swapIndex];
    if (!target) return;

    await ctx.db.patch(day._id, { order: target.order });
    await ctx.db.patch(target._id, { order: day.order });
  },
});

export const removeDay = mutation({
  args: { planDayId: v.id("planDays") },
  handler: async (ctx, { planDayId }) => {
    await getOwnedDay(ctx, planDayId);
    const planExercises = await ctx.db
      .query("planExercises")
      .withIndex("by_plan_day", (q) => q.eq("planDayId", planDayId))
      .collect();
    for (const planExercise of planExercises) {
      await ctx.db.delete(planExercise._id);
    }
    await ctx.db.delete(planDayId);
  },
});

// ----- Exercise-on-day mutations -----

export const addExerciseToDay = mutation({
  args: {
    planDayId: v.id("planDays"),
    exerciseId: v.id("exercises"),
    targetSets: v.optional(v.number()),
    targetRepsMin: v.optional(v.number()),
    targetRepsMax: v.optional(v.number()),
    targetWeight: v.optional(v.number()),
    targetDurationSec: v.optional(v.number()),
    targetDistanceM: v.optional(v.number()),
  },
  handler: async (ctx, { planDayId, exerciseId, ...targets }) => {
    await getOwnedDay(ctx, planDayId);

    const exercise = await ctx.db.get(exerciseId);
    if (!exercise) throw new Error("Exercise not found");

    const existing = await ctx.db
      .query("planExercises")
      .withIndex("by_plan_day", (q) => q.eq("planDayId", planDayId))
      .collect();
    const nextOrder =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((e) => e.order)) + 1;

    return await ctx.db.insert("planExercises", {
      planDayId,
      exerciseId,
      order: nextOrder,
      ...targets,
    });
  },
});

export const updatePlanExercise = mutation({
  args: {
    planExerciseId: v.id("planExercises"),
    targetSets: v.optional(v.number()),
    targetRepsMin: v.optional(v.number()),
    targetRepsMax: v.optional(v.number()),
    targetWeight: v.optional(v.number()),
    targetDurationSec: v.optional(v.number()),
    targetDistanceM: v.optional(v.number()),
  },
  handler: async (ctx, { planExerciseId, ...patch }) => {
    await getOwnedPlanExercise(ctx, planExerciseId);
    await ctx.db.patch(planExerciseId, patch);
  },
});

export const movePlanExercise = mutation({
  args: {
    planExerciseId: v.id("planExercises"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  handler: async (ctx, { planExerciseId, direction }) => {
    const { planExercise } = await getOwnedPlanExercise(ctx, planExerciseId);

    const siblings = await ctx.db
      .query("planExercises")
      .withIndex("by_plan_day", (q) =>
        q.eq("planDayId", planExercise.planDayId),
      )
      .collect();
    const sorted = siblings.sort((a, b) => a.order - b.order);
    const currentIndex = sorted.findIndex(
      (sibling) => sibling._id === planExercise._id,
    );
    if (currentIndex === -1) return;

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const target = sorted[swapIndex];
    if (!target) return;

    await ctx.db.patch(planExercise._id, { order: target.order });
    await ctx.db.patch(target._id, { order: planExercise.order });
  },
});

export const removePlanExercise = mutation({
  args: { planExerciseId: v.id("planExercises") },
  handler: async (ctx, { planExerciseId }) => {
    await getOwnedPlanExercise(ctx, planExerciseId);
    await ctx.db.delete(planExerciseId);
  },
});
