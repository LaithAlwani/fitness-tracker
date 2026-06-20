"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@liftify/convex";
import { Flame, Plus, ClockCounterClockwise } from "@phosphor-icons/react";
import { buttonClass } from "@/components/ui/button";
import { computeStreak } from "@/lib/streak";

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function HomePage() {
  const workouts = useQuery(api.workouts.listForUser, { limit: 60 });
  const access = useQuery(api.users.accessState, {});
  const me = useQuery(api.users.me, {});

  const unit = me?.units ?? "kg";
  const streak = workouts ? computeStreak(workouts.map((w) => w.date)) : 0;
  const last = workouts?.[0];
  const trialDaysLeft =
    access?.status === "trialing" && access.trialEndsAt
      ? Math.max(0, Math.ceil((access.trialEndsAt - Date.now()) / 86_400_000))
      : null;

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      {trialDaysLeft !== null && (
        <div className="rounded-card border border-accent-strong/40 bg-accent/10 px-4 py-3 text-sm">
          <span className="font-medium">Free trial</span> — {trialDaysLeft}{" "}
          {trialDaysLeft === 1 ? "day" : "days"} left.{" "}
          <Link href="/subscribe" className="font-medium underline">
            See plans
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{formatDate(Date.now())}</p>
          <h1 className="text-3xl font-semibold tracking-tighter">Today</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium">
          <Flame
            weight="fill"
            className={streak > 0 ? "size-5 text-accent-strong" : "size-5 text-muted-foreground"}
          />
          {streak} day{streak === 1 ? "" : "s"}
        </div>
      </div>

      <Link href="/workout/new" className={buttonClass("primary", "lg", "w-full")}>
        <Plus weight="bold" className="size-5" />
        Start workout
      </Link>

      {/* Last workout */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Last workout
        </h2>
        {workouts === undefined ? (
          <div className="h-24 animate-pulse rounded-card border border-border bg-muted" />
        ) : last ? (
          <Link
            href="/progress"
            className="rounded-card border border-border bg-card p-5 transition-colors hover:border-accent-strong/40"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold tracking-tight">{last.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(last.date)}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {last.exercises.length} exercises ·{" "}
              {last.exercises.reduce((n, e) => n + e.sets, 0)} sets
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {last.exercises.slice(0, 4).map((e, i) => (
                <span
                  key={i}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {e.name}
                </span>
              ))}
              {last.exercises.length > 4 && (
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  +{last.exercises.length - 4}
                </span>
              )}
            </div>
          </Link>
        ) : (
          <div className="rounded-card border border-dashed border-border p-6 text-center text-muted-foreground">
            No workouts yet. Tap{" "}
            <span className="font-medium text-foreground">Start workout</span> to
            log your first one.
          </div>
        )}
      </section>

      {/* Recent */}
      {workouts && workouts.length > 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ClockCounterClockwise className="size-4" />
            Recent
          </h2>
          <ul className="flex flex-col gap-2">
            {workouts.slice(1, 10).map((w) => (
              <li
                key={w._id}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
              >
                <div>
                  <p className="font-medium">{w.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {w.exercises.length} exercises ·{" "}
                    {w.exercises.reduce((n, e) => n + e.sets, 0)} sets
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(w.date)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-xs text-muted-foreground">Weights in {unit}.</p>
    </div>
  );
}
