"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@liftify/convex";
import type { Id } from "@liftify/convex/dataModel";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  CaretDown,
  PencilSimple,
  Trash,
  Check,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

const MEAS_KEYS = ["waist", "chest", "arms", "hips", "thighs"] as const;
type MeasKey = (typeof MEAS_KEYS)[number];

const inputBase =
  "rounded-xl border border-border bg-background px-3 text-base text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function shortDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function BodyPage() {
  const me = useQuery(api.users.me, {});
  const entries = useQuery(api.bodyEntries.listForUser, { limit: 365 });
  const create = useMutation(api.bodyEntries.create);
  const update = useMutation(api.bodyEntries.update);
  const removeEntry = useMutation(api.bodyEntries.remove);
  const unit = me?.units ?? "lb";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [showMeas, setShowMeas] = useState(false);
  const [meas, setMeas] = useState<Record<MeasKey, string>>({
    waist: "",
    chest: "",
    arms: "",
    hips: "",
    thighs: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asc = entries ? [...entries].reverse() : [];
  const chartData = asc.map((e) => ({ label: shortDate(e.date), weight: e.weight }));
  const latest = entries?.[0];

  async function add() {
    setError(null);
    const w = Number(weight);
    if (!(w > 0)) {
      setError("Enter a valid weight.");
      return;
    }
    setSaving(true);
    try {
      const m: Partial<Record<MeasKey, number>> = {};
      for (const k of MEAS_KEYS) {
        const val = Number(meas[k]);
        if (meas[k] && val > 0) m[k] = val;
      }
      await create({
        weight: w,
        notes: notes.trim() || undefined,
        measurements: Object.keys(m).length ? m : undefined,
      });
      setWeight("");
      setNotes("");
      setMeas({ waist: "", chest: "", arms: "", hips: "", thighs: "" });
      setOpen(false);
      setShowMeas(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save entry.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(id: string, w: number, n?: string) {
    setEditingId(id);
    setEditWeight(String(w));
    setEditNotes(n ?? "");
    setEditError(null);
  }

  async function saveEdit(entryId: Id<"bodyEntries">) {
    setEditError(null);
    const w = Number(editWeight);
    if (!(w > 0)) {
      setEditError("Enter a valid weight.");
      return;
    }
    try {
      await update({ entryId, weight: w, notes: editNotes });
      setEditingId(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Could not save.");
    }
  }

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tighter">Body</h1>
        <Button onClick={() => setOpen((v) => !v)} variant={open ? "secondary" : "primary"}>
          <Plus weight="bold" className="size-4" />
          Add entry
        </Button>
      </div>

      {/* Add entry */}
      {open && (
        <div className="rounded-card border border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              Weight ({unit})
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                autoFocus
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={`h-11 ${inputBase}`}
              />
            </label>
            <label className="flex flex-[2] flex-col gap-1 text-xs text-muted-foreground">
              Notes (optional)
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`h-11 ${inputBase}`}
              />
            </label>
          </div>

          <button
            onClick={() => setShowMeas((v) => !v)}
            className="mt-4 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <CaretDown
              className={`size-4 transition-transform ${showMeas ? "rotate-180" : ""}`}
            />
            Measurements — inches (optional)
          </button>
          {showMeas && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {MEAS_KEYS.map((k) => (
                <label
                  key={k}
                  className="flex flex-col gap-1 text-xs capitalize text-muted-foreground"
                >
                  {k}
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="0"
                    value={meas[k]}
                    onChange={(e) =>
                      setMeas((prev) => ({ ...prev, [k]: e.target.value }))
                    }
                    className={`h-11 ${inputBase}`}
                  />
                </label>
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-4 flex justify-end">
            <Button onClick={add} disabled={saving}>
              {saving ? "Saving…" : "Save entry"}
            </Button>
          </div>
        </div>
      )}

      {/* Weight chart */}
      <section className="rounded-card border border-border bg-card p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Weight</h2>
          {latest && (
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {latest.weight}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {unit}
              </span>
            </p>
          )}
        </div>
        {entries === undefined ? (
          <div className="mt-4 h-56 animate-pulse rounded-xl bg-muted" />
        ) : chartData.length >= 2 ? (
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#84cc16"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#84cc16" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Log at least two entries to see your trend.
          </p>
        )}
      </section>

      {/* History */}
      {entries && entries.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">History</h2>
          <ul className="flex flex-col gap-2">
            {entries.slice(0, 60).map((e) =>
              editingId === e._id ? (
                <li
                  key={e._id}
                  className="rounded-xl border border-accent-strong/40 bg-card p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
                      Weight ({unit})
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        min="0"
                        autoFocus
                        value={editWeight}
                        onChange={(ev) => setEditWeight(ev.target.value)}
                        className={`h-11 ${inputBase}`}
                      />
                    </label>
                    <label className="flex flex-[2] flex-col gap-1 text-xs text-muted-foreground">
                      Notes
                      <input
                        value={editNotes}
                        onChange={(ev) => setEditNotes(ev.target.value)}
                        className={`h-11 ${inputBase}`}
                      />
                    </label>
                  </div>
                  {editError && (
                    <p className="mt-2 text-sm text-red-600">{editError}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        removeEntry({ entryId: e._id });
                        setEditingId(null);
                      }}
                    >
                      <Trash className="size-4" />
                      Delete
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-4" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => saveEdit(e._id)}>
                        <Check weight="bold" className="size-4" />
                        Save
                      </Button>
                    </div>
                  </div>
                </li>
              ) : (
                <li
                  key={e._id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium tabular-nums">
                      {e.weight} {unit}
                    </p>
                    {e.notes && (
                      <p className="truncate text-sm text-muted-foreground">
                        {e.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground/70">
                      {shortDate(e.date)}
                    </span>
                    <button
                      onClick={() => startEdit(e._id, e.weight, e.notes)}
                      aria-label="Edit entry"
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <PencilSimple className="size-4" />
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
