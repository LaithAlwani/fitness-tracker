import { v } from "convex/values";

import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

import {
  XP_REWARDS,
  findTopSetByWeight,
  type SetSnapshot,
} from "@fitness/shared";

import {
  checkAchievements,
  grantXp,
  progressQuests,
  type GamificationOutcome,
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

// Lightweight summary of every finished session — used by the History tab.
// Returns date, plan day label, exercise count, duration, and total set
// count. Heavier "what sets exactly?" comes from getSession on tap.
export const listFinishedSessions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_started", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    const finished = sessions.filter((s) => s.finishedAt !== undefined);

    return await Promise.all(
      finished.map(async (session) => {
        const planDay = session.planDayId
          ? await ctx.db.get(session.planDayId)
          : null;
        const plan = planDay ? await ctx.db.get(planDay.planId) : null;

        const entries = await ctx.db
          .query("sessionEntries")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect();

        let totalSets = 0;
        let totalCardioLogs = 0;
        for (const entry of entries) {
          const sets = await ctx.db
            .query("sets")
            .withIndex("by_session_entry", (q) =>
              q.eq("sessionEntryId", entry._id),
            )
            .collect();
          totalSets += sets.length;
          const cardio = await ctx.db
            .query("cardioLogs")
            .withIndex("by_session_entry", (q) =>
              q.eq("sessionEntryId", entry._id),
            )
            .collect();
          totalCardioLogs += cardio.length;
        }

        return {
          _id: session._id,
          startedAt: session.startedAt,
          finishedAt: session.finishedAt!,
          durationSec: Math.round(
            (session.finishedAt! - session.startedAt) / 1000,
          ),
          planName: plan?.name,
          dayName: planDay?.name,
          exerciseCount: entries.length,
          totalSets,
          totalCardioLogs,
        };
      }),
    );
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
  handler: async (ctx, { sessionId }): Promise<GamificationOutcome> => {
    const session = await getOwnedSession(ctx, sessionId);

    // Idempotent — already-finished sessions just return a zero outcome.
    if (session.finishedAt !== undefined) {
      return {
        xpDelta: 0,
        totalXp: 0,
        newLevel: 1,
        leveledUp: false,
        questsCompleted: [],
        achievementsUnlocked: [],
      };
    }

    // Walk the session's entries to compute totals + identify PRs *before*
    // marking the session finished, so PR comparisons exclude this session.
    const entries = await ctx.db
      .query("sessionEntries")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();

    let totalSetsCompleted = 0;
    let hasCardio = false;
    type ExerciseTop = { exerciseId: Id<"exercises">; weight: number; reps: number };
    const exerciseTopByWeight = new Map<string, ExerciseTop>();

    for (const entry of entries) {
      const sets = await ctx.db
        .query("sets")
        .withIndex("by_session_entry", (q) =>
          q.eq("sessionEntryId", entry._id),
        )
        .collect();
      const completedSets = sets.filter((s) => s.completed);
      totalSetsCompleted += completedSets.length;

      const top = findTopSetByWeight(completedSets as SetSnapshot[]);
      if (top) {
        const existing = exerciseTopByWeight.get(entry.exerciseId);
        const isBetter =
          !existing ||
          top.weight > existing.weight ||
          (top.weight === existing.weight && top.reps > existing.reps);
        if (isBetter) {
          exerciseTopByWeight.set(entry.exerciseId, {
            exerciseId: entry.exerciseId,
            weight: top.weight,
            reps: top.reps,
          });
        }
      }

      const cardios = await ctx.db
        .query("cardioLogs")
        .withIndex("by_session_entry", (q) =>
          q.eq("sessionEntryId", entry._id),
        )
        .collect();
      if (cardios.length > 0) hasCardio = true;
    }

    // Mark finished now — subsequent reads will see the timestamp.
    await ctx.db.patch(sessionId, { finishedAt: Date.now() });

    // Don't reward empty sessions (user finished without logging anything).
    if (totalSetsCompleted === 0 && !hasCardio) {
      return {
        xpDelta: 0,
        totalXp: 0,
        newLevel: 1,
        leveledUp: false,
        questsCompleted: [],
        achievementsUnlocked: [],
      };
    }

    // Session base XP: bigger reward for following a plan day.
    const sessionXpAmount = session.planDayId
      ? XP_REWARDS.SESSION_PLANNED
      : XP_REWARDS.SESSION_FREEFORM;
    const sessionGrant = await grantXp(
      ctx,
      session.userId,
      "session_complete",
      sessionXpAmount,
      { sessionId },
    );

    // PR detection — for each exercise in the session, compare against the
    // user's all-time top weight in *previous* finished sessions. Exclude the
    // current session by checking each candidate session's _id.
    const prKeysGranted: Id<"exercises">[] = [];
    for (const [_, current] of exerciseTopByWeight) {
      const previousFinishedSessions = await ctx.db
        .query("sessions")
        .withIndex("by_user_started", (q) => q.eq("userId", session.userId))
        .collect();

      let previousBest: { weight: number; reps: number } | null = null;
      for (const prev of previousFinishedSessions) {
        if (prev._id === sessionId) continue;
        if (prev.finishedAt === undefined) continue;

        const prevEntries = await ctx.db
          .query("sessionEntries")
          .withIndex("by_session", (q) => q.eq("sessionId", prev._id))
          .collect();
        for (const prevEntry of prevEntries) {
          if (prevEntry.exerciseId !== current.exerciseId) continue;
          const prevSets = await ctx.db
            .query("sets")
            .withIndex("by_session_entry", (q) =>
              q.eq("sessionEntryId", prevEntry._id),
            )
            .collect();
          const prevTop = findTopSetByWeight(
            prevSets as SetSnapshot[],
          );
          if (!prevTop) continue;
          if (
            previousBest === null ||
            prevTop.weight > previousBest.weight ||
            (prevTop.weight === previousBest.weight &&
              prevTop.reps > previousBest.reps)
          ) {
            previousBest = { weight: prevTop.weight, reps: prevTop.reps };
          }
        }
      }

      const isPR =
        previousBest === null ||
        current.weight > previousBest.weight ||
        (current.weight === previousBest.weight &&
          current.reps > previousBest.reps);

      if (isPR) {
        await grantXp(
          ctx,
          session.userId,
          "pr",
          XP_REWARDS.PERSONAL_RECORD,
          { sessionId, extra: { exerciseId: current.exerciseId } },
        );
        await progressQuests(ctx, session.userId, { type: "pr_set" });
        prKeysGranted.push(current.exerciseId);
      }
    }

    // Quest event for finishing a session (advances train_3x / train_4x /
    // train_5x / log_cardio quests).
    const questOutcome = await progressQuests(ctx, session.userId, {
      type: "session_finished",
      isCardio: hasCardio,
    });

    // Now check for newly-unlocked achievements (uses the latest XP/level
    // and aggregated totals).
    const achievementsUnlocked = await checkAchievements(ctx, session.userId);

    // Read final stats so the celebration UI can show level / xp accurately.
    const finalStats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", session.userId))
      .unique();
    const totalXp = finalStats?.xp ?? sessionGrant.totalXp;
    const newLevel = finalStats?.level ?? sessionGrant.newLevel;

    // Approximate xpDelta: session base + each PR + each quest bonus + each
    // achievement bonus. We don't include the per-set XP that was granted
    // live during logSet calls (the XP bar already reflects those).
    const prXpTotal = prKeysGranted.length * XP_REWARDS.PERSONAL_RECORD;
    const questXp = questOutcome.questBonusXp;
    let achievementXp = 0;
    for (const key of achievementsUnlocked) {
      const def = (await ctx.db
        .query("xpEvents")
        .withIndex("by_user_occurred", (q) => q.eq("userId", session.userId))
        .order("desc")
        .take(50)).find(
        (event) =>
          event.type === "achievement" &&
          (event.meta as { achievementKey?: string } | undefined)
            ?.achievementKey === key,
      );
      achievementXp += def?.amount ?? 0;
    }

    return {
      xpDelta: sessionXpAmount + prXpTotal + questXp + achievementXp,
      totalXp,
      newLevel,
      leveledUp: newLevel > sessionGrant.newLevel - 1,
      questsCompleted: questOutcome.questsCompleted,
      achievementsUnlocked,
    };
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
    const { session } = await getOwnedEntry(ctx, sessionEntryId);

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

    const isCompleted = completed ?? true;
    const setId = await ctx.db.insert("sets", {
      sessionEntryId,
      setNumber: nextSetNumber,
      reps,
      weight,
      completed: isCompleted,
    });

    if (isCompleted) {
      // Per-set XP — small but ticks the XP bar live during a workout.
      await grantXp(
        ctx,
        session.userId,
        "set_logged",
        XP_REWARDS.SET_LOGGED,
      );
      // Volume / set-count quests advance per set logged.
      await progressQuests(ctx, session.userId, {
        type: "set_logged",
        weightKg: weight,
        reps,
      });
    }

    return setId;
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
