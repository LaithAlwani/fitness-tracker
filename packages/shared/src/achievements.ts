// Achievement catalog — the source of truth for every badge.
// Predicates are evaluated against UserTotals computed by the Convex backend
// (or any other client) so the same code decides "is this unlocked" everywhere.

export type UserTotals = {
  totalWorkouts: number;
  totalCardioWorkouts: number;
  totalSetsLogged: number;
  totalPRs: number;
  maxConsecutiveQuestWeeks: number;
  totalBodyweightLogs: number;
  largestSessionVolumeKg: number;
  longestPRStreakOnSingleExerciseKg: number;
  longestPRStreakOnSingleExerciseCount: number;
};

export type AchievementKey =
  | "first_workout"
  | "workouts_10"
  | "workouts_50"
  | "workouts_100"
  | "first_pr"
  | "pr_streak_5"
  | "volume_1000kg"
  | "consistency_4w"
  | "cardio_pioneer"
  | "metric_diligent"
  | "set_grinder_100"
  | "set_grinder_500"
  | "level_5"
  | "level_10";

export type AchievementDef = {
  key: AchievementKey;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  predicate: (totals: UserTotals, level: number) => boolean;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "first_workout",
    name: "First Lift",
    description: "Complete your first workout.",
    icon: "barbell-outline",
    xpReward: 25,
    predicate: (totals) => totals.totalWorkouts >= 1,
  },
  {
    key: "workouts_10",
    name: "Getting Started",
    description: "Complete 10 workouts.",
    icon: "ribbon-outline",
    xpReward: 50,
    predicate: (totals) => totals.totalWorkouts >= 10,
  },
  {
    key: "workouts_50",
    name: "Half Century",
    description: "Complete 50 workouts.",
    icon: "trophy-outline",
    xpReward: 150,
    predicate: (totals) => totals.totalWorkouts >= 50,
  },
  {
    key: "workouts_100",
    name: "Centurion",
    description: "Complete 100 workouts.",
    icon: "shield-checkmark-outline",
    xpReward: 300,
    predicate: (totals) => totals.totalWorkouts >= 100,
  },
  {
    key: "first_pr",
    name: "Personal Best",
    description: "Set your first personal record.",
    icon: "flash-outline",
    xpReward: 30,
    predicate: (totals) => totals.totalPRs >= 1,
  },
  {
    key: "pr_streak_5",
    name: "On a Roll",
    description: "Set 5 PRs on a single exercise.",
    icon: "trending-up-outline",
    xpReward: 100,
    predicate: (totals) => totals.longestPRStreakOnSingleExerciseCount >= 5,
  },
  {
    key: "volume_1000kg",
    name: "Heavy Hitter",
    description: "Move 1000 kg of total volume in a single session.",
    icon: "barbell",
    xpReward: 100,
    predicate: (totals) => totals.largestSessionVolumeKg >= 1000,
  },
  {
    key: "consistency_4w",
    name: "Consistency King",
    description: "Complete a weekly quest 4 weeks in a row.",
    icon: "calendar-outline",
    xpReward: 200,
    predicate: (totals) => totals.maxConsecutiveQuestWeeks >= 4,
  },
  {
    key: "cardio_pioneer",
    name: "Cardio Pioneer",
    description: "Log your first cardio session.",
    icon: "bicycle-outline",
    xpReward: 25,
    predicate: (totals) => totals.totalCardioWorkouts >= 1,
  },
  {
    key: "metric_diligent",
    name: "Diligent Logger",
    description: "Log bodyweight 10 times.",
    icon: "scale-outline",
    xpReward: 75,
    predicate: (totals) => totals.totalBodyweightLogs >= 10,
  },
  {
    key: "set_grinder_100",
    name: "Set Grinder",
    description: "Log 100 sets.",
    icon: "checkmark-circle-outline",
    xpReward: 75,
    predicate: (totals) => totals.totalSetsLogged >= 100,
  },
  {
    key: "set_grinder_500",
    name: "Set Master",
    description: "Log 500 sets.",
    icon: "checkmark-done-circle-outline",
    xpReward: 250,
    predicate: (totals) => totals.totalSetsLogged >= 500,
  },
  {
    key: "level_5",
    name: "Rookie",
    description: "Reach level 5.",
    icon: "star-outline",
    xpReward: 50,
    predicate: (_totals, level) => level >= 5,
  },
  {
    key: "level_10",
    name: "Veteran",
    description: "Reach level 10.",
    icon: "star",
    xpReward: 200,
    predicate: (_totals, level) => level >= 10,
  },
];

// All achievement keys as a constant for easy iteration.
export const ACHIEVEMENT_KEYS: AchievementKey[] = ACHIEVEMENTS.map((a) => a.key);

export const findAchievement = (key: string): AchievementDef | undefined => {
  return ACHIEVEMENTS.find((a) => a.key === key);
};

// Returns the keys of any achievements the user *now* qualifies for. Caller
// is expected to filter against the user's already-unlocked set before
// granting XP / writing rows.
export const evaluateAchievements = (
  totals: UserTotals,
  level: number,
): AchievementKey[] => {
  return ACHIEVEMENTS.filter((def) => def.predicate(totals, level)).map(
    (def) => def.key,
  );
};
