import { v } from "convex/values";

import {
  query,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

import {
  calcSessionVolume,
  calcSetVolume,
  estimate1RM,
  findTopSetByOneRm,
  findTopSetByVolume,
  findTopSetByWeight,
  type SetSnapshot,
} from "@fitness/shared";

async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

// Distinct exercises the user has actually logged sets for, in finished
// sessions. Used to populate the progress-tab picker — only shows exercises
// that have data behind them.
export const listExercisesWithHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .collect();
    const finished = sessions.filter((s) => s.finishedAt !== undefined);

    const exerciseIds = new Set<Id<"exercises">>();
    for (const session of finished) {
      const entries = await ctx.db
        .query("sessionEntries")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const entry of entries) {
        const sets = await ctx.db
          .query("sets")
          .withIndex("by_session_entry", (q) =>
            q.eq("sessionEntryId", entry._id),
          )
          .collect();
        if (sets.some((s) => s.completed)) {
          exerciseIds.add(entry.exerciseId);
        }
      }
    }

    const exercises = await Promise.all(
      [...exerciseIds].map((id) => ctx.db.get(id)),
    );
    return exercises
      .filter((e): e is Doc<"exercises"> => e !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

// One data point per finished session, for the line chart. Each point is the
// "top set by weight" of that session, with derived volume and 1RM.
export const exerciseHistory = query({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, { exerciseId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .collect();
    const finished = sessions
      .filter((s) => s.finishedAt !== undefined)
      .sort((a, b) => a.startedAt - b.startedAt);

    const points: Array<{
      sessionId: Id<"sessions">;
      finishedAt: number;
      topWeight: number;
      topReps: number;
      topVolume: number;
      top1RM: number;
      sessionVolume: number;
    }> = [];

    for (const session of finished) {
      const entries = await ctx.db
        .query("sessionEntries")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      const matchingEntries = entries.filter(
        (entry) => entry.exerciseId === exerciseId,
      );
      if (matchingEntries.length === 0) continue;

      const allSets: SetSnapshot[] = [];
      for (const entry of matchingEntries) {
        const sets = await ctx.db
          .query("sets")
          .withIndex("by_session_entry", (q) =>
            q.eq("sessionEntryId", entry._id),
          )
          .collect();
        allSets.push(
          ...sets.map((s) => ({
            weight: s.weight,
            reps: s.reps,
            completed: s.completed,
          })),
        );
      }

      const topByWeight = findTopSetByWeight(allSets);
      if (!topByWeight) continue;

      points.push({
        sessionId: session._id,
        finishedAt: session.finishedAt!,
        topWeight: topByWeight.weight,
        topReps: topByWeight.reps,
        topVolume: calcSetVolume(topByWeight.weight, topByWeight.reps),
        top1RM: estimate1RM(topByWeight.weight, topByWeight.reps),
        sessionVolume: calcSessionVolume(allSets),
      });
    }

    return points;
  },
});

// Aggregate PRs across all finished sessions for an exercise.
export const personalRecords = query({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, { exerciseId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .collect();
    const finished = sessions.filter((s) => s.finishedAt !== undefined);

    let topByWeight: {
      weight: number;
      reps: number;
      sessionId: Id<"sessions">;
      finishedAt: number;
    } | null = null;
    let topBy1RM: {
      weight: number;
      reps: number;
      estimate1RM: number;
      sessionId: Id<"sessions">;
      finishedAt: number;
    } | null = null;
    let topByVolume: {
      weight: number;
      reps: number;
      volume: number;
      sessionId: Id<"sessions">;
      finishedAt: number;
    } | null = null;
    let topSessionVolume: {
      volume: number;
      sessionId: Id<"sessions">;
      finishedAt: number;
    } | null = null;

    for (const session of finished) {
      const entries = await ctx.db
        .query("sessionEntries")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      const matchingEntries = entries.filter(
        (entry) => entry.exerciseId === exerciseId,
      );
      if (matchingEntries.length === 0) continue;

      const allSets: SetSnapshot[] = [];
      for (const entry of matchingEntries) {
        const sets = await ctx.db
          .query("sets")
          .withIndex("by_session_entry", (q) =>
            q.eq("sessionEntryId", entry._id),
          )
          .collect();
        allSets.push(
          ...sets.map((s) => ({
            weight: s.weight,
            reps: s.reps,
            completed: s.completed,
          })),
        );
      }

      const byWeight = findTopSetByWeight(allSets);
      if (
        byWeight &&
        (topByWeight === null ||
          byWeight.weight > topByWeight.weight ||
          (byWeight.weight === topByWeight.weight &&
            byWeight.reps > topByWeight.reps))
      ) {
        topByWeight = {
          weight: byWeight.weight,
          reps: byWeight.reps,
          sessionId: session._id,
          finishedAt: session.finishedAt!,
        };
      }

      const by1RM = findTopSetByOneRm(allSets);
      if (by1RM) {
        const estimate = estimate1RM(by1RM.weight, by1RM.reps);
        if (topBy1RM === null || estimate > topBy1RM.estimate1RM) {
          topBy1RM = {
            weight: by1RM.weight,
            reps: by1RM.reps,
            estimate1RM: estimate,
            sessionId: session._id,
            finishedAt: session.finishedAt!,
          };
        }
      }

      const byVolume = findTopSetByVolume(allSets);
      if (byVolume) {
        const setVolume = calcSetVolume(byVolume.weight, byVolume.reps);
        if (topByVolume === null || setVolume > topByVolume.volume) {
          topByVolume = {
            weight: byVolume.weight,
            reps: byVolume.reps,
            volume: setVolume,
            sessionId: session._id,
            finishedAt: session.finishedAt!,
          };
        }
      }

      const sessionVolume = calcSessionVolume(allSets);
      if (
        sessionVolume > 0 &&
        (topSessionVolume === null || sessionVolume > topSessionVolume.volume)
      ) {
        topSessionVolume = {
          volume: sessionVolume,
          sessionId: session._id,
          finishedAt: session.finishedAt!,
        };
      }
    }

    return { topByWeight, topBy1RM, topByVolume, topSessionVolume };
  },
});
