"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@liftify/convex";
import { CaretRight, ArrowsClockwise } from "@phosphor-icons/react";
import type { Doc } from "@liftify/convex/dataModel";

function monthKey(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
function dayDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function fmtDur(sec: number | undefined) {
  if (!sec || sec <= 0) return null;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export default function HistoryPage() {
  const workouts = useQuery(api.workouts.listForUser, { limit: 500 });

  // Group newest-first into [month, workouts[]] sections.
  const groups: { month: string; items: Doc<"workouts">[] }[] = [];
  if (workouts) {
    for (const w of workouts) {
      const m = monthKey(w.date);
      const last = groups[groups.length - 1];
      if (last && last.month === m) last.items.push(w);
      else groups.push({ month: m, items: [w] });
    }
  }

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tighter">History</h1>

      {workouts === undefined ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-border bg-muted"
            />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <div className="rounded-card border border-dashed border-border p-8 text-center text-muted-foreground">
          No workouts yet.{" "}
          <Link href="/workout/new" className="font-medium text-foreground underline">
            Log your first one.
          </Link>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.month} className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {group.month}
            </h2>
            <ul className="flex flex-col gap-2">
              {group.items.map((w) => (
                <li
                  key={w._id}
                  className="flex items-center gap-1 rounded-xl border border-border pr-3 transition-colors hover:border-accent-strong/40"
                >
                  <Link
                    href={`/workout/${w._id}`}
                    className="min-w-0 flex-1 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{w.name}</p>
                        <span className="text-xs text-muted-foreground/70">
                          {dayDate(w.date)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {w.exercises.map((e) => e.name).join(", ")}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground/70">
                        {w.exercises.length} exercises ·{" "}
                        {w.exercises.reduce((n, e) => n + e.sets.length, 0)} sets
                        {fmtDur(w.durationSec) ? ` · ${fmtDur(w.durationSec)}` : ""}
                      </p>
                    </div>
                  </Link>
                  <Link
                    href={`/workout/new?repeat=${w._id}`}
                    aria-label={`Repeat ${w.name}`}
                    title="Repeat this workout"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent-strong"
                  >
                    <ArrowsClockwise weight="bold" className="size-5" />
                  </Link>
                  <Link
                    href={`/workout/${w._id}`}
                    aria-label={`Open ${w.name}`}
                    className="shrink-0 text-muted-foreground"
                  >
                    <CaretRight className="size-5" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
