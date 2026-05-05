// XP rules + level curve. Pure functions, used by both Convex (when granting
// XP server-side) and the mobile UI (for showing progress to next level,
// estimating animations, etc.). Never mutate from these — always return new
// values.

export const XP_REWARDS = {
  // Finishing a session sourced from a plan day, with at least one logged set.
  SESSION_PLANNED: 100,
  // Finishing a freeform session with at least one logged set.
  SESSION_FREEFORM: 60,
  // Per individual set logged during a workout.
  SET_LOGGED: 2,
  // First time you beat a previous top-weight or 1RM-estimate on an exercise.
  PERSONAL_RECORD: 50,
  // Each body-metrics entry logged.
  METRIC_LOGGED: 10,
  // Completing a weekly quest.
  QUEST_COMPLETED: 75,
} as const;

// Triangular level curve: level n → n+1 requires 100 * n XP, so cumulative
// XP to reach level n+1 from level 1 is 100 * (n * (n + 1) / 2).
//   Level 1 → 2: needs 100 XP
//   Level 2 → 3: needs 200 XP (cumulative 300)
//   Level 3 → 4: needs 300 XP (cumulative 600)
//   Level n → n+1: needs 100 * n XP
//
// Soft pace: an active user logging ~3 workouts/week (~500 XP/wk) will reach
// level ~5 in their first month.
export const xpForLevelUp = (currentLevel: number): number => {
  if (currentLevel < 1) return 100;
  return 100 * currentLevel;
};

// Cumulative XP needed to *reach* the start of a given level.
//   level 1 → 0
//   level 2 → 100
//   level 3 → 300
//   level n → 100 * (n - 1) * n / 2
export const cumulativeXpForLevel = (level: number): number => {
  if (level <= 1) return 0;
  return (100 * (level - 1) * level) / 2;
};

// Given total XP earned, what level are they on?
export const levelFromXp = (xp: number): number => {
  if (xp < 100) return 1;
  // Solve 100 * (n - 1) * n / 2 <= xp for n.
  // n^2 - n - (xp / 50) <= 0  →  n <= (1 + sqrt(1 + 8 * xp / 100)) / 2
  const level = Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2);
  return Math.max(1, level);
};

// Progress within the current level, used by the XP bar.
//   xpIntoLevel: how much XP they've earned within the current level.
//   xpForLevel: total XP needed to advance to the next level.
//   ratio: 0..1, fraction of progress.
export const levelProgress = (xp: number) => {
  const level = levelFromXp(xp);
  const cumulativeAtCurrent = cumulativeXpForLevel(level);
  const cumulativeAtNext = cumulativeXpForLevel(level + 1);
  const xpIntoLevel = xp - cumulativeAtCurrent;
  const xpForLevel = cumulativeAtNext - cumulativeAtCurrent;
  const ratio = xpForLevel === 0 ? 0 : xpIntoLevel / xpForLevel;
  return { level, xpIntoLevel, xpForLevel, ratio };
};
