import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Liftify MVP schema — paid-only workout tracker.
//   users       account + billing/access state (one row per Clerk user)
//   exercises   seeded, read-only name library (for fast log autocomplete)
//   workouts    one row per logged workout, exercises embedded as an array
//   bodyEntries journal-style body log (weight + optional measurements)
// Streaks are derived client-side from workout dates — no extra table.

export const subscriptionStatus = v.union(
  v.literal("none"),
  v.literal("trialing"),
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled"),
);

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    units: v.union(v.literal("kg"), v.literal("lb")),

    // Billing / access. The whole app is gated on this (trialing | active = in).
    subscriptionStatus: subscriptionStatus,
    trialEndsAt: v.optional(v.number()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    isFounder: v.optional(v.boolean()), // claimed a first-100 lifetime price
    billingInterval: v.optional(
      v.union(v.literal("monthly"), v.literal("yearly")),
    ),
    lastWeighInWeek: v.optional(v.number()), // weekKey we last handled the weigh-in reminder

    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_founder", ["isFounder"]),

  exercises: defineTable({
    name: v.string(),
    muscleGroup: v.optional(v.string()),
    equipment: v.optional(v.string()),
  }).index("by_name", ["name"]),

  workouts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    date: v.number(), // epoch ms — when the workout happened
    durationSec: v.optional(v.number()), // how long the session took
    // Each exercise holds an ordered list of sets; weight can differ per set.
    exercises: v.array(
      v.object({
        name: v.string(),
        sets: v.array(
          v.object({
            reps: v.number(),
            weight: v.number(),
          }),
        ),
      }),
    ),
  }).index("by_user_date", ["userId", "date"]),

  bodyEntries: defineTable({
    userId: v.id("users"),
    date: v.number(),
    weight: v.number(),
    notes: v.optional(v.string()),
    measurements: v.optional(
      v.object({
        waist: v.optional(v.number()),
        chest: v.optional(v.number()),
        arms: v.optional(v.number()),
        hips: v.optional(v.number()),
        thighs: v.optional(v.number()),
      }),
    ),
  }).index("by_user_date", ["userId", "date"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(), // e.g. "body_weight_reminder"
    title: v.string(),
    body: v.string(),
    weekKey: v.optional(v.number()), // dedupe one-per-week reminders
    createdAt: v.number(),
    readAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_endpoint", ["endpoint"]),
});
