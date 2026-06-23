"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser, useClerk, SignOutButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@liftify/convex";
import {
  SignOut,
  CaretRight,
  TrashSimple,
  WarningCircle,
  Minus,
  Plus,
} from "@phosphor-icons/react";
import { PushToggle } from "@/components/push-toggle";
import { Button } from "@/components/ui/button";

const UNITS = ["lb", "kg"] as const;

function fmtRest(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}:${String(s).padStart(2, "0")}` : `${m} min`;
}

function Stepper({
  value,
  onDec,
  onInc,
}: {
  value: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border p-1">
      <button
        onClick={onDec}
        aria-label="Decrease"
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Minus weight="bold" className="size-4" />
      </button>
      <span className="min-w-14 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        onClick={onInc}
        aria-label="Increase"
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Plus weight="bold" className="size-4" />
      </button>
    </div>
  );
}

type FontSize = "sm" | "base" | "lg";
const FONT_SIZES: { key: FontSize; label: string; px: string }[] = [
  { key: "sm", label: "Small", px: "14px" },
  { key: "base", label: "Regular", px: "16px" },
  { key: "lg", label: "Large", px: "18px" },
];

export default function SettingsPage() {
  const me = useQuery(api.users.me, {});
  const access = useQuery(api.users.accessState, {});
  const setUnits = useMutation(api.users.setUnits);
  const setPrefs = useMutation(api.users.setPreferences);
  const deleteData = useMutation(api.users.deleteAccount);
  const { user } = useUser();
  const { signOut } = useClerk();

  // Training prefs — seeded from the server, updated optimistically.
  const [goal, setGoal] = useState(4);
  const [rest, setRest] = useState(90);
  const [bw, setBw] = useState(0);
  useEffect(() => {
    if (me?.weeklyGoal) setGoal(me.weeklyGoal);
  }, [me?.weeklyGoal]);
  useEffect(() => {
    if (me?.restSeconds) setRest(me.restSeconds);
  }, [me?.restSeconds]);
  useEffect(() => {
    if (me?.bodyWeight) setBw(me.bodyWeight);
  }, [me?.bodyWeight]);
  function changeGoal(n: number) {
    const v = Math.min(14, Math.max(1, n));
    setGoal(v);
    setPrefs({ weeklyGoal: v });
  }
  function changeRest(n: number) {
    const v = Math.min(600, Math.max(15, n));
    setRest(v);
    setPrefs({ restSeconds: v });
  }
  function commitBw() {
    const v = Math.max(0, Math.round(bw * 10) / 10);
    setBw(v);
    setPrefs({ bodyWeight: v });
  }

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [fontSize, setFontSize] = useState<FontSize>("base");
  useEffect(() => {
    try {
      const s = localStorage.getItem("liftify:font-size");
      if (s === "sm" || s === "base" || s === "lg") setFontSize(s);
    } catch {
      /* ignore */
    }
  }, []);
  function applyFontSize(key: FontSize) {
    setFontSize(key);
    const px = FONT_SIZES.find((f) => f.key === key)?.px ?? "16px";
    try {
      localStorage.setItem("liftify:font-size", key);
    } catch {
      /* ignore */
    }
    document.documentElement.style.fontSize = px;
  }

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
  const planLabel =
    me?.billingInterval === "yearly"
      ? me?.isFounder
        ? "Founder · $29.99/yr"
        : "Yearly · $99.99/yr"
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
  const planAmount =
    me?.billingInterval === "yearly"
      ? me?.isFounder
        ? "$29.99"
        : "$99.99"
      : me?.billingInterval === "monthly"
        ? "$9.99"
        : null;
  const amountSuffix = planAmount ? ` · ${planAmount}` : "";
  const hasPaidSub = !!me?.stripeSubscriptionId;
  const billingLine =
    cancelling && renewMs
      ? `Ends ${fmtDate(renewMs)}`
      : hasPaidSub && renewMs
        ? `Next payment ${fmtDate(renewMs)}${amountSuffix}`
        : !hasPaidSub && access?.status === "trialing" && access.trialEndsAt
          ? `Trial ends ${fmtDate(access.trialEndsAt)}`
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

      {/* Text size */}
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="font-medium">Text size</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Adjust how large text appears across the app.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-border p-1">
          {FONT_SIZES.map((f) => (
            <button
              key={f.key}
              onClick={() => applyFontSize(f.key)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                fontSize === f.key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Training */}
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="font-medium">Training</h2>
        <div className="mt-4 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Weekly goal</p>
              <p className="text-xs text-muted-foreground">
                Target workouts per week.
              </p>
            </div>
            <Stepper
              value={`${goal}`}
              onDec={() => changeGoal(goal - 1)}
              onInc={() => changeGoal(goal + 1)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Default rest timer</p>
              <p className="text-xs text-muted-foreground">
                Starts automatically when you finish a set.
              </p>
            </div>
            <Stepper
              value={fmtRest(rest)}
              onDec={() => changeRest(rest - 15)}
              onInc={() => changeRest(rest + 15)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Body weight</p>
              <p className="text-xs text-muted-foreground">
                Adds your weight to bodyweight moves (pull-ups, dips…) so volume
                and PRs reflect total load.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={bw || ""}
                onChange={(e) => setBw(Number(e.target.value) || 0)}
                onBlur={commitBw}
                placeholder="0"
                aria-label="Body weight"
                className="h-9 w-20 rounded-full border border-border bg-background px-3 text-center text-sm font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-sm font-medium uppercase text-muted-foreground">
                {unit}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Push reminders */}
      <PushToggle />

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
        <Button
          variant="danger-outline"
          onClick={() => {
            setDeleteError(null);
            setConfirmDelete(true);
          }}
          className="mt-4"
        >
          <TrashSimple className="size-4" />
          Delete account
        </Button>
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
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
