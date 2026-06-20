"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@liftify/convex";
import type { Id } from "@liftify/convex/dataModel";
import {
  MagnifyingGlass,
  Plus,
  Trash,
  X,
  Check,
  Timer,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type SetRow = { id: string; reps: string; weight: string };
type Entry = { id: string; name: string; sets: SetRow[] };

const DRAFT_KEY = "liftify:draft-workout";

let counter = 0;
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r${counter++}`;
const toNum = (s: string) => (s.trim() === "" ? 0 : Number(s));
const round1 = (n: number) => Math.round(n * 10) / 10;

const inputBase =
  "rounded-xl border border-border bg-background px-3 text-base text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const REST_DEFAULT = 90; // seconds

function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    o.start();
    o.stop(ctx.currentTime + 0.45);
    o.onended = () => ctx.close();
  } catch {
    /* audio unavailable */
  }
}

export default function Page() {
  return (
    <Suspense fallback={<div className="container-page py-8" />}>
      <LogWorkout />
    </Suspense>
  );
}

function LogWorkout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const repeatId = searchParams.get("repeat");
  const isEditing = !!editId;
  const loadId = editId ?? repeatId;

  const me = useQuery(api.users.me, {});
  const allExercises = useQuery(api.exercises.list, {});
  const history = useQuery(api.workouts.listForUser, { limit: 100 });
  const existingWorkout = useQuery(
    api.workouts.getById,
    loadId ? { workoutId: loadId as Id<"workouts"> } : "skip",
  );
  const create = useMutation(api.workouts.create);
  const update = useMutation(api.workouts.update);

  const [name, setName] = useState("Workout");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restNow, setRestNow] = useState(0);

  const unit = me?.units ?? "lb";

  // Persist the in-progress NEW workout so leaving and returning keeps it.
  // (Edit mode loads from the saved workout instead — no draft.)
  const loaded = useRef(false);
  useEffect(() => {
    if (isEditing || repeatId) {
      loaded.current = true;
      return;
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as {
          name?: string;
          entries?: Entry[];
          startedAt?: number;
        };
        if (draft.name) setName(draft.name);
        if (Array.isArray(draft.entries)) setEntries(draft.entries);
        if (typeof draft.startedAt === "number") setStartedAt(draft.startedAt);
      }
    } catch {
      /* ignore corrupt draft */
    }
    loaded.current = true;
  }, [isEditing, repeatId]);
  useEffect(() => {
    if (!loaded.current || isEditing) return;
    try {
      if (entries.length === 0) localStorage.removeItem(DRAFT_KEY);
      else
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ name, entries, startedAt }),
        );
    } catch {
      /* storage full / unavailable */
    }
  }, [name, entries, startedAt, isEditing]);

  // Edit mode: prefill the form from the saved workout, once.
  const editLoaded = useRef(false);
  useEffect(() => {
    if (!isEditing || editLoaded.current || !existingWorkout) return;
    setName(existingWorkout.name);
    setEntries(
      existingWorkout.exercises.map((ex) => ({
        id: uid(),
        name: ex.name,
        sets: ex.sets.map((s) => ({
          id: uid(),
          reps: String(s.reps),
          weight: String(s.weight),
        })),
      })),
    );
    editLoaded.current = true;
  }, [isEditing, existingWorkout]);

  // Repeat mode: prefill from a past workout as a brand-new session.
  const repeatLoaded = useRef(false);
  useEffect(() => {
    if (!repeatId || isEditing || repeatLoaded.current || !existingWorkout) {
      return;
    }
    setName(existingWorkout.name);
    setEntries(
      existingWorkout.exercises.map((ex) => ({
        id: uid(),
        name: ex.name,
        sets: ex.sets.map((s) => ({
          id: uid(),
          reps: String(s.reps),
          weight: String(s.weight),
        })),
      })),
    );
    setStartedAt(Date.now());
    repeatLoaded.current = true;
  }, [repeatId, isEditing, existingWorkout]);

  const groups = useMemo(() => {
    if (!allExercises) return [];
    return [
      ...new Set(
        allExercises.map((e) => e.muscleGroup).filter((g): g is string => !!g),
      ),
    ].sort();
  }, [allExercises]);

  // All-time heaviest weight per exercise, to show a +/- delta vs your best.
  const bestByExercise = useMemo(() => {
    const map = new Map<string, number>();
    if (!history) return map;
    for (const w of history) {
      for (const ex of w.exercises) {
        const weights = ex.sets.map((s) => s.weight).filter((x) => x > 0);
        if (!weights.length) continue;
        const key = ex.name.toLowerCase();
        const localMax = Math.max(...weights);
        const prev = map.get(key);
        if (prev === undefined || localMax > prev) map.set(key, localMax);
      }
    }
    return map;
  }, [history]);

  const term = search.trim().toLowerCase();
  const visible = (allExercises ?? []).filter(
    (e) =>
      (!group || e.muscleGroup === group) &&
      (!term || e.name.toLowerCase().includes(term)),
  );

  // Scroll to (and focus) the exercise that was just added.
  useEffect(() => {
    if (!scrollTarget) return;
    const el = document.getElementById(`ex-${scrollTarget}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.querySelector("input")?.focus({ preventScroll: true });
    }
    setScrollTarget(null);
  }, [scrollTarget]);

  // Rest timer: tick while running, beep + clear at zero.
  useEffect(() => {
    if (restEndsAt === null) return;
    setRestNow(Date.now());
    const id = setInterval(() => setRestNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [restEndsAt]);

  const restRemaining =
    restEndsAt !== null
      ? Math.max(0, Math.round((restEndsAt - restNow) / 1000))
      : null;

  useEffect(() => {
    if (restEndsAt !== null && restRemaining === 0) {
      beep();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(200);
      }
      setRestEndsAt(null);
    }
  }, [restRemaining, restEndsAt]);

  function startRest(sec: number) {
    setRestEndsAt(Date.now() + sec * 1000);
  }
  function adjustRest(delta: number) {
    setRestEndsAt((prev) =>
      Math.max(Date.now() + 1000, (prev ?? Date.now()) + delta * 1000),
    );
  }
  function stopRest() {
    setRestEndsAt(null);
  }

  function addExercise(exName: string) {
    if (startedAt === null) setStartedAt(Date.now());
    const existing = entries.find(
      (e) => e.name.toLowerCase() === exName.toLowerCase(),
    );
    if (existing) {
      setScrollTarget(existing.id);
      return;
    }
    const id = uid();
    // Pre-fill the first set's weight with your best for this exercise, if known.
    const best = bestByExercise.get(exName.toLowerCase());
    const weight = best !== undefined ? String(round1(best)) : "";
    setEntries((prev) => [
      ...prev,
      { id, name: exName, sets: [{ id: uid(), reps: "", weight }] },
    ]);
    setScrollTarget(id);
  }
  function removeExercise(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }
  function addSet(entryId: string) {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e;
        const last = e.sets[e.sets.length - 1];
        const next: SetRow = {
          id: uid(),
          reps: last?.reps ?? "",
          weight: last?.weight ?? "",
        };
        return { ...e, sets: [...e.sets, next] };
      }),
    );
    startRest(REST_DEFAULT); // auto-start rest after logging a set
  }
  function updateSet(entryId: string, setId: string, patch: Partial<SetRow>) {
    setEntries((prev) =>
      prev.map((e) =>
        e.id !== entryId
          ? e
          : {
              ...e,
              sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
            },
      ),
    );
  }
  function removeSet(entryId: string, setId: string) {
    setEntries((prev) =>
      prev.flatMap((e) => {
        if (e.id !== entryId) return [e];
        const sets = e.sets.filter((s) => s.id !== setId);
        return sets.length === 0 ? [] : [{ ...e, sets }];
      }),
    );
  }

  function requestFinish() {
    setError(null);
    if (entries.length === 0) {
      setError("Add at least one exercise.");
      return;
    }
    setConfirmOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const exercises = entries.map((e) => ({
      name: e.name,
      sets: e.sets.map((s) => ({
        reps: toNum(s.reps),
        weight: toNum(s.weight),
      })),
    }));
    const durationSec =
      startedAt !== null
        ? Math.round((Date.now() - startedAt) / 1000)
        : undefined;
    try {
      if (isEditing && editId) {
        await update({ workoutId: editId as Id<"workouts">, name, exercises });
      } else {
        await create({ name, durationSec, exercises });
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          /* ignore */
        }
      }
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save workout.");
      setSaving(false);
    }
  }

  const customName = search.trim();
  const showAddCustom =
    customName.length > 0 &&
    allExercises !== undefined &&
    !allExercises.some((e) => e.name.toLowerCase() === customName.toLowerCase());

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <div className="flex items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Workout name"
          className={`h-11 flex-1 text-lg font-semibold tracking-tight ${inputBase}`}
        />
        <Button onClick={requestFinish} disabled={saving || entries.length === 0}>
          <Check weight="bold" className="size-4" />
          {isEditing ? "Save" : "Finish"}
        </Button>
      </div>

      {/* Current workout */}
      {entries.length > 0 && (
        <section className="flex flex-col gap-3">
          {entries.map((entry) => {
            const best = bestByExercise.get(entry.name.toLowerCase());
            return (
              <div
                key={entry.id}
                id={`ex-${entry.id}`}
                className="scroll-mt-20 rounded-card border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{entry.name}</p>
                  <button
                    onClick={() => removeExercise(entry.id)}
                    aria-label={`Remove ${entry.name}`}
                    className="text-muted-foreground transition-colors hover:text-red-600"
                  >
                    <Trash className="size-4" />
                  </button>
                </div>

                {/* Sets */}
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                    <span className="w-8">Set</span>
                    <span className="flex-1">Reps</span>
                    <span className="flex-1">Weight ({unit})</span>
                    <span className="w-14 text-center leading-tight">
                      vs best
                      {best !== undefined && (
                        <span className="block text-[10px] font-normal text-muted-foreground/70">
                          {round1(best)} {unit}
                        </span>
                      )}
                    </span>
                    <span className="w-7" />
                  </div>
                  {entry.sets.map((s, i) => {
                    const delta =
                      best !== undefined && s.weight.trim() !== ""
                        ? toNum(s.weight) - best
                        : null;
                    return (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="w-8 text-sm font-medium tabular-nums text-muted-foreground">
                          {i + 1}
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          placeholder="0"
                          value={s.reps}
                          onChange={(e) =>
                            updateSet(entry.id, s.id, { reps: e.target.value })
                          }
                          aria-label={`Set ${i + 1} reps`}
                          className={`h-11 w-full flex-1 tabular-nums ${inputBase}`}
                        />
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min="0"
                          placeholder="0"
                          value={s.weight}
                          onChange={(e) =>
                            updateSet(entry.id, s.id, { weight: e.target.value })
                          }
                          aria-label={`Set ${i + 1} weight`}
                          className={`h-11 w-full flex-1 tabular-nums ${inputBase}`}
                        />
                        <DeltaBadge delta={delta} />
                        <button
                          onClick={() => removeSet(entry.id, s.id)}
                          aria-label={`Remove set ${i + 1}`}
                          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => addSet(entry.id)}
                    className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm font-medium text-accent-strong transition-colors hover:bg-accent/10"
                  >
                    <Plus weight="bold" className="size-4" />
                    Add set
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Exercise library */}
      <section className="flex flex-col gap-3">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises…"
            className={`h-11 w-full pl-9 pr-4 ${inputBase} rounded-full`}
          />
        </div>

        {/* Filter pills — scroll horizontally on mobile */}
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <FilterPill active={group === null} onClick={() => setGroup(null)}>
            All
          </FilterPill>
          {groups.map((g) => (
            <FilterPill
              key={g}
              active={group === g}
              onClick={() => setGroup(group === g ? null : g)}
            >
              {g}
            </FilterPill>
          ))}
        </div>

        {showAddCustom && (
          <button
            onClick={() => {
              addExercise(customName);
              setSearch("");
            }}
            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-left text-sm font-medium transition-colors hover:border-accent-strong/40"
          >
            <Plus className="size-4 text-accent-strong" />
            Add &ldquo;{customName}&rdquo; as a custom exercise
          </button>
        )}

        {allExercises === undefined ? (
          <ul className="flex flex-col gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="h-12 animate-pulse rounded-xl border border-border bg-muted"
              />
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {visible.map((ex) => {
              const added = entries.some((e) => e.name === ex.name);
              return (
                <li key={ex._id}>
                  <button
                    onClick={() => addExercise(ex.name)}
                    className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-left transition-colors hover:border-accent-strong/40"
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="font-medium">{ex.name}</span>
                      {ex.muscleGroup && (
                        <span className="text-xs capitalize text-muted-foreground">
                          {ex.muscleGroup}
                        </span>
                      )}
                    </span>
                    {added ? (
                      <Check weight="bold" className="size-4 text-accent-strong" />
                    ) : (
                      <Plus className="size-4 text-muted-foreground" />
                    )}
                  </button>
                </li>
              );
            })}
            {visible.length === 0 && (
              <p className="px-1 text-sm text-muted-foreground">
                No matches — type a name and add it as custom.
              </p>
            )}
          </ul>
        )}
      </section>

      {/* Rest timer bar */}
      {restRemaining !== null && (
        <div className="fixed inset-x-0 bottom-16 z-40 px-4 sm:bottom-4">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-full border border-border bg-card/95 px-4 py-2.5 shadow-xl backdrop-blur">
            <div className="flex items-center gap-2">
              <Timer weight="bold" className="size-5 text-accent-strong" />
              <span className="font-mono text-lg tabular-nums">
                {fmtClock(restRemaining)}
              </span>
              <span className="text-sm text-muted-foreground">rest</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => adjustRest(-15)}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                −15
              </button>
              <button
                onClick={() => adjustRest(15)}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                +15
              </button>
              <button
                onClick={stopRest}
                className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => !saving && setConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold tracking-tight">
              {isEditing ? "Save changes?" : "Finish workout?"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {isEditing ? "Update " : "Save "}
              &ldquo;{name.trim() || "Workout"}&rdquo; with {entries.length}{" "}
              exercise{entries.length === 1 ? "" : "s"}
              {isEditing ? " in" : " to"} your history?
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmOpen(false)}
                disabled={saving}
              >
                Keep going
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving
                  ? "Saving…"
                  : isEditing
                    ? "Save changes"
                    : "Finish workout"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="w-14" />;
  const r = Math.round(delta * 10) / 10;
  if (r === 0) {
    return (
      <span className="w-14 text-center text-xs font-medium tabular-nums text-muted-foreground">
        ±0
      </span>
    );
  }
  const up = r > 0;
  return (
    <span
      className={`w-14 text-center text-xs font-semibold tabular-nums ${
        up ? "text-accent-strong" : "text-red-600"
      }`}
    >
      {up ? "+" : ""}
      {r}
    </span>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium capitalize transition-colors ${
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
