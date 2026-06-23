"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@liftify/convex";
import {
  Flame,
  Plus,
  Barbell,
  Timer,
  Target,
  ChartBar,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { buttonClass } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { computeStreak } from "@/lib/streak";

const DAY = 86_400_000;
const WEEKLY_GOAL = 4; // target workouts per week
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeek(ms: number) {
  const d = new Date(ms);
  const fromMonday = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  return d.getTime() - fromMonday * DAY;
}
function workoutVolume(w: { exercises: { sets: { reps: number; weight: number }[] }[] }) {
  return w.exercises.reduce(
    (s, e) => s + e.sets.reduce((ss, set) => ss + set.reps * set.weight, 0),
    0,
  );
}
function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function fmtTime(sec: number) {
  if (sec <= 0) return "—";
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
}

export default function HomePage() {
  const workouts = useQuery(api.workouts.listForUser, { limit: 120 });
  const access = useQuery(api.users.accessState, {});
  const me = useQuery(api.users.me, {});

  const [hasDraft, setHasDraft] = useState(false);
  useEffect(() => {
    try {
      setHasDraft(!!localStorage.getItem("liftify:draft-workout"));
    } catch {
      /* ignore */
    }
  }, []);

  const unit = me?.units ?? "lb";
  const name = me?.firstName ?? "lifter";

  const weekStart = startOfWeek(Date.now());
  const thisWeek = (workouts ?? []).filter((w) => w.date >= weekStart);
  const weekCount = thisWeek.length;
  const weekVolume = Math.round(thisWeek.reduce((s, w) => s + workoutVolume(w), 0));
  const weekSets = thisWeek.reduce(
    (s, w) => s + w.exercises.reduce((n, e) => n + e.sets.length, 0),
    0,
  );
  const weekTime = thisWeek.reduce((s, w) => s + (w.durationSec ?? 0), 0);
  const streak = workouts ? computeStreak(workouts.map((w) => w.date)) : 0;

  // Weekly activity — volume per day this week (Mon–Sun).
  const weekData = DAY_LABELS.map((label, i) => {
    const dayStart = weekStart + i * DAY;
    const dayEnd = dayStart + DAY;
    const vol = (workouts ?? [])
      .filter((w) => w.date >= dayStart && w.date < dayEnd)
      .reduce((s, w) => s + workoutVolume(w), 0);
    return { label, volume: Math.round(vol) };
  });

  const trialDaysLeft =
    access?.status === "trialing" && access.trialEndsAt
      ? Math.max(0, Math.ceil((access.trialEndsAt - Date.now()) / 86_400_000))
      : null;

  const loading = workouts === undefined;

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

      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl">
            {name}
          </h1>
        </div>
        <Link
          href="/workout/new"
          className={buttonClass("primary", "lg")}
        >
          <Plus weight="bold" className="size-5" />
          {hasDraft ? "Resume workout" : "Start workout"}
        </Link>
      </div>

      {/* Stat cards — this week */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Workouts"
          value={loading ? "—" : String(weekCount)}
          sublabel="this week"
          icon={<Barbell weight="bold" className="size-4" />}
        />
        <StatCard
          label="Volume"
          value={loading ? "—" : weekVolume.toLocaleString()}
          sublabel={`${unit} this week`}
          icon={<ChartBar weight="bold" className="size-4" />}
        />
        <StatCard
          label="Time"
          value={loading ? "—" : fmtTime(weekTime)}
          sublabel="this week"
          icon={<Timer weight="bold" className="size-4" />}
        />
        <StatCard
          label="Streak"
          value={loading ? "—" : String(streak)}
          sublabel={streak === 1 ? "day" : "days"}
          icon={<Flame weight="fill" className="size-4" />}
        />
      </div>

      {/* Weekly goal + activity */}
      <div className="grid gap-3 lg:grid-cols-3">
        <section className="flex flex-col items-center justify-center gap-3 rounded-card border border-border bg-card p-5">
          <div className="flex w-full items-center gap-2 text-sm font-medium text-muted-foreground">
            <Target weight="bold" className="size-4 text-accent-strong" />
            Weekly goal
          </div>
          <ProgressRing
            value={weekCount}
            max={WEEKLY_GOAL}
            label={`${weekCount}/${WEEKLY_GOAL}`}
            sublabel="workouts"
          />
          <p className="text-center text-xs text-muted-foreground">
            {weekCount >= WEEKLY_GOAL
              ? "Goal smashed — nice work."
              : `${WEEKLY_GOAL - weekCount} to go this week`}
          </p>
        </section>

        <section className="rounded-card border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Weekly activity
          </h2>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="volume" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Recent */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ClockCounterClockwise className="size-4" />
            Recent workouts
          </h2>
          {workouts && workouts.length > 0 && (
            <Link
              href="/history"
              className="text-sm font-medium text-accent-strong hover:underline"
            >
              See all
            </Link>
          )}
        </div>

        {loading ? (
          <div className="h-20 animate-pulse rounded-card border border-border bg-muted" />
        ) : workouts && workouts.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {workouts.slice(0, 6).map((w) => (
              <li key={w._id}>
                <Link
                  href={`/workout/${w._id}`}
                  className="block rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-accent-strong/40"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{w.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {fmtDate(w.date)}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {w.exercises.map((e) => e.name).join(", ")}
                  </p>
                  {w.durationSec ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/70">
                      <Timer className="size-3.5" />
                      {fmtTime(w.durationSec)}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-card border border-dashed border-border p-6 text-center text-muted-foreground">
            No workouts yet. Tap{" "}
            <span className="font-medium text-foreground">Start workout</span> to
            log your first one.
          </div>
        )}
      </section>
    </div>
  );
}
