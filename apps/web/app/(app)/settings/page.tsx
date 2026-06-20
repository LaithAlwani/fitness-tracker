"use client";

import Link from "next/link";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@liftify/convex";
import { SignOut, CaretRight } from "@phosphor-icons/react";

const UNITS = ["lb", "kg"] as const;

export default function SettingsPage() {
  const me = useQuery(api.users.me, {});
  const access = useQuery(api.users.accessState, {});
  const setUnits = useMutation(api.users.setUnits);
  const { user } = useUser();

  const unit = me?.units ?? "lb";

  const name =
    [me?.firstName, me?.lastName].filter(Boolean).join(" ") ||
    user?.fullName ||
    "—";
  const email =
    me?.email || user?.primaryEmailAddress?.emailAddress || "—";

  const trialDaysLeft =
    access?.status === "trialing" && access.trialEndsAt
      ? Math.max(0, Math.ceil((access.trialEndsAt - Date.now()) / 86_400_000))
      : null;
  const membership =
    access?.status === "trialing"
      ? `Free trial — ${trialDaysLeft} ${trialDaysLeft === 1 ? "day" : "days"} left`
      : access?.status === "active"
        ? "Active — $7.99/mo"
        : access?.status === "past_due"
          ? "Payment past due"
          : "No active plan";

  return (
    <div className="container-page flex max-w-xl flex-col gap-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tighter">Settings</h1>

      {/* Units */}
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="font-medium">Units</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Weight unit used across workouts and your body journal.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-border p-1">
          {UNITS.map((u) => (
            <button
              key={u}
              onClick={() => {
                if (u !== unit) setUnits({ units: u });
              }}
              className={`rounded-full px-6 py-2 text-sm font-medium uppercase transition-colors ${
                unit === u
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </section>

      {/* Account */}
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="font-medium">Account</h2>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="truncate font-medium">{name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="truncate font-medium">{email}</dd>
          </div>
        </dl>
      </section>

      {/* Membership */}
      <Link
        href="/subscribe"
        className="flex items-center justify-between rounded-card border border-border bg-card p-5 transition-colors hover:border-accent-strong/40"
      >
        <div>
          <h2 className="font-medium">Membership</h2>
          <p className="mt-1 text-sm text-muted-foreground">{membership}</p>
        </div>
        <CaretRight className="size-5 text-muted-foreground" />
      </Link>

      {/* Sign out */}
      <SignOutButton redirectUrl="/sign-in">
        <button className="flex items-center justify-center gap-2 self-start rounded-full border border-border px-5 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10">
          <SignOut className="size-4" />
          Sign out
        </button>
      </SignOutButton>
    </div>
  );
}
