import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  getCurrentUser,
  getCurrentUserOrThrow,
  hasAccess,
  TRIAL_MS,
} from "./model";

// Called on first authenticated load. Creates the user row if missing and keeps
// the profile in sync with Clerk. New users start a no-card 30-day trial so the
// app is immediately usable; once Stripe is wired its webhook owns the status.
export const getOrCreateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      const patch: Partial<
        Pick<typeof existing, "firstName" | "lastName" | "email">
      > = {};
      if (identity.givenName && existing.firstName !== identity.givenName) {
        patch.firstName = identity.givenName;
      }
      if (identity.familyName && existing.lastName !== identity.familyName) {
        patch.lastName = identity.familyName;
      }
      if (identity.email && existing.email !== identity.email) {
        patch.email = identity.email;
      }
      if (Object.keys(patch).length > 0) await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email ?? "",
      firstName: identity.givenName ?? undefined,
      lastName: identity.familyName ?? undefined,
      units: "lb", // default; toggle to kg in settings later
      subscriptionStatus: "trialing",
      trialEndsAt: now + TRIAL_MS,
      createdAt: now,
    });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => getCurrentUser(ctx),
});

// Drives the (app) access gate.
export const accessState = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        authenticated: false,
        hasAccess: false,
        status: "none" as const,
        trialEndsAt: undefined as number | undefined,
      };
    }
    return {
      authenticated: true,
      hasAccess: hasAccess(user, Date.now()),
      status: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
    };
  },
});

export const setUnits = mutation({
  args: { units: v.union(v.literal("kg"), v.literal("lb")) },
  handler: async (ctx, { units }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User row missing");
    await ctx.db.patch(user._id, { units });
  },
});

// Wipes all of the current user's data + their user row. The Clerk account is
// deleted separately by the /api/delete-account route handler.
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOrThrow(ctx);

    const workouts = await ctx.db
      .query("workouts")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .collect();
    for (const w of workouts) await ctx.db.delete(w._id);

    const entries = await ctx.db
      .query("bodyEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .collect();
    for (const e of entries) await ctx.db.delete(e._id);

    const notes = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const n of notes) await ctx.db.delete(n._id);

    await ctx.db.delete(user._id);
  },
});
