"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Flame,
  Plus,
  Barbell,
  Timer,
  Target,
  ChartBar,
  ClockCounterClockwise,
  Trophy,
  X,
} from "@phosphor-icons/react";
import { withBodyweight, type PR } from "@/lib/prs";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { buttonClass } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { CountUp } from "@/components/ui/count-up";
import { ProgressRing } from "@/components/ui/progress-ring";
import { BodyDiagram } from "@/components/body-diagram";
import { Onboarding } from "@/components/onboarding";
import { computeStreak } from "@/lib/streak";

const DAY = 86_400_000;
const DEFAULT_WEEKLY_GOAL = 4; // target workouts per week (until the user sets one)
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
  const me = useQuery(api.users.me, {});
  const exercises = useQuery(api.exercises.list, {});
  const latestBodyWeight = useQuery(api.bodyEntries.latestWeight, {});
  const latestBody = useQuery(api.bodyEntries.latest, {});
  const checkins = useQuery(api.checkins.listForUser, {});
  const logCheckin = useMutation(api.checkins.create);
  const [recoveryNote, setRecoveryNote] = useState<string | null>(null);

  const [hasDraft, setHasDraft] = useState(false);
  useEffect(() => {
    try {
      setHasDraft(!!localStorage.getItem("liftify:draft-workout"));
    } catch {
      /* ignore */
    }
  }, []);

  // Celebrate PRs handed off by the just-finished workout (one-shot).
  const [prCelebration, setPrCelebration] = useState<{
    unit: string;
    prs: PR[];
  } | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("liftify:new-prs");
      if (raw) {
        setPrCelebration(JSON.parse(raw));
        localStorage.removeItem("liftify:new-prs");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const unit = me?.units ?? "lb";
  const name = me?.firstName ?? "lifter";
  const weeklyGoal = me?.weeklyGoal ?? DEFAULT_WEEKLY_GOAL;

  // Fold body weight into bodyweight moves so volume reflects total load.
  const bwNames = useMemo(
    () =>
      new Set(
        (exercises ?? [])
          .filter((e) => e.equipment === "body only" && e.mechanic === "compound")
          .map((e) => e.name.toLowerCase()),
      ),
    [exercises],
  );
  const effBodyWeight = latestBodyWeight ?? me?.bodyWeight ?? 0;
  const loadWorkouts = useMemo(
    () => withBodyweight(workouts ?? [], bwNames, effBodyWeight),
    [workouts, bwNames, effBodyWeight],
  );

  const weekStart = startOfWeek(Date.now());
  const thisWeek = (workouts ?? []).filter((w) => w.date >= weekStart);
  const weekCount = thisWeek.length;
  const weekVolume = Math.round(
    loadWorkouts
      .filter((w) => w.date >= weekStart)
      .reduce((s, w) => s + workoutVolume(w), 0),
  );
  const weekSets = thisWeek.reduce(
    (s, w) => s + w.exercises.reduce((n, e) => n + e.sets.length, 0),
    0,
  );
  const weekTime = thisWeek.reduce((s, w) => s + (w.durationSec ?? 0), 0);
  // Streak counts workouts AND recovery check-ins (rest/cardio/stretch).
  const activeDates = [
    ...(workouts ?? []).map((w) => w.date),
    ...(checkins ?? []).map((c) => c.date),
  ];
  const streak = computeStreak(activeDates);
  // Already trained or logged recovery today? Then hide the streak-saver card.
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const activeToday = activeDates.some((d) => d >= todayStart);

  // Weekly activity — volume per day this week (Mon–Sun).
  const weekData = DAY_LABELS.map((label, i) => {
    const dayStart = weekStart + i * DAY;
    const dayEnd = dayStart + DAY;
    const vol = loadWorkouts
      .filter((w) => w.date >= dayStart && w.date < dayEnd)
      .reduce((s, w) => s + workoutVolume(w), 0);
    return { label, volume: Math.round(vol) };
  });

  async function logRecovery(type: "rest" | "cardio" | "stretching") {
    setRecoveryNote(null);
    try {
      await logCheckin({ type });
      setRecoveryNote("Logged — your streak is safe. 🔥");
    } catch {
      setRecoveryNote(null);
    }
  }

  // Hold the dashboard until the user row exists (avoids a "lifter" name flash)
  // and their workouts have loaded.
  if (!me || workouts === undefined) return <HomeSkeleton />;

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <Onboarding
        enabled={workouts.length === 0}
        defaultUnits={me.units}
        defaultGoal={me.weeklyGoal}
      />

      {prCelebration && prCelebration.prs.length > 0 && (
        <div className="relative overflow-hidden rounded-card border border-accent-strong/40 bg-accent/10 p-4">
          <button
            onClick={() => setPrCelebration(null)}
            aria-label="Dismiss"
            className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <div className="flex items-center gap-2 text-accent-strong">
            <Trophy weight="fill" className="size-5" />
            <span className="font-semibold tracking-tight">
              {prCelebration.prs.length === 1
                ? "New personal record!"
                : `${prCelebration.prs.length} new personal records!`}
            </span>
          </div>
          <ul className="mt-2 flex flex-col gap-1 pr-6 text-sm">
            {prCelebration.prs.map((pr) => (
              <li key={`${pr.name}-${pr.type}`}>
                <span className="font-medium">{pr.name}</span> —{" "}
                {pr.type === "reps"
                  ? `${pr.value} reps`
                  : `${pr.value} ${prCelebration.unit}${pr.type === "strength" ? " est. 1RM" : ""}`}{" "}
                <span className="text-muted-foreground">
                  (was {pr.previous})
                </span>
              </li>
            ))}
          </ul>
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
          value={<CountUp value={weekCount} />}
          sublabel="this week"
          icon={<Barbell weight="bold" className="size-4" />}
        />
        <StatCard
          label="Volume"
          value={
            <CountUp
              value={weekVolume}
              format={(n) => Math.round(n).toLocaleString()}
            />
          }
          sublabel={`${unit} this week`}
          icon={<ChartBar weight="bold" className="size-4" />}
        />
        <StatCard
          label="Time"
          value={<CountUp value={weekTime} format={fmtTime} />}
          sublabel="this week"
          icon={<Timer weight="bold" className="size-4" />}
        />
        <StatCard
          label="Streak"
          value={<CountUp value={streak} />}
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
            max={weeklyGoal}
            label={`${weekCount}/${weeklyGoal}`}
            sublabel="workouts"
          />
          <p className="text-center text-xs text-muted-foreground">
            {weekCount >= weeklyGoal
              ? "Goal smashed — nice work."
              : `${weeklyGoal - weekCount} to go this week`}
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

      {/* Body + recovery */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className={activeToday ? "lg:col-span-3" : "lg:col-span-2"}>
          <BodyDiagram
            weight={latestBody?.weight ?? null}
            unit={unit}
            measurements={latestBody?.measurements ?? null}
          />
        </div>
        {!activeToday && (
        <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Flame weight="fill" className="size-4 text-accent-strong" />
              Keep your streak
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Not lifting today? Log active recovery so your streak stays alive.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {(
              [
                { type: "rest", label: "Rest day" },
                { type: "cardio", label: "Cardio" },
                { type: "stretching", label: "Stretching" },
              ] as const
            ).map((r) => (
              <button
                key={r.type}
                onClick={() => logRecovery(r.type)}
                className="rounded-full border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:border-accent-strong/50 hover:bg-accent/5"
              >
                {r.label}
              </button>
            ))}
          </div>
          {recoveryNote && (
            <p className="text-xs font-medium text-accent-strong">
              {recoveryNote}
            </p>
          )}
        </section>
        )}
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

        {workouts.length > 0 ? (
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

function HomeSkeleton() {
  return (
    <div className="container-page flex animate-pulse flex-col gap-6 py-8">
      {/* Greeting */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-9 w-44 rounded-lg bg-muted" />
        </div>
        <div className="h-12 w-36 rounded-full bg-muted" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-card border border-border bg-muted"
          />
        ))}
      </div>

      {/* Goal + activity */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="h-64 rounded-card border border-border bg-muted" />
        <div className="h-64 rounded-card border border-border bg-muted lg:col-span-2" />
      </div>

      {/* Body + recovery */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="h-56 rounded-card border border-border bg-muted lg:col-span-2" />
        <div className="h-56 rounded-card border border-border bg-muted" />
      </div>

      {/* Recent */}
      <div className="flex flex-col gap-2">
        <div className="h-4 w-32 rounded bg-muted" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl border border-border bg-muted"
          />
        ))}
      </div>
    </div>
  );
}
