"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@liftify/convex";
import {
  MagnifyingGlass,
  Plus,
  Trash,
  X,
  Check,
  FloppyDisk,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type SetRow = { id: string; reps: string; weight: string };
type Entry = { id: string; name: string; sets: SetRow[] };

let counter = 0;
const uid = () => `r${counter++}`;
const toNum = (s: string) => (s.trim() === "" ? 0 : Number(s));

const inputBase =
  "rounded-xl border border-border bg-background px-3 text-base text-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function LogWorkoutPage() {
  const router = useRouter();
  const me = useQuery(api.users.me, {});
  const allExercises = useQuery(api.exercises.list, {});
  const create = useMutation(api.workouts.create);

  const [name, setName] = useState("Workout");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unit = me?.units ?? "lb";

  const groups = useMemo(() => {
    if (!allExercises) return [];
    return [
      ...new Set(
        allExercises.map((e) => e.muscleGroup).filter((g): g is string => !!g),
      ),
    ].sort();
  }, [allExercises]);

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

  function addExercise(exName: string) {
    const existing = entries.find(
      (e) => e.name.toLowerCase() === exName.toLowerCase(),
    );
    if (existing) {
      setScrollTarget(existing.id);
      return;
    }
    const id = uid();
    setEntries((prev) => [
      ...prev,
      { id, name: exName, sets: [{ id: uid(), reps: "", weight: "" }] },
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

  async function save() {
    setError(null);
    if (entries.length === 0) {
      setError("Add at least one exercise.");
      return;
    }
    setSaving(true);
    try {
      await create({
        name,
        exercises: entries.map((e) => ({
          name: e.name,
          sets: e.sets.map((s) => ({
            reps: toNum(s.reps),
            weight: toNum(s.weight),
          })),
        })),
      });
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
        <Button onClick={save} disabled={saving || entries.length === 0}>
          <FloppyDisk weight="bold" className="size-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* Current workout */}
      {entries.length > 0 && (
        <section className="flex flex-col gap-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              id={`ex-${entry.id}`}
              className="scroll-mt-20 rounded-card border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
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
                  <span className="w-10">Set</span>
                  <span className="flex-1">Reps</span>
                  <span className="flex-1">Weight ({unit})</span>
                  <span className="w-7" />
                </div>
                {entry.sets.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="w-10 text-sm font-medium tabular-nums text-muted-foreground">
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
                    <button
                      onClick={() => removeSet(entry.id, s.id)}
                      aria-label={`Remove set ${i + 1}`}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addSet(entry.id)}
                  className="mt-1 inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-sm font-medium text-accent-strong transition-colors hover:bg-accent/10"
                >
                  <Plus weight="bold" className="size-4" />
                  Add set
                </button>
              </div>
            </div>
          ))}
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
    </div>
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
