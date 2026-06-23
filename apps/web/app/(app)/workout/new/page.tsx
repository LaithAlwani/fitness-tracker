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
  CaretDown,
  Pause,
  Play,
  Barbell,
  Info,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PlateCalculator } from "@/components/plate-calculator";
import { bestsByExercise, detectPRs, withBodyweight } from "@/lib/prs";
import { useRest } from "@/components/rest-timer";

type SetRow = { id: string; reps: string; weight: string; done?: boolean };
type Entry = { id: string; name: string; sets: SetRow[] };
// Session clock: `base` ms already counted, plus the live segment since
// `runningSince` (null while paused). Elapsed = base + (now - runningSince).
type SessionTimer = { base: number; runningSince: number | null };

const DRAFT_KEY = "liftify:draft-workout";
const TIMER_KEY = "liftify:session-timer";

let counter = 0;
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `r${counter++}`;
const toNum = (s: string) => (s.trim() === "" ? 0 : Number(s));
const round1 = (n: number) => Math.round(n * 10) / 10;

function fmtDuration(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

const inputBase =
  "rounded-xl border border-border bg-background px-3 text-base text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const REST_DEFAULT = 90; // seconds

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
  const latestBodyWeight = useQuery(api.bodyEntries.latestWeight, {});
  const [detailId, setDetailId] = useState<Id<"exercises"> | null>(null);
  const detail = useQuery(
    api.exercises.getById,
    detailId ? { id: detailId } : "skip",
  );
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
  const [equip, setEquip] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishPrompt, setFinishPrompt] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [plateOpen, setPlateOpen] = useState(false);
  // Which exercise cards are expanded. Adding an exercise collapses the rest.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState<SessionTimer | null>(null);
  const [tick, setTick] = useState(0);
  const rest = useRest();

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
        const draft = JSON.parse(raw) as { name?: string; entries?: Entry[] };
        if (draft.name) setName(draft.name);
        if (Array.isArray(draft.entries)) setEntries(draft.entries);
      }
    } catch {
      /* ignore corrupt draft */
    }
    // Resume a previously-running (or paused) clock, else start a fresh one.
    let restored: SessionTimer | null = null;
    try {
      const raw = localStorage.getItem(TIMER_KEY);
      if (raw) {
        const t = JSON.parse(raw);
        if (t && typeof t.base === "number") {
          restored = {
            base: t.base,
            runningSince:
              typeof t.runningSince === "number" ? t.runningSince : null,
          };
        }
      }
    } catch {
      /* ignore */
    }
    setTimer(restored ?? { base: 0, runningSince: Date.now() });
    loaded.current = true;
  }, [isEditing, repeatId]);

  // Persist the session clock so it survives navigation and reloads.
  useEffect(() => {
    if (timer === null) return;
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    } catch {
      /* ignore */
    }
  }, [timer]);
  useEffect(() => {
    if (!loaded.current || isEditing) return;
    try {
      if (entries.length === 0) localStorage.removeItem(DRAFT_KEY);
      else
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, entries }));
    } catch {
      /* storage full / unavailable */
    }
  }, [name, entries, isEditing]);

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
          done: true,
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
    setTimer({ base: 0, runningSince: Date.now() });
    repeatLoaded.current = true;
  }, [repeatId, isEditing, existingWorkout]);

  // Overall session clock: tick every second while it's running (not paused).
  const running = timer !== null && timer.runningSince !== null;
  const paused = timer !== null && timer.runningSince === null;
  useEffect(() => {
    if (!running) return;
    setTick(Date.now());
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  const elapsedMs =
    timer === null
      ? null
      : timer.base +
        (timer.runningSince !== null
          ? Math.max(0, tick - timer.runningSince)
          : 0);
  const elapsedSec = elapsedMs === null ? null : Math.floor(elapsedMs / 1000);

  function pauseTimer() {
    setTimer((t) =>
      t && t.runningSince !== null
        ? { base: t.base + (Date.now() - t.runningSince), runningSince: null }
        : t,
    );
  }
  function resumeTimer() {
    setTimer((t) =>
      t && t.runningSince === null ? { ...t, runningSince: Date.now() } : t,
    );
  }

  const groups = useMemo(() => {
    if (!allExercises) return [];
    return [
      ...new Set(
        allExercises.map((e) => e.muscleGroup).filter((g): g is string => !!g),
      ),
    ].sort();
  }, [allExercises]);
  const equipments = useMemo(() => {
    if (!allExercises) return [];
    return [
      ...new Set(
        allExercises.map((e) => e.equipment).filter((g): g is string => !!g),
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

  // Names of bodyweight-based moves + the lifter's effective body weight, for
  // folding total load into PR detection.
  const bodyweightNames = useMemo(
    () =>
      new Set(
        (allExercises ?? [])
          .filter((e) => e.equipment === "body only")
          .map((e) => e.name.toLowerCase()),
      ),
    [allExercises],
  );
  const effBodyWeight = latestBodyWeight ?? me?.bodyWeight ?? 0;

  // Look up an exercise's thumbnail / detail by name, for the added cards.
  const exerciseByName = useMemo(() => {
    const m = new Map<
      string,
      { id: Id<"exercises">; image?: string; hasDetail: boolean }
    >();
    for (const e of allExercises ?? []) {
      m.set(e.name.toLowerCase(), {
        id: e._id,
        image: e.image,
        hasDetail: e.hasDetail,
      });
    }
    return m;
  }, [allExercises]);

  const term = search.trim().toLowerCase();
  const visible = (allExercises ?? []).filter(
    (e) =>
      (!group || e.muscleGroup === group) &&
      (!equip || e.equipment === equip) &&
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

  function addExercise(exName: string) {
    const existing = entries.find(
      (e) => e.name.toLowerCase() === exName.toLowerCase(),
    );
    if (existing) {
      setExpanded(new Set([existing.id]));
      setScrollTarget(existing.id);
      return;
    }
    const id = uid();
    // Pre-fill the first set's weight with your best for this exercise, if known.
    const best = bestByExercise.get(exName.toLowerCase());
    const weight = best !== undefined ? String(round1(best)) : "";
    setEntries((prev) => [
      ...prev,
      { id, name: exName, sets: [{ id: uid(), reps: "", weight, done: false }] },
    ]);
    setExpanded(new Set([id])); // collapse the others, open the new one
    setScrollTarget(id);
  }
  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function pickExercise(exName: string) {
    addExercise(exName);
    setPickerOpen(false);
    setSearch("");
    setDetailId(null);
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
          done: false,
        };
        return { ...e, sets: [...e.sets, next] };
      }),
    );
  }
  // A set can be finished once it has reps. Weight may be 0 (bodyweight moves).
  const canFinishSet = (s: SetRow) => toNum(s.reps) > 0;
  // Mark a set complete/incomplete; completing one kicks off the rest timer.
  function setSetDone(entryId: string, setId: string, done: boolean) {
    if (done) {
      const set = entries
        .find((e) => e.id === entryId)
        ?.sets.find((s) => s.id === setId);
      if (!set || !canFinishSet(set)) return; // ignore — needs reps & weight
    }
    setEntries((prev) =>
      prev.map((e) =>
        e.id !== entryId
          ? e
          : {
              ...e,
              sets: e.sets.map((s) => (s.id === setId ? { ...s, done } : s)),
            },
      ),
    );
    if (done) rest.start(me?.restSeconds ?? REST_DEFAULT);
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

  // Throw the whole session away — clear the draft + clock and head home.
  function discard() {
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(TIMER_KEY);
    } catch {
      /* ignore */
    }
    router.push("/");
  }

  function requestFinish() {
    setError(null);
    if (entries.length === 0) {
      setError("Add at least one exercise.");
      return;
    }
    // Don't let an in-progress set slip into history unfinished.
    if (entries.some((e) => e.sets.some((s) => !s.done))) {
      setFinishPrompt(true);
      return;
    }
    setConfirmOpen(true);
  }

  // Mark every still-open set complete (those with reps & weight), then move on
  // to the finish-workout confirmation.
  function finishPendingSets() {
    setEntries((prev) =>
      prev.map((e) => ({
        ...e,
        sets: e.sets.map((s) =>
          s.done || !canFinishSet(s) ? s : { ...s, done: true },
        ),
      })),
    );
    setFinishPrompt(false);
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
    const durationSec = elapsedSec ?? undefined;
    try {
      if (isEditing && editId) {
        await update({ workoutId: editId as Id<"workouts">, name, exercises });
      } else {
        // Detect PRs vs prior history (with body weight folded into bodyweight
        // moves), then hand off to the home celebration.
        try {
          const priorLoaded = withBodyweight(
            history ?? [],
            bodyweightNames,
            effBodyWeight,
          );
          const nowLoaded = withBodyweight(
            [{ date: 0, exercises }],
            bodyweightNames,
            effBodyWeight,
          )[0].exercises;
          const prs = detectPRs(nowLoaded, bestsByExercise(priorLoaded));
          if (prs.length > 0) {
            localStorage.setItem(
              "liftify:new-prs",
              JSON.stringify({ unit, prs }),
            );
          }
        } catch {
          /* PR detection is best-effort */
        }
        await create({ name, durationSec, exercises });
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(TIMER_KEY);
      } catch {
        /* ignore */
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

  // Exercises with an unfinished set, for the "finish your set" prompt.
  const pendingEntries = entries.filter((e) => e.sets.some((s) => !s.done));
  const pendingNames = pendingEntries.map((e) => e.name);
  const pendingNeedsData = pendingEntries.some((e) =>
    e.sets.some((s) => !s.done && !canFinishSet(s)),
  );

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <div className="flex items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Workout name"
          className={`h-11 min-w-0 flex-1 text-lg font-semibold tracking-tight ${inputBase}`}
        />
        {elapsedSec !== null && (
          <button
            type="button"
            onClick={paused ? resumeTimer : pauseTimer}
            aria-label={paused ? "Resume session timer" : "Pause session timer"}
            title={paused ? "Resume timer" : "Pause timer"}
            className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium tabular-nums transition-colors ${
              paused
                ? "border-accent-strong/40 text-accent-strong"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {paused ? (
              <Play weight="fill" className="size-4" />
            ) : (
              <Pause weight="fill" className="size-4 text-accent-strong" />
            )}
            {fmtDuration(elapsedSec)}
          </button>
        )}
        <button
          type="button"
          onClick={() => setPlateOpen(true)}
          aria-label="Plate calculator"
          title="Plate calculator"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Barbell weight="bold" className="size-5" />
        </button>
      </div>

      <PlateCalculator
        open={plateOpen}
        unit={unit}
        onClose={() => setPlateOpen(false)}
      />

      {/* Current workout */}
      {entries.length > 0 && (
        <section className="flex flex-col gap-3">
          {entries.map((entry) => {
            const best = bestByExercise.get(entry.name.toLowerCase());
            const isOpen = expanded.has(entry.id);
            const setCount = entry.sets.length;
            const totalReps = entry.sets.reduce((n, s) => n + toNum(s.reps), 0);
            const meta = exerciseByName.get(entry.name.toLowerCase());
            return (
              <div
                key={entry.id}
                id={`ex-${entry.id}`}
                className="scroll-mt-20 rounded-card border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(entry.id)}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    {meta?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={meta.image}
                        alt=""
                        loading="lazy"
                        className="size-10 shrink-0 rounded-lg bg-white object-cover"
                      />
                    ) : null}
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{entry.name}</span>
                      {!isOpen && (
                        <span className="text-sm text-muted-foreground">
                          {setCount} {setCount === 1 ? "set" : "sets"} ·{" "}
                          {totalReps} {totalReps === 1 ? "rep" : "reps"}
                        </span>
                      )}
                    </span>
                  </button>
                  {meta?.hasDetail && (
                    <button
                      type="button"
                      onClick={() => setDetailId(meta.id)}
                      aria-label={`How to do ${entry.name}`}
                      title="How-to & instructions"
                      className="shrink-0 text-muted-foreground transition-colors hover:text-accent-strong"
                    >
                      <Info className="size-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(entry.id)}
                    aria-label={isOpen ? "Collapse exercise" : "Expand exercise"}
                    aria-expanded={isOpen}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <CaretDown
                      className={`size-5 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Sets */}
                {isOpen && (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                    <span className="w-8">Set</span>
                    <span className="flex-1">Reps</span>
                    <span className="flex-1">Weight ({unit})</span>
                    {best !== undefined && (
                      <span className="w-14 text-center leading-tight">
                        vs best
                        <span className="block text-[10px] font-normal text-muted-foreground/70">
                          {round1(best)} {unit}
                        </span>
                      </span>
                    )}
                    <span className="w-7" />
                  </div>
                  {entry.sets.map((s, i) => {
                    const delta =
                      best !== undefined && s.weight.trim() !== ""
                        ? toNum(s.weight) - best
                        : null;
                    return (
                      <div key={s.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSetDone(entry.id, s.id, !s.done)}
                          aria-label={
                            s.done
                              ? `Mark set ${i + 1} incomplete`
                              : `Mark set ${i + 1} complete`
                          }
                          className={`flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-medium tabular-nums transition-colors ${
                            s.done
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {s.done ? <Check weight="bold" className="size-4" /> : i + 1}
                        </button>
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
                        {best !== undefined && <DeltaBadge delta={delta} />}
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
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <IconButton
                      variant="danger"
                      onClick={() => removeExercise(entry.id)}
                      aria-label={`Remove ${entry.name}`}
                      title="Remove exercise"
                    >
                      <Trash className="size-4" />
                    </IconButton>
                    {(() => {
                      const lastSet = entry.sets[entry.sets.length - 1];
                      if (!lastSet || lastSet.done) {
                        return (
                          <button
                            onClick={() => addSet(entry.id)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-accent-strong transition-colors hover:bg-accent/10"
                          >
                            <Plus weight="bold" className="size-4" />
                            Add set
                          </button>
                        );
                      }
                      return (
                        <button
                          onClick={() => setSetDone(entry.id, lastSet.id, true)}
                          disabled={!canFinishSet(lastSet)}
                          title={
                            canFinishSet(lastSet) ? undefined : "Enter reps first"
                          }
                          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent"
                        >
                          <Check weight="bold" className="size-4" />
                          Finish set
                        </button>
                      );
                    })()}
                  </div>
                </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Add exercise — opens the library picker */}
      <button
        onClick={() => setPickerOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-4 text-sm font-medium text-accent-strong transition-colors hover:border-accent-strong/50 hover:bg-accent/5"
      >
        <Plus weight="bold" className="size-5" />
        Add exercise
      </button>

      {/* Finish workout */}
      <Button
        onClick={requestFinish}
        disabled={saving || entries.length === 0}
        className="w-full"
      >
        <Check weight="bold" className="size-4" />
        {isEditing ? "Save workout" : "Finish workout"}
      </Button>

      {!isEditing && (
        <Button
          variant="danger-outline"
          onClick={() => setDiscardOpen(true)}
          disabled={saving}
          className="self-center"
        >
          <Trash weight="bold" className="size-4" />
          Discard workout
        </Button>
      )}

      {/* Exercise picker modal */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => {
            setPickerOpen(false);
            setSearch("");
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-card border border-border bg-card shadow-xl sm:rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border p-4">
              <h2 className="font-semibold tracking-tight">Add exercise</h2>
              <button
                onClick={() => {
                  setPickerOpen(false);
                  setSearch("");
                }}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 p-4 pb-3">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search exercises…"
                  autoFocus
                  className={`h-11 w-full pl-9 pr-4 ${inputBase} rounded-full`}
                />
              </div>

              {/* Muscle-group pills — scroll horizontally */}
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <FilterPill active={group === null} onClick={() => setGroup(null)}>
                  All muscles
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

              {/* Equipment pills */}
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <FilterPill active={equip === null} onClick={() => setEquip(null)}>
                  All equipment
                </FilterPill>
                {equipments.map((g) => (
                  <FilterPill
                    key={g}
                    active={equip === g}
                    onClick={() => setEquip(equip === g ? null : g)}
                  >
                    {g}
                  </FilterPill>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {showAddCustom && (
                <button
                  onClick={() => pickExercise(customName)}
                  className="mb-1.5 flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-left text-sm font-medium transition-colors hover:border-accent-strong/40"
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
                      <li
                        key={ex._id}
                        className="flex items-center gap-1 rounded-xl border border-border pr-2 transition-colors hover:border-accent-strong/40"
                      >
                        <button
                          type="button"
                          onClick={() => pickExercise(ex.name)}
                          className="flex min-w-0 flex-1 items-center gap-3 p-2 text-left"
                        >
                          {ex.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ex.image}
                              alt=""
                              loading="lazy"
                              className="size-12 shrink-0 rounded-lg bg-white object-cover"
                            />
                          ) : (
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <Barbell className="size-5 text-muted-foreground" />
                            </span>
                          )}
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">{ex.name}</span>
                            {ex.muscleGroup && (
                              <span className="text-xs capitalize text-muted-foreground">
                                {ex.muscleGroup}
                              </span>
                            )}
                          </span>
                        </button>
                        {ex.hasDetail && (
                          <button
                            type="button"
                            onClick={() => setDetailId(ex._id)}
                            aria-label={`How to do ${ex.name}`}
                            title="How-to & instructions"
                            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-accent-strong"
                          >
                            <Info className="size-5" />
                          </button>
                        )}
                        {added ? (
                          <Check
                            weight="bold"
                            className="size-4 shrink-0 text-accent-strong"
                          />
                        ) : (
                          <Plus className="size-4 shrink-0 text-muted-foreground" />
                        )}
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
            </div>
          </div>
        </div>
      )}

      {/* Exercise detail / how-to */}
      {detailId && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
          onClick={() => setDetailId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-card border border-border bg-card shadow-xl sm:rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border p-4">
              <h2 className="truncate font-semibold tracking-tight">
                {detail?.name ?? "Exercise"}
              </h2>
              <button
                onClick={() => setDetailId(null)}
                aria-label="Close"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {detail === undefined ? (
                <div className="aspect-video animate-pulse bg-muted" />
              ) : detail === null ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Couldn&apos;t load this exercise.
                </p>
              ) : (
                <>
                  {detail.images && detail.images.length > 0 && (
                    <div
                      className={`grid gap-px bg-border ${
                        detail.images.length > 1 ? "grid-cols-2" : "grid-cols-1"
                      }`}
                    >
                      {detail.images.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={src}
                          alt={`${detail.name} ${i === 0 ? "start" : "end"} position`}
                          className="aspect-square w-full bg-white object-contain"
                        />
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-4 p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {[detail.muscleGroup, detail.equipment, detail.level]
                        .filter(Boolean)
                        .map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground"
                          >
                            {chip}
                          </span>
                        ))}
                    </div>
                    {detail.instructions && detail.instructions.length > 0 ? (
                      <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                        {detail.instructions.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No description available for this exercise.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-border p-4">
              <Button
                className="w-full"
                onClick={() => detail && pickExercise(detail.name)}
                disabled={!detail}
              >
                <Plus weight="bold" className="size-4" />
                Add to workout
              </Button>
            </div>
          </div>
        </div>
      )}

      {finishPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setFinishPrompt(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold tracking-tight">
              Finish your set
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You still have an unfinished set in{" "}
              <span className="font-medium text-foreground">
                {pendingNames.join(", ")}
              </span>
              .{" "}
              {pendingNeedsData
                ? "Add reps (or remove the set), then finish your workout."
                : "Finish it first, then wrap up your workout."}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setFinishPrompt(false)}>
                Keep going
              </Button>
              <Button onClick={finishPendingSets} disabled={pendingNeedsData}>
                <Check weight="bold" className="size-4" />
                Finish set
              </Button>
            </div>
          </div>
        </div>
      )}

      {discardOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setDiscardOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-red-600">
              <Trash weight="fill" className="size-5" />
              <h2 className="text-lg font-semibold tracking-tight">
                Discard workout?
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This throws away everything you&apos;ve logged in this session. It
              won&apos;t be saved to your history. This can&apos;t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDiscardOpen(false)}>
                Keep logging
              </Button>
              <Button variant="danger" onClick={discard}>
                <Trash weight="bold" className="size-4" />
                Discard
              </Button>
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
