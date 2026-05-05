import { v } from "convex/values";

import {
  internalMutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

import {
  ACHIEVEMENT_KEYS,
  XP_REWARDS,
  calcSetVolume,
  evaluateAchievements,
  findAchievement,
  findQuest,
  getWeekStart,
  levelFromXp,
  levelProgress,
  pickWeeklyQuests,
  type AchievementKey,
  type QuestEvent,
  type QuestKey,
  type UserTotals,
} from "@fitness/shared";

// ----- Public queries -----

export const myStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const xp = stats?.xp ?? 0;
    const progress = levelProgress(xp);

    return {
      xp,
      level: progress.level,
      xpIntoLevel: progress.xpIntoLevel,
      xpForLevel: progress.xpForLevel,
      ratio: progress.ratio,
      lifetimeXp: stats?.lifetimeXp ?? 0,
    };
  },
});

export const myActiveQuests = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const weekStart = getWeekStart(Date.now());
    const activeKeys = pickWeeklyQuests(weekStart);

    const existingRows = await ctx.db
      .query("userQuests")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", user._id).eq("weekStart", weekStart),
      )
      .collect();
    const existingByKey = new Map(
      existingRows.map((row) => [row.questKey, row]),
    );

    return activeKeys
      .map((questKey) => {
        const def = findQuest(questKey);
        if (!def) return null;
        const row = existingByKey.get(questKey);
        return {
          questKey,
          name: def.name,
          description: def.description,
          icon: def.icon,
          target: def.target,
          progress: row?.progress ?? 0,
          completed: row?.completed ?? false,
        };
      })
      .filter((q): q is NonNullable<typeof q> => q !== null);
  },
});

export const myAchievements = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const unlockedRows = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const unlockedByKey = new Map(
      unlockedRows.map((row) => [row.achievementKey, row]),
    );

    return ACHIEVEMENT_KEYS.map((key) => {
      const def = findAchievement(key);
      if (!def) return null;
      const row = unlockedByKey.get(key);
      return {
        key,
        name: def.name,
        description: def.description,
        icon: def.icon,
        xpReward: def.xpReward,
        unlocked: Boolean(row),
        unlockedAt: row?.unlockedAt,
      };
    }).filter((a): a is NonNullable<typeof a> => a !== null);
  },
});

// ----- Internals (called by sessions/metrics mutations, not exposed publicly) -----

async function ensureUserStats(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"userStats">> {
  const existing = await ctx.db
    .query("userStats")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (existing) return existing;

  const id = await ctx.db.insert("userStats", {
    userId,
    xp: 0,
    level: 1,
    lifetimeXp: 0,
    updatedAt: Date.now(),
  });
  const row = await ctx.db.get(id);
  if (!row) throw new Error("userStats insert failed");
  return row;
}

export type GrantXpResult = {
  xpDelta: number;
  newLevel: number;
  leveledUp: boolean;
  totalXp: number;
};

async function grantXpInternal(
  ctx: MutationCtx,
  userId: Id<"users">,
  type:
    | "session_complete"
    | "set_logged"
    | "pr"
    | "metric_logged"
    | "quest_complete"
    | "achievement",
  amount: number,
  meta?: { sessionId?: Id<"sessions">; extra?: Record<string, unknown> },
): Promise<GrantXpResult> {
  if (amount <= 0) {
    const stats = await ensureUserStats(ctx, userId);
    return {
      xpDelta: 0,
      newLevel: stats.level,
      leveledUp: false,
      totalXp: stats.xp,
    };
  }

  const stats = await ensureUserStats(ctx, userId);
  const previousLevel = stats.level;
  const newXp = stats.xp + amount;
  const newLifetime = stats.lifetimeXp + amount;
  const newLevel = levelFromXp(newXp);

  await ctx.db.patch(stats._id, {
    xp: newXp,
    lifetimeXp: newLifetime,
    level: newLevel,
    updatedAt: Date.now(),
  });

  await ctx.db.insert("xpEvents", {
    userId,
    type,
    amount,
    sessionId: meta?.sessionId,
    meta: meta?.extra,
    occurredAt: Date.now(),
  });

  return {
    xpDelta: amount,
    newLevel,
    leveledUp: newLevel > previousLevel,
    totalXp: newXp,
  };
}

async function ensureWeeklyQuests(
  ctx: MutationCtx,
  userId: Id<"users">,
  weekStart: number,
): Promise<Doc<"userQuests">[]> {
  const existing = await ctx.db
    .query("userQuests")
    .withIndex("by_user_week", (q) =>
      q.eq("userId", userId).eq("weekStart", weekStart),
    )
    .collect();
  const existingKeys = new Set(existing.map((row) => row.questKey));

  const activeKeys = pickWeeklyQuests(weekStart);
  for (const questKey of activeKeys) {
    if (existingKeys.has(questKey)) continue;
    const def = findQuest(questKey);
    if (!def) continue;
    const id = await ctx.db.insert("userQuests", {
      userId,
      questKey,
      weekStart,
      progress: 0,
      target: def.target,
      completed: false,
    });
    const row = await ctx.db.get(id);
    if (row) existing.push(row);
  }
  return existing;
}

// Apply a user-event to all currently-active quests, return the keys of any
// quests that crossed completion as a result of *this* call (so the caller
// can grant the bonus XP only once).
async function progressQuestsInternal(
  ctx: MutationCtx,
  userId: Id<"users">,
  event: QuestEvent,
): Promise<QuestKey[]> {
  const weekStart = getWeekStart(Date.now());
  const rows = await ensureWeeklyQuests(ctx, userId, weekStart);
  const activeKeys = pickWeeklyQuests(weekStart);
  const newlyCompleted: QuestKey[] = [];

  for (const row of rows) {
    if (!activeKeys.includes(row.questKey as QuestKey)) continue;
    if (row.completed) continue;
    const def = findQuest(row.questKey);
    if (!def) continue;
    const increment = def.incrementOn(event);
    if (increment <= 0) continue;
    const newProgress = row.progress + increment;
    const completed = newProgress >= def.target;
    await ctx.db.patch(row._id, {
      progress: newProgress,
      completed,
      claimedAt: completed ? Date.now() : row.claimedAt,
    });
    if (completed) newlyCompleted.push(row.questKey as QuestKey);
  }

  return newlyCompleted;
}

// Walk the user's history and produce the totals achievement predicates need.
// On hot paths (per-set) this is wasteful — we only call it from finishSession
// and metrics.log, both of which are infrequent enough to make this OK for v1.
async function aggregateUserTotals(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<UserTotals> {
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_user_started", (q) => q.eq("userId", userId))
    .collect();
  const finished = sessions.filter((s) => s.finishedAt !== undefined);

  let totalSetsLogged = 0;
  let totalCardioWorkouts = 0;
  let largestSessionVolumeKg = 0;
  for (const session of finished) {
    const entries = await ctx.db
      .query("sessionEntries")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();
    let sessionVolume = 0;
    let hasCardioLog = false;
    for (const entry of entries) {
      const sets = await ctx.db
        .query("sets")
        .withIndex("by_session_entry", (q) =>
          q.eq("sessionEntryId", entry._id),
        )
        .collect();
      for (const set of sets) {
        if (set.completed) {
          totalSetsLogged += 1;
          sessionVolume += calcSetVolume(set.weight, set.reps);
        }
      }
      const cardioLogs = await ctx.db
        .query("cardioLogs")
        .withIndex("by_session_entry", (q) =>
          q.eq("sessionEntryId", entry._id),
        )
        .collect();
      if (cardioLogs.length > 0) hasCardioLog = true;
    }
    if (sessionVolume > largestSessionVolumeKg) {
      largestSessionVolumeKg = sessionVolume;
    }
    if (hasCardioLog) totalCardioWorkouts += 1;
  }

  const prEvents = await ctx.db
    .query("xpEvents")
    .withIndex("by_user_occurred", (q) => q.eq("userId", userId))
    .collect();
  const totalPRs = prEvents.filter((e) => e.type === "pr").length;

  const metrics = await ctx.db
    .query("bodyMetrics")
    .withIndex("by_user_recorded", (q) => q.eq("userId", userId))
    .collect();
  const totalBodyweightLogs = metrics.filter(
    (m) => m.bodyweight !== undefined,
  ).length;

  // Consecutive-quest-weeks streak — count completions back from the most
  // recent week. Stop at the first week with no completed quest.
  const allQuestRows = await ctx.db.query("userQuests").collect();
  const userQuestRows = allQuestRows.filter((q) => q.userId === userId);
  const weeksWithCompletion = new Set(
    userQuestRows
      .filter((row) => row.completed)
      .map((row) => row.weekStart),
  );
  const currentWeek = getWeekStart(Date.now());
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  let streak = 0;
  let cursor = currentWeek;
  while (weeksWithCompletion.has(cursor)) {
    streak += 1;
    cursor -= ONE_WEEK_MS;
  }
  // Also peek one week back if the current week hasn't completed yet —
  // it's the streak the user could continue.
  if (streak === 0 && weeksWithCompletion.has(currentWeek - ONE_WEEK_MS)) {
    let alt = 0;
    cursor = currentWeek - ONE_WEEK_MS;
    while (weeksWithCompletion.has(cursor)) {
      alt += 1;
      cursor -= ONE_WEEK_MS;
    }
    streak = alt;
  }

  // Per-exercise PR streak count — how many PRs has the most-PR'd exercise
  // accumulated. Approximated via xpEvents meta { exerciseId }.
  const prByExercise = new Map<string, number>();
  for (const event of prEvents) {
    if (event.type !== "pr") continue;
    const meta = event.meta as { exerciseId?: string } | undefined;
    if (!meta?.exerciseId) continue;
    prByExercise.set(
      meta.exerciseId,
      (prByExercise.get(meta.exerciseId) ?? 0) + 1,
    );
  }
  const longestPRStreakOnSingleExerciseCount =
    prByExercise.size === 0 ? 0 : Math.max(...prByExercise.values());

  return {
    totalWorkouts: finished.length,
    totalCardioWorkouts,
    totalSetsLogged,
    totalPRs,
    maxConsecutiveQuestWeeks: streak,
    totalBodyweightLogs,
    largestSessionVolumeKg,
    longestPRStreakOnSingleExerciseKg: 0,
    longestPRStreakOnSingleExerciseCount,
  };
}

async function checkAchievementsInternal(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<AchievementKey[]> {
  const stats = await ensureUserStats(ctx, userId);
  const totals = await aggregateUserTotals(ctx, userId);
  const eligible = evaluateAchievements(totals, stats.level);

  const existing = await ctx.db
    .query("userAchievements")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const alreadyUnlocked = new Set(existing.map((row) => row.achievementKey));

  const newlyUnlocked: AchievementKey[] = [];
  for (const key of eligible) {
    if (alreadyUnlocked.has(key)) continue;
    const def = findAchievement(key);
    if (!def) continue;
    await ctx.db.insert("userAchievements", {
      userId,
      achievementKey: key,
      unlockedAt: Date.now(),
    });
    await grantXpInternal(ctx, userId, "achievement", def.xpReward, {
      extra: { achievementKey: key },
    });
    newlyUnlocked.push(key);
  }

  return newlyUnlocked;
}

// ----- Exports for sessions.ts / metrics.ts -----

export type GamificationOutcome = {
  xpDelta: number;
  totalXp: number;
  newLevel: number;
  leveledUp: boolean;
  questsCompleted: QuestKey[];
  achievementsUnlocked: AchievementKey[];
};

const buildOutcome = (
  primary: GrantXpResult,
  questBonusTotal: number,
  questsCompleted: QuestKey[],
  achievementsUnlocked: AchievementKey[],
  finalStats: { totalXp: number; newLevel: number; leveledUp: boolean },
): GamificationOutcome => ({
  xpDelta: primary.xpDelta + questBonusTotal,
  totalXp: finalStats.totalXp,
  newLevel: finalStats.newLevel,
  leveledUp: finalStats.leveledUp,
  questsCompleted,
  achievementsUnlocked,
});

export async function grantXp(
  ctx: MutationCtx,
  userId: Id<"users">,
  type:
    | "session_complete"
    | "set_logged"
    | "pr"
    | "metric_logged"
    | "quest_complete"
    | "achievement",
  amount: number,
  meta?: { sessionId?: Id<"sessions">; extra?: Record<string, unknown> },
) {
  return grantXpInternal(ctx, userId, type, amount, meta);
}

export async function progressQuests(
  ctx: MutationCtx,
  userId: Id<"users">,
  event: QuestEvent,
): Promise<{ questsCompleted: QuestKey[]; questBonusXp: number }> {
  const completed = await progressQuestsInternal(ctx, userId, event);
  let questBonusXp = 0;
  for (const _key of completed) {
    const grant = await grantXpInternal(
      ctx,
      userId,
      "quest_complete",
      XP_REWARDS.QUEST_COMPLETED,
    );
    questBonusXp += grant.xpDelta;
  }
  return { questsCompleted: completed, questBonusXp };
}

export async function checkAchievements(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  return await checkAchievementsInternal(ctx, userId);
}

// Re-aggregation entry point for clients that need fresh stats after a sequence
// of mutations. Callable by tests or admin scripts.
export const recheckAchievements = internalMutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return;
    await checkAchievementsInternal(ctx, user._id);
  },
});

// Useful for clients to see the underlying totals (e.g. on the achievements
// screen). Read-only — no mutation side effects.
export const myTotals = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;
    // Reuse the helper — it doesn't write to the DB so safe in a query.
    // (TypeScript doesn't enforce that ctx is QueryCtx vs MutationCtx, but
    // the helper only calls .query/.collect/.get, no patches/inserts.)
    return await aggregateUserTotals(ctx as unknown as MutationCtx, user._id);
  },
});
