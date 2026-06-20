import { httpRouter } from "convex/server";
import Stripe from "stripe";

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

function mapStatus(
  s: Stripe.Subscription.Status,
): "trialing" | "active" | "past_due" | "canceled" | "none" {
  switch (s) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    default:
      return "none"; // incomplete
  }
}

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const sig = request.headers.get("stripe-signature");
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!sig || !secret || !key) {
      return new Response("Billing not configured", { status: 400 });
    }

    const body = await request.text();
    const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        sig,
        secret,
        undefined,
        Stripe.createSubtleCryptoProvider(),
      );
    } catch {
      return new Response("Invalid signature", { status: 400 });
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const status =
        event.type === "customer.subscription.deleted"
          ? "canceled"
          : mapStatus(sub.status);

      await ctx.runMutation(internal.billing.applySubscription, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        status,
        currentPeriodEnd: sub.current_period_end
          ? sub.current_period_end * 1000
          : undefined,
        trialEndsAt: sub.trial_end ? sub.trial_end * 1000 : undefined,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      });
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
