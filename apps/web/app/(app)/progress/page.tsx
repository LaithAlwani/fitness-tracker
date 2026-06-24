"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@liftify/convex";
import { loggedExercises, exerciseSeries, withBodyweight } from "@/lib/prs";
import { CountUp } from "@/components/ui/count-up";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Info,
  Barbell,
  Flame,
  CalendarCheck,
  Target,
  Timer,
  CaretDown,
} from "@phosphor-icons/react";
import { StatCard } from "@/components/ui/stat-card";
import { Heatmap } from "@/components/ui/heatmap";
import { computeStreak } from "@/lib/streak";

const DAY = 86_400_000;

function startOfWeek(ms: number) {
  const d = new Date(ms);
  const dayFromMonday = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  return d.getTime() - dayFromMonday * DAY;
}
function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function weekLabel(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
function fmtDur(sec: number) {
  if (sec <= 0) return "—";
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

const axisTick = { fontSize: 12, fill: "var(--muted-foreground)" };
const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 13,
};

export default function ProgressPage() {
  const me = useQuery(api.users.me, {});
  const workouts = useQuery(api.workouts.listForUser, { limit: 300 });
  const exercises = useQuery(api.exercises.list, {});
  const latestBodyWeight = useQuery(api.bodyEntries.latestWeight, {});
  const checkins = useQuery(api.checkins.listForUser, {});
  const unit = me?.units ?? "lb";

  const recoveryDays = new Set(
    (checkins ?? []).map((c) => startOfDay(c.date)),
  );

  // Fold body weight into bodyweight moves so volume / 1RM reflect total load.
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

  const WEEKS = 8;
  let weeks: { label: string; count: number; volume: number }[] = [];
  if (workouts) {
    const thisWeek = startOfWeek(Date.now());
    const buckets = new Map<number, { count: number; volume: number }>();
    for (let i = WEEKS - 1; i >= 0; i--) {
      buckets.set(thisWeek - i * 7 * DAY, { count: 0, volume: 0 });
    }
    for (const w of loadWorkouts) {
      const b = buckets.get(startOfWeek(w.date));
      if (!b) continue;
      b.count += 1;
      b.volume += w.exercises.reduce(
        (s, e) =>
          s + e.sets.reduce((ss, set) => ss + set.reps * set.weight, 0),
        0,
      );
    }
    weeks = [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([k, v]) => ({
        label: weekLabel(k),
        count: v.count,
        volume: Math.round(v.volume),
      }));
  }

  const total = workouts?.length ?? 0;
  const hasData = total > 0;
  const streak = workouts ? computeStreak(workouts.map((w) => w.date)) : 0;
  const thisWeekStart = startOfWeek(Date.now());
  const thisWeekCount = (workouts ?? []).filter(
    (w) => w.date >= thisWeekStart,
  ).length;
  const avgPerWeek = (
    weeks.reduce((s, w) => s + w.count, 0) / WEEKS
  ).toFixed(1);
  const dayValues = new Map<number, number>();
  for (const w of workouts ?? []) {
    const k = startOfDay(w.date);
    dayValues.set(k, (dayValues.get(k) ?? 0) + 1);
  }
  const durations = (workouts ?? [])
    .map((w) => w.durationSec ?? 0)
    .filter((d) => d > 0);
  const avgDurationSec = durations.length
    ? durations.reduce((s, d) => s + d, 0) / durations.length
    : 0;

  // Per-exercise progress (estimated 1RM over time).
  const exerciseOptions = loggedExercises(workouts ?? []);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  useEffect(() => {
    if (selectedExercise === null && exerciseOptions.length > 0) {
      setSelectedExercise(exerciseOptions[0].name);
    }
  }, [selectedExercise, exerciseOptions]);
  const series = selectedExercise
    ? exerciseSeries(loadWorkouts, selectedExercise)
    : [];
  // Pure bodyweight moves never log weight → no est. 1RM; track reps instead.
  // If a move is ever loaded (plates/belt), chart est. 1RM and drop any
  // bodyweight-only sessions so they don't show as a misleading 0.
  const bodyweight = series.length > 0 && series.every((p) => p.e1rm === 0);
  const seriesData = (bodyweight
    ? series.map((p) => ({ label: weekLabel(p.date), value: p.reps }))
    : series
        .filter((p) => p.e1rm > 0)
        .map((p) => ({ label: weekLabel(p.date), value: p.e1rm }))
  );

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tighter">Progress</h1>

      {workouts === undefined ? (
        <ProgressSkeleton />
      ) : !hasData ? (
        <div className="rounded-card border border-dashed border-border p-8 text-center text-muted-foreground">
          Log a few workouts and your charts will fill in here.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Total workouts"
              value={<CountUp value={total} />}
              icon={<Barbell weight="bold" className="size-4" />}
            />
            <StatCard
              label="This week"
              value={<CountUp value={thisWeekCount} />}
              icon={<CalendarCheck weight="bold" className="size-4" />}
            />
            <StatCard
              label="Streak"
              value={<CountUp value={streak} />}
              sublabel={streak === 1 ? "day" : "days"}
              icon={<Flame weight="fill" className="size-4" />}
            />
            <StatCard
              label="Avg / week"
              value={
                <CountUp
                  value={Number(avgPerWeek)}
                  format={(n) => n.toFixed(1)}
                />
              }
              sublabel="last 8 wk"
              icon={<Target weight="bold" className="size-4" />}
            />
            <StatCard
              label="Avg session"
              value={
                <CountUp
                  value={avgDurationSec}
                  format={(n) => (n > 0 ? fmtDur(n) : "—")}
                />
              }
              sublabel="per workout"
              icon={<Timer weight="bold" className="size-4" />}
            />
          </div>

          <ChartCard title="Workouts per week">
            <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                allowDecimals={false}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartCard>

          <ChartCard
            title="Weekly volume"
            hint={`Training volume = the total weight you moved each week. For every set we multiply reps × weight, then add it all up (in ${unit}). It's a simple proxy for how hard you trained — higher usually means more total work.`}
          >
            <LineChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="volume"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#8b5cf6" }}
              />
            </LineChart>
          </ChartCard>

          {exerciseOptions.length > 0 && (
            <section className="rounded-card border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Exercise progress
                </h2>
                <div className="relative max-w-[60%]">
                  <select
                    value={selectedExercise ?? ""}
                    onChange={(e) => setSelectedExercise(e.target.value)}
                    className="h-9 w-full appearance-none rounded-full border border-border bg-background pl-3 pr-9 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {exerciseOptions.map((e) => (
                      <option key={e.name} value={e.name}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                  <CaretDown
                    weight="bold"
                    className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {bodyweight
                  ? "Top set reps per session"
                  : `Estimated 1-rep max (${unit}) per session`}
              </p>
              {seriesData.length >= 2 ? (
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={seriesData}
                      margin={{ top: 8, right: 8, bottom: 0, left: -8 }}
                    >
                      <XAxis
                        dataKey="label"
                        tick={axisTick}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={["dataMin - 5", "dataMax + 5"]}
                        tick={axisTick}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name={bodyweight ? "Top reps" : "Est. 1RM"}
                        stroke="#8b5cf6"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#8b5cf6" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Log this exercise at least twice to see your trend.
                </p>
              )}
            </section>
          )}

          <section className="rounded-card border border-border bg-card p-5">
            <h2 className="text-sm font-medium text-muted-foreground">
              Consistency
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Each square is a day you trained
            </p>
            <div className="mt-4">
              <Heatmap values={dayValues} recovery={recoveryDays} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-card border border-border bg-muted"
          />
        ))}
      </div>
      {/* Chart cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-card border border-border bg-card p-5"
        >
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="mt-4 h-56 rounded-xl bg-muted" />
        </div>
      ))}
      {/* Consistency heatmap */}
      <div className="rounded-card border border-border bg-card p-5">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: 13 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="size-7 rounded-md bg-muted" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactElement;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="relative flex items-center gap-1.5">
        <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
        {hint && (
          <>
            <button
              type="button"
              aria-label="What does this mean?"
              className="peer flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Info className="size-4" />
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-full max-w-xs rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity duration-150 peer-hover:opacity-100 peer-focus:opacity-100"
            >
              {hint}
            </span>
          </>
        )}
      </div>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
