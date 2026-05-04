import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    units: v.union(v.literal("kg"), v.literal("lb")),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  exercises: defineTable({
    userId: v.optional(v.id("users")),
    name: v.string(),
    category: v.union(v.literal("strength"), v.literal("cardio")),
    muscleGroup: v.optional(v.string()),
    equipment: v.optional(v.string()),
    archived: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_category", ["category"]),

  plans: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    archived: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  planDays: defineTable({
    planId: v.id("plans"),
    name: v.string(),
    order: v.number(),
  }).index("by_plan", ["planId"]),

  planExercises: defineTable({
    planDayId: v.id("planDays"),
    exerciseId: v.id("exercises"),
    order: v.number(),
    targetSets: v.optional(v.number()),
    targetRepsMin: v.optional(v.number()),
    targetRepsMax: v.optional(v.number()),
    targetWeight: v.optional(v.number()),
    targetDurationSec: v.optional(v.number()),
    targetDistanceM: v.optional(v.number()),
  }).index("by_plan_day", ["planDayId"]),

  sessions: defineTable({
    userId: v.id("users"),
    planDayId: v.optional(v.id("planDays")),
    startedAt: v.number(),
    finishedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  }).index("by_user_started", ["userId", "startedAt"]),

  sessionEntries: defineTable({
    sessionId: v.id("sessions"),
    exerciseId: v.id("exercises"),
    order: v.number(),
  }).index("by_session", ["sessionId"]),

  sets: defineTable({
    sessionEntryId: v.id("sessionEntries"),
    setNumber: v.number(),
    reps: v.number(),
    weight: v.number(),
    completed: v.boolean(),
  }).index("by_session_entry", ["sessionEntryId"]),

  cardioLogs: defineTable({
    sessionEntryId: v.id("sessionEntries"),
    durationSec: v.number(),
    distanceM: v.optional(v.number()),
    avgHr: v.optional(v.number()),
    source: v.union(
      v.literal("manual"),
      v.literal("healthkit"),
      v.literal("googlefit"),
    ),
    externalId: v.optional(v.string()),
  }).index("by_session_entry", ["sessionEntryId"]),

  bodyMetrics: defineTable({
    userId: v.id("users"),
    recordedAt: v.number(),
    bodyweight: v.optional(v.number()),
    measurements: v.optional(
      v.object({
        chest: v.optional(v.number()),
        waist: v.optional(v.number()),
        hips: v.optional(v.number()),
        thigh: v.optional(v.number()),
        arm: v.optional(v.number()),
      }),
    ),
    bodyFatPct: v.optional(v.number()),
    source: v.union(
      v.literal("manual"),
      v.literal("healthkit"),
      v.literal("googlefit"),
    ),
    externalId: v.optional(v.string()),
  }).index("by_user_recorded", ["userId", "recordedAt"]),

  userStats: defineTable({
    userId: v.id("users"),
    xp: v.number(),
    level: v.number(),
    lifetimeXp: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  xpEvents: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("session_complete"),
      v.literal("set_logged"),
      v.literal("pr"),
      v.literal("metric_logged"),
      v.literal("quest_complete"),
      v.literal("achievement"),
    ),
    amount: v.number(),
    sessionId: v.optional(v.id("sessions")),
    meta: v.optional(v.any()),
    occurredAt: v.number(),
  }).index("by_user_occurred", ["userId", "occurredAt"]),

  userAchievements: defineTable({
    userId: v.id("users"),
    achievementKey: v.string(),
    unlockedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_key", ["userId", "achievementKey"]),

  userQuests: defineTable({
    userId: v.id("users"),
    questKey: v.string(),
    weekStart: v.number(),
    progress: v.number(),
    target: v.number(),
    completed: v.boolean(),
    claimedAt: v.optional(v.number()),
  })
    .index("by_user_week", ["userId", "weekStart"])
    .index("by_user_week_key", ["userId", "weekStart", "questKey"]),
});
