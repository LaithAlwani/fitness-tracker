"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@liftify/convex";
import { Check } from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui/button";

const FEATURES = [
  "Unlimited workout logging",
  "Unlimited body-journal entries",
  "Weekly volume & strength charts",
  "Body-weight & measurement trends",
];

export default function SubscribePage() {
  const access = useQuery(api.users.accessState, {});
  const status = access?.status;

  const trialDaysLeft =
    status === "trialing" && access?.trialEndsAt
      ? Math.max(0, Math.ceil((access.trialEndsAt - Date.now()) / 86_400_000))
      : null;

  return (
    <div className="container-page flex flex-col items-center gap-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tighter">
          Liftify Membership
        </h1>
        <p className="mt-2 text-muted-foreground">
          {status === "trialing"
            ? `You're on the free trial — ${trialDaysLeft} ${trialDaysLeft === 1 ? "day" : "days"} left.`
            : status === "active"
              ? "Your membership is active. Thanks for lifting with us."
              : "Start your 30-day free trial to unlock Liftify."}
        </p>
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

        <button
          disabled
          className={buttonClass("primary", "lg", "mt-8 w-full")}
          title="Stripe checkout is wired up once billing keys are added"
        >
          Subscribe — coming soon
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Checkout activates once Stripe billing is connected. Your trial keeps
          working in the meantime.
        </p>
      </div>

      {access?.hasAccess && (
        <Link href="/" className="text-sm font-medium text-muted-foreground underline">
          Back to the app
        </Link>
      )}
    </div>
  );
}
