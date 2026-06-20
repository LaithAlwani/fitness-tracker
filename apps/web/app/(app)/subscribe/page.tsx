"use client";

import Link from "next/link";
import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@liftify/convex";
import { Check, WarningCircle } from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui/button";
import { CardUpdate } from "@/components/card-update";

const FEATURES = [
  "Unlimited workout logging",
  "Unlimited body-journal entries",
  "Weekly volume & strength charts",
  "Body-weight & measurement trends",
];

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
  const checkout = useAction(api.billing.createCheckoutSession);
  const cancelSub = useAction(api.billing.cancelSubscription);
  const resumeSub = useAction(api.billing.resumeSubscription);

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

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await checkout({ appUrl: window.location.origin });
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
        ? "Your membership is active. Thanks for lifting with us."
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
        <p className="flex items-baseline gap-1">
          <span className="text-5xl font-semibold tracking-tighter">$7.99</span>
          <span className="text-muted-foreground">/ month</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Free for your first 30 days.
        </p>

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

        {hasSubscription ? (
          <div className="mt-8 flex flex-col gap-3">
            {/* Status line */}
            <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm">
              {cancelling ? (
                <span>
                  Your membership ends on{" "}
                  <span className="font-medium text-foreground">
                    {renewMs ? fmtDate(renewMs) : "the period end"}
                  </span>
                  . You&apos;ll keep access until then.
                </span>
              ) : status === "trialing" ? (
                <span>
                  Free trial — first charge on{" "}
                  <span className="font-medium text-foreground">
                    {renewMs ? fmtDate(renewMs) : "trial end"}
                  </span>
                  .
                </span>
              ) : (
                <span>
                  Renews on{" "}
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
                className={buttonClass("primary", "lg", "w-full")}
              >
                {busy ? "Working…" : "Resume membership"}
              </button>
            ) : (
              <button
                onClick={() => setConfirmCancel(true)}
                disabled={busy}
                className={buttonClass("secondary", "lg", "w-full")}
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
        ) : (
          <button
            onClick={startCheckout}
            disabled={busy}
            className={buttonClass("primary", "lg", "mt-8 w-full")}
          >
            {busy
              ? "Starting…"
              : status === "trialing"
                ? "Subscribe now"
                : "Start membership"}
          </button>
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
