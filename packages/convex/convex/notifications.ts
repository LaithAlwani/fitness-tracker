import {
  mutation,
  query,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { getCurrentUser, getCurrentUserOrThrow } from "./model";

const DAY = 86_400_000;

function startOfWeek(ms: number): number {
  const d = new Date(ms);
  const fromMonday = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  return d.getTime() - fromMonday * DAY;
}

// Create this week's body-weight reminder unless it exists already, or the user
// has already logged a body entry this week.
// Returns true if a reminder notification was created (so the caller can push).
async function ensureWeeklyFor(
  ctx: MutationCtx,
  user: Doc<"users">,
): Promise<boolean> {
  const now = Date.now();
  const weekKey = startOfWeek(now);

  // One reminder per week, tracked on the user so it never regenerates after
  // being read/cleared this week (and isn't recreated if they delete it).
  if (user.lastWeighInWeek === weekKey) return false;

  const latestEntry = await ctx.db
    .query("bodyEntries")
    .withIndex("by_user_date", (q) => q.eq("userId", user._id))
    .order("desc")
    .first();
  if (latestEntry && latestEntry.date >= weekKey) {
    // already weighed in — mark handled, no reminder needed
    await ctx.db.patch(user._id, { lastWeighInWeek: weekKey });
    return false;
  }

  await ctx.db.insert("notifications", {
    userId: user._id,
    type: "body_weight_reminder",
    title: "Weekly weigh-in",
    body: "Log your body weight to keep your progress up to date.",
    weekKey,
    createdAt: now,
  });
  await ctx.db.patch(user._id, { lastWeighInWeek: weekKey });
  return true;
}

export const ensureWeekly = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (user) await ensureWeeklyFor(ctx, user);
  },
});

export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return items.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return items.filter((n) => n.readAt === undefined).length;
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);
    const now = Date.now();
    const items = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const n of items) {
      if (n.readAt !== undefined) {
        // Already read in a previous session — clear it for good.
        await ctx.db.delete(n._id);
      } else {
        // Mark currently-shown ones read (badge clears now; they clear next open).
        await ctx.db.patch(n._id, { readAt: now });
      }
    }
  },
});

// Cron entry point — weekly reminder for every user who wants it.
export const ensureWeeklyForAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      if (u.remindWeighIn === false) continue; // opted out
      const created = await ensureWeeklyFor(ctx, u);
      if (created) {
        await ctx.scheduler.runAfter(0, internal.pushSender.sendPush, {
          userId: u._id,
          title: "Weekly weigh-in",
          body: "Log your body weight to keep your progress up to date.",
          url: "/body",
        });
      }
    }
  },
});

// Daily "move today" nudge — once per day, only if the user hasn't logged a
// workout or a recovery check-in today, and hasn't opted out.
async function ensureDailyFor(
  ctx: MutationCtx,
  user: Doc<"users">,
): Promise<boolean> {
  const now = Date.now();
  const dayStart = startOfDay(now);
  if (user.lastExerciseReminderDay === dayStart) return false;

  const workedOut = await ctx.db
    .query("workouts")
    .withIndex("by_user_date", (q) =>
      q.eq("userId", user._id).gte("date", dayStart),
    )
    .first();
  const checkedIn = await ctx.db
    .query("checkins")
    .withIndex("by_user_date", (q) =>
      q.eq("userId", user._id).gte("date", dayStart),
    )
    .first();
  await ctx.db.patch(user._id, { lastExerciseReminderDay: dayStart });
  if (workedOut || checkedIn) return false; // already active today

  await ctx.db.insert("notifications", {
    userId: user._id,
    type: "daily_exercise_reminder",
    title: "Time to move",
    body: "Log a workout — or a rest, cardio, or stretch day to keep your streak.",
    createdAt: now,
  });
  return true;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const ensureDailyForAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      if (u.remindExercise === false) continue; // opted out
      const created = await ensureDailyFor(ctx, u);
      if (created) {
        await ctx.scheduler.runAfter(0, internal.pushSender.sendPush, {
          userId: u._id,
          title: "Time to move 💪",
          body: "Log a workout — or a rest/cardio/stretch day to keep your streak.",
          url: "/",
        });
      }
    }
  },
});
