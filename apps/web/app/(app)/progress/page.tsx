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

const DAY = 86_400_000;

function startOfWeek(ms: number) {
  const d = new Date(ms);
  const dayFromMonday = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  return d.getTime() - dayFromMonday * DAY;
}
function weekLabel(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
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
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Total workouts" value={String(total)} />
            <Stat
              label="Avg / week (8 wk)"
              value={(weeks.reduce((s, w) => s + w.count, 0) / WEEKS).toFixed(1)}
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
              <Bar dataKey="count" fill="#84cc16" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartCard>

          <ChartCard title={`Weekly volume (sets × reps × ${unit})`}>
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
                stroke="#84cc16"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#84cc16" }}
              />
            </LineChart>
          </ChartCard>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactElement;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-5">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}
