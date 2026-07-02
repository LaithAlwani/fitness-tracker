"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ArrowsClockwise,
  Barbell,
  CaretLeft,
  ChartBar,
  PencilSimple,
  Stack,
  TrashSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { StatCard } from "@/components/ui/stat-card";

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(sec: number) {
  const totalMinutes = Math.round(sec / 60);
  if (totalMinutes < 1) return "<1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

const exerciseCardStyles = "rounded-[14px] border border-border bg-card p-4";
const editButtonStyles =
  "flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export default function WorkoutDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const me = useQuery(api.users.me, {});
  const workout = useQuery(api.workouts.getById, {
    workoutId: id as Id<"workouts">,
  });
  const remove = useMutation(api.workouts.remove);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const unit = me?.units ?? "lb";

  async function handleDelete() {
    setDeleting(true);
    try {
      await remove({ workoutId: id as Id<"workouts"> });
      router.push("/history");
    } catch {
      setDeleting(false);
    }
  }

  if (workout === undefined) {
    return (
      <div className="container-page py-8">
        <div className="h-40 animate-pulse rounded-[14px] border border-border bg-card" />
      </div>
    );
  }
  if (workout === null) {
    return (
      <div className="container-page py-16 text-center">
        <p className="mono-label text-[10px] text-dim">Not found</p>
        <p className="mt-2 text-muted-foreground">
          This workout no longer exists.
        </p>
        <Link
          href="/history"
          className="mt-3 inline-block font-display text-lg font-black text-accent"
        >
          Back to history
        </Link>
      </div>
    );
  }

  const totalSets = workout.exercises.reduce(
    (count, exercise) => count + exercise.sets.length,
    0,
  );
  const totalVolume = Math.round(
    workout.exercises.reduce(
      (sum, exercise) =>
        sum +
        exercise.sets.reduce(
          (setSum, set) => setSum + set.reps * set.weight,
          0,
        ),
      0,
    ),
  );

  const dateLine =
    formatDate(workout.date) +
    (workout.durationSec ? ` · ${formatDuration(workout.durationSec)}` : "");

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <Link
        href="/history"
        className="mono-label inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <CaretLeft weight="bold" className="size-3.5" />
        History
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-black md:text-4xl">
            {workout.name}
          </h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {dateLine}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/workout/new?edit=${workout._id}`}
            aria-label="Edit workout"
            title="Edit workout"
            className={editButtonStyles}
          >
            <PencilSimple weight="bold" className="size-5" />
          </Link>
          <IconButton
            variant="danger"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete workout"
          >
            <TrashSimple weight="bold" className="size-5" />
          </IconButton>
        </div>
      </div>

      <Link
        href={`/workout/new?repeat=${workout._id}`}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-accent font-display font-black italic text-accent-foreground transition-[filter] hover:brightness-105 active:translate-y-px"
      >
        <ArrowsClockwise weight="bold" className="size-5" />
        REPEAT THIS WORKOUT
      </Link>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Exercises"
          value={workout.exercises.length}
          icon={<Barbell weight="bold" className="size-3" />}
        />
        <StatCard
          label="Sets"
          value={totalSets}
          icon={<Stack weight="bold" className="size-3" />}
        />
        <StatCard
          label="Volume"
          value={totalVolume}
          unit={unit}
          icon={<ChartBar weight="bold" className="size-3" />}
        />
      </div>

      <div className="flex flex-col gap-3">
        {workout.exercises.map((exercise, exerciseIndex) => (
          <div key={exerciseIndex} className={exerciseCardStyles}>
            <p className="font-display text-base font-extrabold">
              {exercise.name}
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {exercise.sets.map((set, setIndex) => (
                <li
                  key={setIndex}
                  className="flex items-center justify-between border-t border-border pt-1.5 first:border-t-0 first:pt-0"
                >
                  <span className="mono-label text-[10px] text-dim">
                    Set {setIndex + 1}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-bright">
                    {set.reps} × {set.weight} {unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => !deleting && setConfirmDelete(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-[16px] border border-border-strong bg-card p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-red-500">
              <WarningCircle weight="fill" className="size-5" />
              <h2 className="font-display text-lg font-black">Delete workout?</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              &ldquo;{workout.name}&rdquo; will be permanently removed from your
              history.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
