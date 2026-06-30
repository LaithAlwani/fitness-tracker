"use client";

import { useEffect, useState } from "react";
import { useUser, useClerk, SignOutButton } from "@clerk/nextjs";
import { useMutation, useQuery, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  SignOut,
  TrashSimple,
  WarningCircle,
  Minus,
  Plus,
  DownloadSimple,
} from "@phosphor-icons/react";
import { PushToggle } from "@/components/push-toggle";
import { Button } from "@/components/ui/button";

function toCsv(rows: (string | number)[][]) {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

function downloadCsv(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const UNITS = ["lb", "kg"] as const;

function fmtRest(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}:${String(s).padStart(2, "0")}` : `${m} min`;
}

function fmtHour(h: number) {
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${am ? "AM" : "PM"}`;
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
        on ? "bg-accent" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ReminderRow({
  title,
  desc,
  on,
  onToggle,
}: {
  title: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch on={on} onClick={onToggle} />
    </div>
  );
}

function Stepper({
  value,
  onDec,
  onInc,
}: {
  value: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-border p-1">
      <button
        onClick={onDec}
        aria-label="Decrease"
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Minus weight="bold" className="size-4" />
      </button>
      <span className="min-w-14 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        onClick={onInc}
        aria-label="Increase"
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Plus weight="bold" className="size-4" />
      </button>
    </div>
  );
}

type FontSize = "sm" | "base" | "lg";
const FONT_SIZES: { key: FontSize; label: string; px: string }[] = [
  { key: "sm", label: "Small", px: "14px" },
  { key: "base", label: "Regular", px: "16px" },
  { key: "lg", label: "Large", px: "18px" },
];

export default function SettingsPage() {
  const me = useQuery(api.users.me, {});
  const setUnits = useMutation(api.users.setUnits);
  const setPrefs = useMutation(api.users.setPreferences);
  const deleteData = useMutation(api.users.deleteAccount);
  const convex = useConvex();
  const { user } = useUser();
  const { signOut } = useClerk();

  const [exporting, setExporting] = useState<"workouts" | "body" | null>(null);

  // Training prefs — seeded from the server, updated optimistically.
  const [goal, setGoal] = useState(4);
  const [rest, setRest] = useState(90);
  const [rem, setRem] = useState({
    remindExercise: true,
    remindWeighIn: true,
    remindRest: true,
  });
  const [reminderHour, setReminderHour] = useState(18);
  useEffect(() => {
    if (me?.reminderHour !== undefined) setReminderHour(me.reminderHour);
  }, [me?.reminderHour]);
  function changeReminderHour(h: number) {
    const v = ((h % 24) + 24) % 24;
    setReminderHour(v);
    setPrefs({ reminderHour: v });
  }
  useEffect(() => {
    if (!me) return;
    setRem({
      remindExercise: me.remindExercise !== false,
      remindWeighIn: me.remindWeighIn !== false,
      remindRest: me.remindRest !== false,
    });
  }, [me]);
  function toggleReminder(key: keyof typeof rem) {
    const v = !rem[key];
    setRem((r) => ({ ...r, [key]: v }));
    setPrefs({ [key]: v });
  }
  useEffect(() => {
    if (me?.weeklyGoal) setGoal(me.weeklyGoal);
  }, [me?.weeklyGoal]);
  useEffect(() => {
    if (me?.restSeconds) setRest(me.restSeconds);
  }, [me?.restSeconds]);
  function changeGoal(n: number) {
    const v = Math.min(14, Math.max(1, n));
    setGoal(v);
    setPrefs({ weeklyGoal: v });
  }
  function changeRest(n: number) {
    const v = Math.min(600, Math.max(15, n));
    setRest(v);
    setPrefs({ restSeconds: v });
  }

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [fontSize, setFontSize] = useState<FontSize>("base");
  useEffect(() => {
    try {
      const s = localStorage.getItem("liftify:font-size");
      if (s === "sm" || s === "base" || s === "lg") setFontSize(s);
    } catch {
      /* ignore */
    }
  }, []);
  function applyFontSize(key: FontSize) {
    setFontSize(key);
    const px = FONT_SIZES.find((f) => f.key === key)?.px ?? "16px";
    try {
      localStorage.setItem("liftify:font-size", key);
    } catch {
      /* ignore */
    }
    document.documentElement.style.fontSize = px;
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteData({}); // wipe Convex data while still authenticated
      const res = await fetch("/api/delete-account", { method: "POST" });
      if (!res.ok) throw new Error("Could not delete your account.");
      await signOut({ redirectUrl: "/sign-in" }); // removes Clerk session
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete account.");
      setDeleting(false);
    }
  }

  const unit = me?.units ?? "lb";

  async function exportWorkouts() {
    setExporting("workouts");
    try {
      const ws = await convex.query(api.workouts.listForUser, { limit: 5000 });
      const rows: (string | number)[][] = [
        ["date", "workout", "exercise", "set", "reps", "weight", "unit"],
      ];
      for (const w of ws) {
        const date = new Date(w.date).toISOString().slice(0, 10);
        for (const ex of w.exercises) {
          ex.sets.forEach((s, i) =>
            rows.push([date, w.name, ex.name, i + 1, s.reps, s.weight, unit]),
          );
        }
      }
      downloadCsv("liftify-workouts.csv", toCsv(rows));
    } finally {
      setExporting(null);
    }
  }

  async function exportBody() {
    setExporting("body");
    try {
      const es = await convex.query(api.bodyEntries.listForUser, {
        limit: 5000,
      });
      const rows: (string | number)[][] = [
        ["date", "weight", "unit", "waist", "chest", "arms", "hips", "thighs", "notes"],
      ];
      for (const e of es) {
        const m = e.measurements ?? {};
        rows.push([
          new Date(e.date).toISOString().slice(0, 10),
          e.weight,
          unit,
          m.waist ?? "",
          m.chest ?? "",
          m.arms ?? "",
          m.hips ?? "",
          m.thighs ?? "",
          e.notes ?? "",
        ]);
      }
      downloadCsv("liftify-body.csv", toCsv(rows));
    } finally {
      setExporting(null);
    }
  }

  const name =
    [me?.firstName, me?.lastName].filter(Boolean).join(" ") ||
    user?.fullName ||
    "—";
  const email =
    me?.email || user?.primaryEmailAddress?.emailAddress || "—";

  return (
    <div className="container-page flex max-w-xl flex-col gap-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tighter">Settings</h1>

      {/* Units */}
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="font-medium">Units</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Weight unit used across workouts and your body journal.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-border p-1">
          {UNITS.map((u) => (
            <button
              key={u}
              onClick={() => {
                if (u !== unit) setUnits({ units: u });
              }}
              className={`rounded-full px-6 py-2 text-sm font-medium uppercase transition-colors ${
                unit === u
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </section>

      {/* Text size */}
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="font-medium">Text size</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Adjust how large text appears across the app.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-border p-1">
          {FONT_SIZES.map((f) => (
            <button
              key={f.key}
              onClick={() => applyFontSize(f.key)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                fontSize === f.key
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Training */}
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="font-medium">Training</h2>
        <div className="mt-4 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Weekly goal</p>
              <p className="text-xs text-muted-foreground">
                Target workouts per week.
              </p>
            </div>
            <Stepper
              value={`${goal}`}
              onDec={() => changeGoal(goal - 1)}
              onInc={() => changeGoal(goal + 1)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Default rest timer</p>
              <p className="text-xs text-muted-foreground">
                Starts automatically when you finish a set.
              </p>
            </div>
            <Stepper
              value={fmtRest(rest)}
              onDec={() => changeRest(rest - 15)}
              onInc={() => changeRest(rest + 15)}
            />
          </div>
        </div>
      </section>

      {/* Push reminders */}
      <PushToggle />

      {/* Reminders */}
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="font-medium">Reminders</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which nudges you get (in-app bell + push, when enabled).
        </p>
        <div className="mt-4 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Reminder time</p>
              <p className="text-xs text-muted-foreground">
                When daily &amp; weekly reminders are sent — your local time.
              </p>
            </div>
            <Stepper
              value={fmtHour(reminderHour)}
              onDec={() => changeReminderHour(reminderHour - 1)}
              onInc={() => changeReminderHour(reminderHour + 1)}
            />
          </div>
          <ReminderRow
            title="Daily exercise"
            desc="A nudge to train (or log recovery) if you've been inactive today."
            on={rem.remindExercise}
            onToggle={() => toggleReminder("remindExercise")}
          />
          <ReminderRow
            title="Weekly weigh-in"
            desc="A Monday reminder to log your body weight."
            on={rem.remindWeighIn}
            onToggle={() => toggleReminder("remindWeighIn")}
          />
          <ReminderRow
            title="Rest timer done"
            desc="Push when your rest timer reaches zero."
            on={rem.remindRest}
            onToggle={() => toggleReminder("remindRest")}
          />
        </div>
      </section>

      {/* Account */}
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="font-medium">Account</h2>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="truncate font-medium">{name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="truncate font-medium">{email}</dd>
          </div>
        </dl>
      </section>

      {/* Export data */}
      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="font-medium">Export your data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Download a CSV of everything you&apos;ve logged.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={exportWorkouts}
            disabled={exporting !== null}
          >
            <DownloadSimple className="size-4" />
            {exporting === "workouts" ? "Exporting…" : "Workouts CSV"}
          </Button>
          <Button
            variant="secondary"
            onClick={exportBody}
            disabled={exporting !== null}
          >
            <DownloadSimple className="size-4" />
            {exporting === "body" ? "Exporting…" : "Body log CSV"}
          </Button>
        </div>
      </section>

      {/* Sign out */}
      <SignOutButton redirectUrl="/sign-in">
        <button className="flex items-center justify-center gap-2 self-start rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted">
          <SignOut className="size-4" />
          Sign out
        </button>
      </SignOutButton>

      {/* Danger zone */}
      <section className="rounded-card border border-red-500/30 bg-card p-5">
        <h2 className="font-medium text-red-600">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Permanently delete your account and all your workouts and body data.
          This can&apos;t be undone.
        </p>
        <Button
          variant="danger-outline"
          onClick={() => {
            setDeleteError(null);
            setConfirmDelete(true);
          }}
          className="mt-4"
        >
          <TrashSimple className="size-4" />
          Delete account
        </Button>
      </section>

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
                Delete account?
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This permanently deletes your Liftify login and every workout and
              body entry you&apos;ve logged. This cannot be undone.
            </p>
            {deleteError && (
              <p className="mt-3 text-sm text-red-600">{deleteError}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
