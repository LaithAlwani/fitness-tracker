const DAY = 86_400_000;

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function startOfWeek(ms: number) {
  const d = new Date(ms);
  const fromMonday = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  return d.getTime() - fromMonday * DAY;
}

// values: Map of day-start (ms) -> activity value. Renders a GitHub-style grid
// (columns = weeks, rows = days). The grid starts at the user's first logged
// day — no empty history before they began — and stops at today, with no
// future cells. `weeks` is the maximum number of weeks shown.
export function Heatmap({
  values,
  weeks = 13,
}: {
  values: Map<number, number>;
  weeks?: number;
}) {
  const today = startOfDay(Date.now());
  const thisWeekStart = startOfWeek(today);
  const vals = Array.from(values.values());
  const max = Math.max(1, ...vals);

  // First day to show: the user's earliest activity (or today if they have none).
  const keys = Array.from(values.keys());
  const firstDay = keys.length ? Math.min(startOfDay(Math.min(...keys)), today) : today;
  const firstWeekStart = startOfWeek(firstDay);

  // How many week-columns fit between their first week and this week, capped.
  const spanWeeks = Math.round((thisWeekStart - firstWeekStart) / (7 * DAY)) + 1;
  const weeksToShow = Math.min(weeks, Math.max(1, spanWeeks));

  const cols: { day: number; value: number; show: boolean }[][] = [];
  for (let w = weeksToShow - 1; w >= 0; w--) {
    const ws = thisWeekStart - w * 7 * DAY;
    const col: { day: number; value: number; show: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = ws + d * DAY;
      col.push({
        day,
        value: values.get(day) ?? 0,
        show: day >= firstDay && day <= today,
      });
    }
    cols.push(col);
  }

  const level = (v: number) => (v <= 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));
  const op = [1, 0.3, 0.52, 0.74, 1];
  const fill = (c: { show: boolean; value: number }) => {
    if (!c.show) return "transparent";
    if (c.value <= 0) return "var(--muted)";
    const pct = Math.round(op[level(c.value)] * 100);
    return `color-mix(in srgb, var(--accent) ${pct}%, transparent)`;
  };

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          {col.map((c, j) => (
            <span
              key={j}
              title={
                c.show ? `${new Date(c.day).toLocaleDateString()}: ${c.value}` : ""
              }
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-medium tabular-nums"
              style={{
                backgroundColor: fill(c),
                color: !c.show
                  ? "transparent"
                  : c.value > 0
                    ? "#fff"
                    : "var(--muted-foreground)",
              }}
            >
              {c.show ? new Date(c.day).getDate() : ""}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
