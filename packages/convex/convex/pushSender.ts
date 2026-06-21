"use node";

import { v } from "convex/values";
import webpush from "web-push";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Sends a web-push to every device the user has subscribed. Runs in Node so it
// can use the web-push library (VAPID signing + payload encryption).
export const sendPush = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, { userId, title, body, url }) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:hello@liftify.app";
    if (!publicKey || !privateKey) return;

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const subs = await ctx.runQuery(internal.push.subsForUser, { userId });
    const payload = JSON.stringify({ title, body, url: url ?? "/" });

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          // 404/410 = subscription gone; drop it.
          if (code === 404 || code === 410) {
            await ctx.runMutation(internal.push.deleteSub, { id: s._id });
          }
        }
      }),
    );
  },
});
