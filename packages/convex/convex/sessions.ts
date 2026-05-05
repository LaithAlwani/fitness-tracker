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

async function getOwnedSession(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">,
): Promise<Doc<"sessions">> {
  const user = await getCurrentUserOrThrow(ctx);
  const session = await ctx.db.get(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.userId !== user._id) throw new Error("Not your session");
  return session;
}

async function getOwnedEntry(
  ctx: QueryCtx | MutationCtx,
  entryId: Id<"sessionEntries">,
): Promise<{ entry: Doc<"sessionEntries">; session: Doc<"sessions"> }> {
  const entry = await ctx.db.get(entryId);
  if (!entry) throw new Error("Session entry not found");
  const session = await getOwnedSession(ctx, entry.sessionId);
  return { entry, session };
}

async function getOwnedSet(
  ctx: QueryCtx | MutationCtx,
  setId: Id<"sets">,
): Promise<{
  set: Doc<"sets">;
  entry: Doc<"sessionEntries">;
  session: Doc<"sessions">;
}> {
  const set = await ctx.db.get(setId);
  if (!set) throw new Error("Set not found");
  const { entry, session } = await getOwnedEntry(ctx, set.sessionEntryId);
  return { set, entry, session };
}

async function getOwnedCardio(
  ctx: QueryCtx | MutationCtx,
  cardioLogId: Id<"cardioLogs">,
): Promise<{
  cardio: Doc<"cardioLogs">;
  entry: Doc<"sessionEntries">;
  session: Doc<"sessions">;
}> {
  const cardio = await ctx.db.get(cardioLogId);
  if (!cardio) throw new Error("Cardio log not found");
  const { entry, session } = await getOwnedEntry(ctx, cardio.sessionEntryId);
  return { cardio, entry, session };
}

// ----- Queries -----

export const getActiveSession = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return sessions.find((session) => session.finishedAt === undefined) ?? null;
  },
});

export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== user._id) return null;

    const planDay = session.planDayId
      ? await ctx.db.get(session.planDayId)
      : null;
    const plan = planDay ? await ctx.db.get(planDay.planId) : null;

    const entries = await ctx.db
      .query("sessionEntries")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    const sortedEntries = entries.sort((a, b) => a.order - b.order);

    const hydratedEntries = await Promise.all(
      sortedEntries.map(async (entry) => {
        const exercise = await ctx.db.get(entry.exerciseId);
        const sets = await ctx.db
          .query("sets")
          .withIndex("by_session_entry", (q) =>
            q.eq("sessionEntryId", entry._id),
          )
          .collect();
        const cardioLogs = await ctx.db
          .query("cardioLogs")
          .withIndex("by_session_entry", (q) =>
            q.eq("sessionEntryId", entry._id),
          )
          .collect();
        return {
          ...entry,
          exercise,
          sets: sets.sort((a, b) => a.setNumber - b.setNumber),
          cardioLogs,
        };
      }),
    );

    return { session, planDay, plan, entries: hydratedEntries };
  },
});

// ----- Session mutations -----

export const startSession = mutation({
  args: {
    planDayId: v.optional(v.id("planDays")),
  },
  handler: async (ctx, { planDayId }) => {
    const user = await getCurrentUserOrThrow(ctx);

    // Refuse to create a second session if one is already in progress.
    const existing = await ctx.db
      .query("sessions")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    const active = existing.find((s) => s.finishedAt === undefined);
    if (active) {
      return active._id;
    }

    let validPlanDayId: Id<"planDays"> | undefined;
    let planExercises: Doc<"planExercises">[] = [];
    if (planDayId) {
      const planDay = await ctx.db.get(planDayId);
      if (!planDay) throw new Error("Day not found");
      const plan = await ctx.db.get(planDay.planId);
      if (!plan || plan.userId !== user._id) {
        throw new Error("Not your plan day");
      }
      validPlanDayId = planDayId;
      const collected = await ctx.db
        .query("planExercises")
        .withIndex("by_plan_day", (q) => q.eq("planDayId", planDayId))
        .collect();
      planExercises = collected.sort((a, b) => a.order - b.order);
    }

    const sessionId = await ctx.db.insert("sessions", {
      userId: user._id,
      planDayId: validPlanDayId,
      startedAt: Date.now(),
    });

    for (let index = 0; index < planExercises.length; index += 1) {
      const planExercise = planExercises[index];
      if (!planExercise) continue;
      await ctx.db.insert("sessionEntries", {
        sessionId,
        exerciseId: planExercise.exerciseId,
        order: index,
      });
    }

    return sessionId;
  },
});

export const finishSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await getOwnedSession(ctx, sessionId);
    await ctx.db.patch(sessionId, { finishedAt: Date.now() });
  },
});

export const cancelSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await getOwnedSession(ctx, sessionId);

    const entries = await ctx.db
      .query("sessionEntries")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    for (const entry of entries) {
      const sets = await ctx.db
        .query("sets")
        .withIndex("by_session_entry", (q) =>
          q.eq("sessionEntryId", entry._id),
        )
        .collect();
      for (const set of sets) {
        await ctx.db.delete(set._id);
      }
      const cardioLogs = await ctx.db
        .query("cardioLogs")
        .withIndex("by_session_entry", (q) =>
          q.eq("sessionEntryId", entry._id),
        )
        .collect();
      for (const cardio of cardioLogs) {
        await ctx.db.delete(cardio._id);
      }
      await ctx.db.delete(entry._id);
    }

    await ctx.db.delete(sessionId);
  },
});

export const updateSessionNotes = mutation({
  args: {
    sessionId: v.id("sessions"),
    notes: v.string(),
  },
  handler: async (ctx, { sessionId, notes }) => {
    await getOwnedSession(ctx, sessionId);
    const trimmed = notes.trim();
    await ctx.db.patch(sessionId, {
      notes: trimmed.length === 0 ? undefined : trimmed,
    });
  },
});

// ----- Session entry mutations -----

export const addEntry = mutation({
  args: {
    sessionId: v.id("sessions"),
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, { sessionId, exerciseId }) => {
    await getOwnedSession(ctx, sessionId);

    const exercise = await ctx.db.get(exerciseId);
    if (!exercise) throw new Error("Exercise not found");

    const existing = await ctx.db
      .query("sessionEntries")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    const nextOrder =
      existing.length === 0
        ? 0
        : Math.max(...existing.map((e) => e.order)) + 1;

    return await ctx.db.insert("sessionEntries", {
      sessionId,
      exerciseId,
      order: nextOrder,
    });
  },
});

export const removeEntry = mutation({
  args: { sessionEntryId: v.id("sessionEntries") },
  handler: async (ctx, { sessionEntryId }) => {
    await getOwnedEntry(ctx, sessionEntryId);

    const sets = await ctx.db
      .query("sets")
      .withIndex("by_session_entry", (q) =>
        q.eq("sessionEntryId", sessionEntryId),
      )
      .collect();
    for (const set of sets) {
      await ctx.db.delete(set._id);
    }

    const cardioLogs = await ctx.db
      .query("cardioLogs")
      .withIndex("by_session_entry", (q) =>
        q.eq("sessionEntryId", sessionEntryId),
      )
      .collect();
    for (const cardio of cardioLogs) {
      await ctx.db.delete(cardio._id);
    }

    await ctx.db.delete(sessionEntryId);
  },
});

// ----- Set mutations -----

export const logSet = mutation({
  args: {
    sessionEntryId: v.id("sessionEntries"),
    reps: v.number(),
    weight: v.number(),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, { sessionEntryId, reps, weight, completed }) => {
    await getOwnedEntry(ctx, sessionEntryId);

    const existing = await ctx.db
      .query("sets")
      .withIndex("by_session_entry", (q) =>
        q.eq("sessionEntryId", sessionEntryId),
      )
      .collect();
    const nextSetNumber =
      existing.length === 0
        ? 1
        : Math.max(...existing.map((s) => s.setNumber)) + 1;

    return await ctx.db.insert("sets", {
      sessionEntryId,
      setNumber: nextSetNumber,
      reps,
      weight,
      completed: completed ?? true,
    });
  },
});

export const updateSet = mutation({
  args: {
    setId: v.id("sets"),
    reps: v.optional(v.number()),
    weight: v.optional(v.number()),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, { setId, reps, weight, completed }) => {
    await getOwnedSet(ctx, setId);
    const patch: Partial<Doc<"sets">> = {};
    if (reps !== undefined) patch.reps = reps;
    if (weight !== undefined) patch.weight = weight;
    if (completed !== undefined) patch.completed = completed;
    await ctx.db.patch(setId, patch);
  },
});

export const removeSet = mutation({
  args: { setId: v.id("sets") },
  handler: async (ctx, { setId }) => {
    await getOwnedSet(ctx, setId);
    await ctx.db.delete(setId);
  },
});

// ----- Cardio mutations -----

export const logCardio = mutation({
  args: {
    sessionEntryId: v.id("sessionEntries"),
    durationSec: v.number(),
    distanceM: v.optional(v.number()),
    avgHr: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { sessionEntryId, durationSec, distanceM, avgHr },
  ) => {
    await getOwnedEntry(ctx, sessionEntryId);

    return await ctx.db.insert("cardioLogs", {
      sessionEntryId,
      durationSec,
      distanceM,
      avgHr,
      source: "manual",
    });
  },
});

export const updateCardio = mutation({
  args: {
    cardioLogId: v.id("cardioLogs"),
    durationSec: v.optional(v.number()),
    distanceM: v.optional(v.number()),
    avgHr: v.optional(v.number()),
  },
  handler: async (ctx, { cardioLogId, durationSec, distanceM, avgHr }) => {
    await getOwnedCardio(ctx, cardioLogId);
    const patch: Partial<Doc<"cardioLogs">> = {};
    if (durationSec !== undefined) patch.durationSec = durationSec;
    if (distanceM !== undefined) patch.distanceM = distanceM;
    if (avgHr !== undefined) patch.avgHr = avgHr;
    await ctx.db.patch(cardioLogId, patch);
  },
});

export const removeCardio = mutation({
  args: { cardioLogId: v.id("cardioLogs") },
  handler: async (ctx, { cardioLogId }) => {
    await getOwnedCardio(ctx, cardioLogId);
    await ctx.db.delete(cardioLogId);
  },
});
