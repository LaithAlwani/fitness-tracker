import { v } from "convex/values";

import {
  action,
  mutation,
  query,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getCurrentUser, getCurrentUserOrThrow } from "./model";

// Store / refresh a device's push subscription for the current user.
export const savePushSubscription = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, { endpoint, p256dh, auth }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { userId: user._id, p256dh, auth });
      return;
    }
    await ctx.db.insert("pushSubscriptions", {
      userId: user._id,
      endpoint,
      p256dh,
      auth,
      createdAt: Date.now(),
    });
  },
});

export const removePushSubscription = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const sub = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_endpoint", (q) => q.eq("endpoint", endpoint))
      .unique();
    if (sub) await ctx.db.delete(sub._id);
  },
});

// Whether the current user has at least one subscribed device.
export const pushEnabled = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return false;
    const subs = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(1);
    return subs.length > 0;
  },
});

// --- internal (used by the Node sender) ---
export const subsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const deleteSub = internalMutation({
  args: { id: v.id("pushSubscriptions") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

// Send a test push to the current user's devices.
export const sendTest = action({
  args: {},
  handler: async (ctx): Promise<void> => {
    const user = await ctx.runQuery(api.users.me, {});
    if (!user) throw new Error("Not signed in");
    await ctx.scheduler.runAfter(0, internal.pushSender.sendPush, {
      userId: user._id,
      title: "Liftify",
      body: "Push notifications are working 🎉",
      url: "/",
    });
  },
});
