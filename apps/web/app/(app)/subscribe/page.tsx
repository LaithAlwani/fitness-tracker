"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@liftify/convex";
import { Check, WarningCircle, Crown } from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui/button";
import { CardUpdate } from "@/components/card-update";

const FEATURES = [
  "Unlimited workout logging",
  "Unlimited body-journal entries",
  "Weekly volume & strength charts",
  "Body-weight & measurement trends",
];

type Interval = "monthly" | "yearly";

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function SubscribePage() {
  const access = useQuery(api.users.accessState, {});
  const me = useQuery(api.users.me, {});
  const founder = useQuery(api.users.founderStatus, {});
  const checkout = useAction(api.billing.createCheckoutSession);
  const changePlan = useAction(api.billing.changePlan);
  const cancelSub = useAction(api.billing.cancelSubscription);
  const resumeSub = useAction(api.billing.resumeSubscription);

  const [interval, setInterval] = useState<Interval>("yearly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const status = access?.status;
  const hasSubscription =
    !!me?.stripeSubscriptionId &&
    (status === "active" || status === "trialing");
  const renewMs = me?.currentPeriodEnd;
  const cancelling = !!me?.cancelAtPeriodEnd;
  const trialDaysLeft =
    status === "trialing" && access?.trialEndsAt
      ? Math.max(0, Math.ceil((access.trialEndsAt - Date.now()) / 86_400_000))
      : null;

  // Default the chooser to the user's current plan once it loads.
  const synced = useRef(false);
  useEffect(() => {
    if (!synced.current && me?.billingInterval) {
      setInterval(me.billingInterval);
      synced.current = true;
    }
  }, [me?.billingInterval]);

  // Founders keep $29.99/yr for life; others get it only while spots remain.
  const founderEligible =
    interval === "yearly" && (!!me?.isFounder || (founder?.available ?? false));
  const price =
    interval === "monthly" ? "$9.99" : founderEligible ? "$29.99" : "$99.99";
  const suffix = interval === "monthly" ? "/mo" : "/yr";
  const spotsLeft = founder ? Math.max(0, founder.target - founder.claimed) : null;
  const planName = me?.isFounder
    ? "Founder"
    : me?.billingInterval === "yearly"
      ? "Yearly"
      : me?.billingInterval === "monthly"
        ? "Monthly"
        : null;
  const isCurrentPlan = hasSubscription && me?.billingInterval === interval;

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await checkout({
        appUrl: window.location.origin,
        interval,
      });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  async function runManage(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setConfirmCancel(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const heading =
    status === "trialing"
      ? `You're on the free trial — ${trialDaysLeft} ${trialDaysLeft === 1 ? "day" : "days"} left.`
      : status === "active"
        ? `You're on the ${planName ?? "active"} plan.`
        : status === "past_due"
          ? "There was a problem with your last payment."
          : "Start your 30-day free trial to unlock Liftify.";

  return (
    <div className="container-page flex flex-col items-center gap-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tighter">
          Liftify Membership
        </h1>
        <p className="mt-2 text-muted-foreground">{heading}</p>
      </div>

      <div className="w-full max-w-md rounded-card border-2 border-accent-strong bg-card p-8 shadow-xl shadow-accent/10">
        {/* Interval chooser (also used to switch plans when subscribed) */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-border p-1">
            {(["monthly", "yearly"] as const).map((iv) => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={`rounded-full px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
                  interval === iv
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {iv}
              </button>
            ))}
          </div>
          {hasSubscription && isCurrentPlan && (
            <span className="text-xs font-medium text-muted-foreground">
              Current plan
            </span>
          )}
        </div>

        {founderEligible && (
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-strong">
            <Crown weight="fill" className="size-3.5" />
            Founder price — locked in for life
          </div>
        )}

        <p className="flex items-baseline gap-2">
          <span className="text-5xl font-semibold tracking-tighter">{price}</span>
          <span className="text-muted-foreground">{suffix}</span>
          {founderEligible && (
            <span className="text-lg text-muted-foreground line-through">
              $99.99
            </span>
          )}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {interval === "yearly" ? "Billed yearly — 2 months free." : "Billed monthly."}
          {!hasSubscription && " 30-day free trial."}
        </p>

        {/* Founder spots — shown when the offer is claimable */}
        {interval === "yearly" &&
          !me?.isFounder &&
          founder?.available &&
          spotsLeft !== null && (
            <p className="mt-2 text-xs font-medium text-accent-strong">
              Only {spotsLeft} founder {spotsLeft === 1 ? "spot" : "spots"} left
              of {founder.target}.
            </p>
          )}

        <ul className="mt-6 flex flex-col gap-3 text-sm">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <Check
                weight="bold"
                className="mt-0.5 size-4 shrink-0 text-accent-strong"
              />
              <span className="text-muted-foreground">{f}</span>
            </li>
          ))}
        </ul>

        {/* Primary action */}
        {!hasSubscription ? (
          <button
            onClick={startCheckout}
            disabled={busy}
            className={buttonClass("primary", "lg", "mt-8 w-full")}
          >
            {busy
              ? "Starting…"
              : status === "trialing"
                ? "Subscribe now"
                : "Start free trial"}
          </button>
        ) : isCurrentPlan ? (
          <button
            disabled
            className={buttonClass("secondary", "lg", "mt-8 w-full")}
          >
            Your current plan
          </button>
        ) : (
          <button
            onClick={() => runManage(() => changePlan({ interval }))}
            disabled={busy}
            className={buttonClass("primary", "lg", "mt-8 w-full")}
          >
            {busy
              ? "Switching…"
              : `Switch to ${interval} · ${price}${suffix}`}
          </button>
        )}

        {/* Management */}
        {hasSubscription && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm">
              {cancelling ? (
                <span>
                  {planName ? `${planName} · ` : ""}Ends on{" "}
                  <span className="font-medium text-foreground">
                    {renewMs ? fmtDate(renewMs) : "the period end"}
                  </span>
                  . You&apos;ll keep access until then.
                </span>
              ) : status === "trialing" ? (
                <span>
                  {planName ? `${planName} · ` : ""}Free trial — first charge on{" "}
                  <span className="font-medium text-foreground">
                    {renewMs ? fmtDate(renewMs) : "trial end"}
                  </span>
                  .
                </span>
              ) : (
                <span>
                  {planName ? `${planName} · ` : ""}Renews on{" "}
                  <span className="font-medium text-foreground">
                    {renewMs ? fmtDate(renewMs) : "the next period"}
                  </span>
                  .
                </span>
              )}
            </div>

            {cancelling ? (
              <button
                onClick={() => runManage(() => resumeSub({}))}
                disabled={busy}
                className={buttonClass("secondary", "md", "w-full")}
              >
                {busy ? "Working…" : "Resume membership"}
              </button>
            ) : (
              <button
                onClick={() => setConfirmCancel(true)}
                disabled={busy}
                className={buttonClass("ghost", "md", "w-full")}
              >
                Cancel membership
              </button>
            )}

            <button
              onClick={() => setShowCard((v) => !v)}
              className={buttonClass("ghost", "md", "w-full")}
            >
              {showCard ? "Close card form" : "Update payment method"}
            </button>
            {showCard && (
              <div className="rounded-xl border border-border p-4">
                <CardUpdate onClose={() => setShowCard(false)} />
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Cancel anytime. Secure payments by Stripe.
        </p>
      </div>

      {access?.hasAccess && (
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground underline"
        >
          Back to the app
        </Link>
      )}

      {confirmCancel && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => !busy && setConfirmCancel(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <WarningCircle weight="fill" className="size-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold tracking-tight">
                Cancel membership?
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You&apos;ll keep full access until{" "}
              {renewMs ? fmtDate(renewMs) : "the end of your billing period"}, then
              it won&apos;t renew. You can resume anytime before then.
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmCancel(false)}
                disabled={busy}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                Keep membership
              </button>
              <button
                onClick={() => runManage(() => cancelSub({}))}
                disabled={busy}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? "Cancelling…" : "Cancel membership"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
