import Stripe from "stripe";
import { v } from "convex/values";

import { action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { subscriptionStatus } from "./schema";

// Runs in Convex's V8 runtime, so use fetch-based HTTP (no Node APIs).
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Billing is not configured yet.");
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
}

// Start (or continue) a subscription. If the user still has trial days left,
// the Stripe subscription's trial_end is set to match — no charge until then.
export const createCheckoutSession = action({
  args: { appUrl: v.string() },
  handler: async (ctx, { appUrl }): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) throw new Error("Billing is not configured yet.");

    const user = await ctx.runQuery(api.users.me, {});
    if (!user) throw new Error("User not found");

    const stripe = getStripe();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { clerkId: identity.subject },
      });
      customerId = customer.id;
      await ctx.runMutation(internal.billing.setStripeCustomer, {
        userId: user._id,
        stripeCustomerId: customerId,
      });
    }

    const trialEnd =
      user.trialEndsAt && user.trialEndsAt > Date.now()
        ? Math.floor(user.trialEndsAt / 1000)
        : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { clerkId: identity.subject },
        ...(trialEnd ? { trial_end: trialEnd } : {}),
      },
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/subscribe`,
    });

    if (!session.url) throw new Error("Could not start checkout");
    return { url: session.url };
  },
});

// Stripe-hosted billing portal to manage / cancel.
export const createPortalSession = action({
  args: { appUrl: v.string() },
  handler: async (ctx, { appUrl }): Promise<{ url: string }> => {
    const user = await ctx.runQuery(api.users.me, {});
    if (!user?.stripeCustomerId) {
      throw new Error("No subscription to manage yet.");
    }
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });
    return { url: session.url };
  },
});

export const setStripeCustomer = internalMutation({
  args: { userId: v.id("users"), stripeCustomerId: v.string() },
  handler: async (ctx, { userId, stripeCustomerId }) => {
    await ctx.db.patch(userId, { stripeCustomerId });
  },
});

// Called by the Stripe webhook to keep our user row in sync.
export const applySubscription = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    status: subscriptionStatus,
    currentPeriodEnd: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_stripe_customer", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId),
      )
      .unique();
    if (!user) return; // unknown customer — ignore

    await ctx.db.patch(user._id, {
      subscriptionStatus: args.status,
      stripeSubscriptionId:
        args.stripeSubscriptionId ?? user.stripeSubscriptionId,
      currentPeriodEnd: args.currentPeriodEnd ?? user.currentPeriodEnd,
      ...(args.trialEndsAt !== undefined ? { trialEndsAt: args.trialEndsAt } : {}),
    });
  },
});
