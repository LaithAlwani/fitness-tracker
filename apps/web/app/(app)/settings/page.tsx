"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser, useClerk, SignOutButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@liftify/convex";
import {
  SignOut,
  CaretRight,
  TrashSimple,
  WarningCircle,
} from "@phosphor-icons/react";

const UNITS = ["lb", "kg"] as const;

export default function SettingsPage() {
  const me = useQuery(api.users.me, {});
  const access = useQuery(api.users.accessState, {});
  const setUnits = useMutation(api.users.setUnits);
  const deleteData = useMutation(api.users.deleteAccount);
  const { user } = useUser();
  const { signOut } = useClerk();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteData({}); // wipe Convex data while still authenticated
      const res = await fetch("/api/delete-account", { method: "POST" });
      if (!res.ok) throw new Error("Could not delete your account.");
      await signOut({ redirectUrl: "/sign-in" }); // removes Clerk session
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete account.");
      setDeleting(false);
    }
  }

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
  const planLabel = me?.isFounder
    ? "Founder · $29.99/yr"
    : me?.billingInterval === "yearly"
      ? "Yearly · $99.99/yr"
      : me?.billingInterval === "monthly"
        ? "Monthly · $9.99/mo"
        : null;

  const membership =
    access?.status === "trialing"
      ? `Free trial — ${trialDaysLeft} ${trialDaysLeft === 1 ? "day" : "days"} left${planLabel ? ` · ${planLabel}` : ""}`
      : access?.status === "active"
        ? planLabel
          ? `Active · ${planLabel}`
          : "Active"
        : access?.status === "past_due"
          ? "Payment past due"
          : "No active plan";

  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const renewMs = me?.currentPeriodEnd;
  const cancelling = !!me?.cancelAtPeriodEnd;
  const billingLine =
    access?.status === "active" && renewMs
      ? `${cancelling ? "Ends" : "Next billing"} ${fmtDate(renewMs)}`
      : access?.status === "trialing" && access.trialEndsAt
        ? `${me?.stripeSubscriptionId && renewMs ? `First charge ${fmtDate(renewMs)}` : `Trial ends ${fmtDate(access.trialEndsAt)}`}`
        : null;

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
          {billingLine && (
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              {billingLine}
            </p>
          )}
        </div>
        <CaretRight className="size-5 text-muted-foreground" />
      </Link>

      {/* Sign out */}
      <SignOutButton redirectUrl="/sign-in">
        <button className="flex items-center justify-center gap-2 self-start rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted">
          <SignOut className="size-4" />
          Sign out
        </button>
      </SignOutButton>

      {/* Danger zone */}
      <section className="rounded-card border border-red-500/30 bg-card p-5">
        <h2 className="font-medium text-red-600">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete your account and all your workouts and body data.
          This can&apos;t be undone.
        </p>
        <button
          onClick={() => {
            setDeleteError(null);
            setConfirmDelete(true);
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-500/40 px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10"
        >
          <TrashSimple className="size-4" />
          Delete account
        </button>
      </section>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => !deleting && setConfirmDelete(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-red-600">
              <WarningCircle weight="fill" className="size-5" />
              <h2 className="text-lg font-semibold tracking-tight">
                Delete account?
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This permanently deletes your Liftify login and every workout and
              body entry you&apos;ve logged. This cannot be undone.
            </p>
            {deleteError && (
              <p className="mt-3 text-sm text-red-600">{deleteError}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
