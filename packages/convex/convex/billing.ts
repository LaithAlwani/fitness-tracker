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

// Picks the Stripe price. Founder discount applies to YEARLY only, and only
// while spots remain. Monthly is always the regular price.
function priceFor(interval: "monthly" | "yearly", founder: boolean): string {
  let id: string | undefined;
  if (interval === "yearly") {
    id = founder
      ? process.env.STRIPE_PRICE_FOUNDER_YEARLY
      : process.env.STRIPE_PRICE_YEARLY;
  } else {
    id = process.env.STRIPE_PRICE_MONTHLY;
  }
  if (!id) throw new Error("Billing is not configured yet.");
  return id;
}

// Start (or continue) a subscription. If the user still has trial days left,
// the Stripe subscription's trial_end is set to match — no charge until then.
export const createCheckoutSession = action({
  args: {
    appUrl: v.string(),
    interval: v.union(v.literal("monthly"), v.literal("yearly")),
  },
  handler: async (ctx, { appUrl, interval }): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.me, {});
    if (!user) throw new Error("User not found");

    const fs = await ctx.runQuery(api.users.founderStatus, {});
    const founder = interval === "yearly" && fs.available;
    const priceId = priceFor(interval, founder);

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
        metadata: { clerkId: identity.subject, interval },
        ...(trialEnd ? { trial_end: trialEnd } : {}),
      },
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/subscribe`,
    });

    if (!session.url) throw new Error("Could not start checkout");
    return { url: session.url };
  },
});

// In-app cancellation — cancels at the end of the paid period (keeps access
// until then). The webhook reconciles; we also update optimistically.
export const cancelSubscription = action({
  args: {},
  handler: async (ctx): Promise<void> => {
    const user = await ctx.runQuery(api.users.me, {});
    if (!user?.stripeSubscriptionId) throw new Error("No active subscription.");
    const stripe = getStripe();
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    await ctx.runMutation(internal.billing.setCancelAtPeriodEnd, {
      userId: user._id,
      cancelAtPeriodEnd: true,
    });
  },
});

export const resumeSubscription = action({
  args: {},
  handler: async (ctx): Promise<void> => {
    const user = await ctx.runQuery(api.users.me, {});
    if (!user?.stripeSubscriptionId) throw new Error("No subscription.");
    const stripe = getStripe();
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
    await ctx.runMutation(internal.billing.setCancelAtPeriodEnd, {
      userId: user._id,
      cancelAtPeriodEnd: false,
    });
  },
});

export const setCancelAtPeriodEnd = internalMutation({
  args: { userId: v.id("users"), cancelAtPeriodEnd: v.boolean() },
  handler: async (ctx, { userId, cancelAtPeriodEnd }) => {
    await ctx.db.patch(userId, { cancelAtPeriodEnd });
  },
});

// In-app card update: start a SetupIntent the client confirms with Stripe
// Elements; then setDefaultPaymentMethod points future charges at the new card.
export const createSetupIntent = action({
  args: {},
  handler: async (ctx): Promise<{ clientSecret: string }> => {
    const user = await ctx.runQuery(api.users.me, {});
    if (!user) throw new Error("User not found");

    const stripe = getStripe();
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { clerkId: user.clerkId },
      });
      customerId = customer.id;
      await ctx.runMutation(internal.billing.setStripeCustomer, {
        userId: user._id,
        stripeCustomerId: customerId,
      });
    }

    const si = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });
    if (!si.client_secret) throw new Error("Could not start card setup");
    return { clientSecret: si.client_secret };
  },
});

export const setDefaultPaymentMethod = action({
  args: { paymentMethodId: v.string() },
  handler: async (ctx, { paymentMethodId }): Promise<void> => {
    const user = await ctx.runQuery(api.users.me, {});
    if (!user?.stripeCustomerId) throw new Error("No customer");
    const stripe = getStripe();
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    if (user.stripeSubscriptionId) {
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        default_payment_method: paymentMethodId,
      });
    }
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
    cancelAtPeriodEnd: v.optional(v.boolean()),
    isFounder: v.optional(v.boolean()),
    billingInterval: v.optional(
      v.union(v.literal("monthly"), v.literal("yearly")),
    ),
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
      ...(args.cancelAtPeriodEnd !== undefined
        ? { cancelAtPeriodEnd: args.cancelAtPeriodEnd }
        : {}),
      // Only ever SET founder true (claiming a spot) — never clear it.
      ...(args.isFounder ? { isFounder: true } : {}),
      ...(args.billingInterval
        ? { billingInterval: args.billingInterval }
        : {}),
    });
  },
});
