"use client";

import { useQuery } from "convex/react";
import { api } from "@liftify/convex";
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
  const unit = me?.units ?? "lb";

  const WEEKS = 8;
  let weeks: { label: string; count: number; volume: number }[] = [];
  if (workouts) {
    const thisWeek = startOfWeek(Date.now());
    const buckets = new Map<number, { count: number; volume: number }>();
    for (let i = WEEKS - 1; i >= 0; i--) {
      buckets.set(thisWeek - i * 7 * DAY, { count: 0, volume: 0 });
    }
    for (const w of workouts) {
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

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tighter">Progress</h1>

      {workouts === undefined ? (
        <div className="h-72 animate-pulse rounded-card border border-border bg-muted" />
      ) : !hasData ? (
        <div className="rounded-card border border-dashed border-border p-8 text-center text-muted-foreground">
          Log a few workouts and your charts will fill in here.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Total workouts"
              value={String(total)}
              icon={<Barbell weight="bold" className="size-4" />}
            />
            <StatCard
              label="This week"
              value={String(thisWeekCount)}
              icon={<CalendarCheck weight="bold" className="size-4" />}
            />
            <StatCard
              label="Streak"
              value={String(streak)}
              sublabel={streak === 1 ? "day" : "days"}
              icon={<Flame weight="fill" className="size-4" />}
            />
            <StatCard
              label="Avg / week"
              value={avgPerWeek}
              sublabel="last 8 wk"
              icon={<Target weight="bold" className="size-4" />}
            />
            <StatCard
              label="Avg session"
              value={avgDurationSec > 0 ? fmtDur(avgDurationSec) : "—"}
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

          <section className="rounded-card border border-border bg-card p-5">
            <h2 className="text-sm font-medium text-muted-foreground">
              Consistency
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Each square is a day you trained
            </p>
            <div className="mt-4">
              <Heatmap values={dayValues} />
            </div>
          </section>
        </>
      )}
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
