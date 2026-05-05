// Weekly quests — a small rotating set of goals the user works toward.
// 3 quests are active per week; the picker is deterministic on the week
// timestamp so all clients (and Convex) agree on which quests are active.

export type QuestKey =
  | "train_3x"
  | "train_4x"
  | "train_5x"
  | "set_pr"
  | "log_bodyweight_3x"
  | "log_bodyweight_5x"
  | "weekly_volume_5000"
  | "weekly_volume_10000"
  | "weekly_volume_20000"
  | "log_50_sets"
  | "log_100_sets"
  | "log_cardio";

// Events published by mutations that increment quest progress. The Convex
// `progressQuests` mutation maps these event types to the quests they
// advance via the catalog below.
export type QuestEvent =
  | { type: "session_finished"; isCardio: boolean }
  | { type: "set_logged"; weightKg: number; reps: number }
  | { type: "metric_logged" }
  | { type: "pr_set" };

export type QuestDef = {
  key: QuestKey;
  name: string;
  description: string;
  icon: string;
  target: number;
  // Returns the increment (in target units) for this event, or 0 if the
  // event doesn't progress this quest.
  incrementOn: (event: QuestEvent) => number;
};

export const QUESTS: QuestDef[] = [
  {
    key: "train_3x",
    name: "Build the habit",
    description: "Complete 3 workouts this week.",
    icon: "barbell-outline",
    target: 3,
    incrementOn: (event) => (event.type === "session_finished" ? 1 : 0),
  },
  {
    key: "train_4x",
    name: "Train 4× this week",
    description: "Complete 4 workouts this week.",
    icon: "calendar-outline",
    target: 4,
    incrementOn: (event) => (event.type === "session_finished" ? 1 : 0),
  },
  {
    key: "train_5x",
    name: "Five-star week",
    description: "Complete 5 workouts this week.",
    icon: "star-outline",
    target: 5,
    incrementOn: (event) => (event.type === "session_finished" ? 1 : 0),
  },
  {
    key: "set_pr",
    name: "Hit a new PR",
    description: "Set at least one personal record.",
    icon: "flash-outline",
    target: 1,
    incrementOn: (event) => (event.type === "pr_set" ? 1 : 0),
  },
  {
    key: "log_bodyweight_3x",
    name: "Step on the scale",
    description: "Log bodyweight 3 days.",
    icon: "scale-outline",
    target: 3,
    incrementOn: (event) => (event.type === "metric_logged" ? 1 : 0),
  },
  {
    key: "log_bodyweight_5x",
    name: "Daily check-in",
    description: "Log bodyweight 5 days.",
    icon: "scale-outline",
    target: 5,
    incrementOn: (event) => (event.type === "metric_logged" ? 1 : 0),
  },
  {
    key: "weekly_volume_5000",
    name: "Weekly volume — 5,000 kg",
    description: "Total weight × reps across all sets this week.",
    icon: "trending-up-outline",
    target: 5000,
    incrementOn: (event) =>
      event.type === "set_logged" ? event.weightKg * event.reps : 0,
  },
  {
    key: "weekly_volume_10000",
    name: "Weekly volume — 10,000 kg",
    description: "Total weight × reps across all sets this week.",
    icon: "trending-up-outline",
    target: 10000,
    incrementOn: (event) =>
      event.type === "set_logged" ? event.weightKg * event.reps : 0,
  },
  {
    key: "weekly_volume_20000",
    name: "Weekly volume — 20,000 kg",
    description: "Total weight × reps across all sets this week.",
    icon: "trending-up-outline",
    target: 20000,
    incrementOn: (event) =>
      event.type === "set_logged" ? event.weightKg * event.reps : 0,
  },
  {
    key: "log_50_sets",
    name: "50-set week",
    description: "Log 50 sets total.",
    icon: "checkmark-circle-outline",
    target: 50,
    incrementOn: (event) => (event.type === "set_logged" ? 1 : 0),
  },
  {
    key: "log_100_sets",
    name: "100-set week",
    description: "Log 100 sets total.",
    icon: "checkmark-done-circle-outline",
    target: 100,
    incrementOn: (event) => (event.type === "set_logged" ? 1 : 0),
  },
  {
    key: "log_cardio",
    name: "Mix in cardio",
    description: "Log at least one cardio session.",
    icon: "bicycle-outline",
    target: 1,
    incrementOn: (event) =>
      event.type === "session_finished" && event.isCardio ? 1 : 0,
  },
];

export const findQuest = (key: string): QuestDef | undefined => {
  return QUESTS.find((q) => q.key === key);
};

// Get the timestamp (ms since epoch) of the Monday 00:00 (local time of the
// caller) that contains the given timestamp. Quests are bucketed by this
// "weekStart" value.
export const getWeekStart = (timestamp: number): number => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  const dayOfWeek = date.getDay(); // 0 (Sun) ... 6 (Sat)
  // Treat Monday as the first day of the week.
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setDate(date.getDate() + offsetToMonday);
  return date.getTime();
};

// Hash function (FNV-1a) used to deterministically derive a number from the
// week timestamp. Same input → same output, different weeks → very different
// outputs.
const hashWeek = (weekStart: number): number => {
  let hash = 2166136261;
  const str = weekStart.toString();
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash;
};

// Pick a fixed set of N quests for a given week. Deterministic — the same
// week always yields the same picks, regardless of which client computes it.
const QUESTS_PER_WEEK = 3;

export const pickWeeklyQuests = (
  weekStart: number,
  count: number = QUESTS_PER_WEEK,
): QuestKey[] => {
  const indices: number[] = [];
  let hash = hashWeek(weekStart);
  const available = QUESTS.length;
  while (indices.length < count && indices.length < available) {
    const next = hash % available;
    if (!indices.includes(next)) indices.push(next);
    hash = (hash * 16777619) >>> 0;
  }
  return indices.map((i) => QUESTS[i]!.key);
};
