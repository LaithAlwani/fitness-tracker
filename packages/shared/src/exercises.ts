// Domain constants shared between the Convex backend and the mobile UI.
// These are *suggestions* — schema fields stay free-form strings so users
// can add custom values like "rear delts" or unusual equipment.

export const EXERCISE_CATEGORIES = ["strength", "cardio"] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "traps",
  "full body",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT_TYPES = [
  "barbell",
  "dumbbell",
  "bodyweight",
  "machine",
  "cable",
  "kettlebell",
  "resistance band",
  "treadmill",
  "bike",
  "rower",
  "other",
] as const;
export type Equipment = (typeof EQUIPMENT_TYPES)[number];

export const formatMuscleGroup = (value: string | undefined) => {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
};
