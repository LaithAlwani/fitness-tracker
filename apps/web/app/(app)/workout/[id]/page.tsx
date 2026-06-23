"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@liftify/convex";
import type { Id } from "@liftify/convex/dataModel";
import {
  ArrowLeft,
  ArrowsClockwise,
  PencilSimple,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { Button, buttonClass } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

function fmtDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDuration(sec: number) {
  const m = Math.round(sec / 60);
  if (m < 1) return "<1 min";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

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
        <div className="h-40 animate-pulse rounded-card bg-muted" />
      </div>
    );
  }
  if (workout === null) {
    return (
      <div className="container-page py-16 text-center text-muted-foreground">
        Workout not found.{" "}
        <Link href="/history" className="font-medium underline">
          Back to history
        </Link>
      </div>
    );
  }

  const totalSets = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  const totalVolume = Math.round(
    workout.exercises.reduce(
      (s, e) => s + e.sets.reduce((ss, set) => ss + set.reps * set.weight, 0),
      0,
    ),
  );

  return (
    <div className="container-page flex flex-col gap-6 py-8">
      <Link
        href="/history"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        History
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tighter">
            {workout.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtDate(workout.date)}
            {workout.durationSec ? ` · ${fmtDuration(workout.durationSec)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/workout/new?edit=${workout._id}`}
            aria-label="Edit workout"
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PencilSimple className="size-5" />
          </Link>
          <IconButton
            variant="danger"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete workout"
          >
            <Trash className="size-5" />
          </IconButton>
        </div>
      </div>

      <Link
        href={`/workout/new?repeat=${workout._id}`}
        className={buttonClass("primary", "md", "w-full")}
      >
        <ArrowsClockwise weight="bold" className="size-4" />
        Repeat this workout
      </Link>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Exercises" value={String(workout.exercises.length)} />
        <Stat label="Sets" value={String(totalSets)} />
        <Stat label={`Volume (${unit})`} value={String(totalVolume)} />
      </div>

      <div className="flex flex-col gap-3">
        {workout.exercises.map((ex, i) => (
          <div key={i} className="rounded-card border border-border bg-card p-4">
            <p className="font-medium">{ex.name}</p>
            <ul className="mt-2 flex flex-col gap-1">
              {ex.sets.map((s, j) => (
                <li
                  key={j}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">Set {j + 1}</span>
                  <span className="tabular-nums">
                    {s.reps} × {s.weight} {unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => !deleting && setConfirmDelete(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-red-600">
              <WarningCircle weight="fill" className="size-5" />
              <h2 className="text-lg font-semibold tracking-tight">
                Delete workout?
              </h2>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-card p-4 text-center">
      <p className="text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
