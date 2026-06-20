import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getCurrentUser, hasAccess, TRIAL_MS } from "./model";

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
      units: "kg",
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
