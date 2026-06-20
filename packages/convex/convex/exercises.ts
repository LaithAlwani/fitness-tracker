import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";

// Read-only exercise name library — powers fast autocomplete on the Log screen.
// Liftify is lifting-focused, so this is a curated strength list.
export const list = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, { search }) => {
    const all = await ctx.db.query("exercises").withIndex("by_name").collect();
    const sorted = all.sort((a, b) => a.name.localeCompare(b.name));
    const term = search?.trim().toLowerCase();
    if (!term) return sorted;
    return sorted.filter((e) => e.name.toLowerCase().includes(term));
  },
});

const SEED: Array<{ name: string; muscleGroup?: string; equipment?: string }> = [
  // Chest
  { name: "Barbell Bench Press", muscleGroup: "chest", equipment: "barbell" },
  { name: "Incline Barbell Bench Press", muscleGroup: "chest", equipment: "barbell" },
  { name: "Dumbbell Bench Press", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Incline Dumbbell Bench Press", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Dumbbell Fly", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Cable Crossover", muscleGroup: "chest", equipment: "cable" },
  { name: "Push Up", muscleGroup: "chest", equipment: "bodyweight" },
  { name: "Dips", muscleGroup: "chest", equipment: "bodyweight" },
  // Back
  { name: "Deadlift", muscleGroup: "back", equipment: "barbell" },
  { name: "Barbell Row", muscleGroup: "back", equipment: "barbell" },
  { name: "Dumbbell Row", muscleGroup: "back", equipment: "dumbbell" },
  { name: "Pull Up", muscleGroup: "back", equipment: "bodyweight" },
  { name: "Chin Up", muscleGroup: "back", equipment: "bodyweight" },
  { name: "Lat Pulldown", muscleGroup: "back", equipment: "cable" },
  { name: "Seated Cable Row", muscleGroup: "back", equipment: "cable" },
  { name: "T-Bar Row", muscleGroup: "back", equipment: "barbell" },
  { name: "Face Pull", muscleGroup: "back", equipment: "cable" },
  // Shoulders
  { name: "Overhead Press", muscleGroup: "shoulders", equipment: "barbell" },
  { name: "Seated Dumbbell Press", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Arnold Press", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Lateral Raise", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Front Raise", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Reverse Fly", muscleGroup: "shoulders", equipment: "dumbbell" },
  // Biceps
  { name: "Barbell Curl", muscleGroup: "biceps", equipment: "barbell" },
  { name: "Dumbbell Curl", muscleGroup: "biceps", equipment: "dumbbell" },
  { name: "Hammer Curl", muscleGroup: "biceps", equipment: "dumbbell" },
  { name: "Preacher Curl", muscleGroup: "biceps", equipment: "barbell" },
  { name: "Cable Curl", muscleGroup: "biceps", equipment: "cable" },
  // Triceps
  { name: "Close-Grip Bench Press", muscleGroup: "triceps", equipment: "barbell" },
  { name: "Tricep Pushdown", muscleGroup: "triceps", equipment: "cable" },
  { name: "Skull Crusher", muscleGroup: "triceps", equipment: "barbell" },
  { name: "Overhead Tricep Extension", muscleGroup: "triceps", equipment: "dumbbell" },
  // Quads
  { name: "Back Squat", muscleGroup: "quads", equipment: "barbell" },
  { name: "Front Squat", muscleGroup: "quads", equipment: "barbell" },
  { name: "Leg Press", muscleGroup: "quads", equipment: "machine" },
  { name: "Leg Extension", muscleGroup: "quads", equipment: "machine" },
  { name: "Bulgarian Split Squat", muscleGroup: "quads", equipment: "dumbbell" },
  { name: "Lunge", muscleGroup: "quads", equipment: "dumbbell" },
  { name: "Goblet Squat", muscleGroup: "quads", equipment: "dumbbell" },
  // Hamstrings / Glutes
  { name: "Romanian Deadlift", muscleGroup: "hamstrings", equipment: "barbell" },
  { name: "Lying Leg Curl", muscleGroup: "hamstrings", equipment: "machine" },
  { name: "Seated Leg Curl", muscleGroup: "hamstrings", equipment: "machine" },
  { name: "Hip Thrust", muscleGroup: "glutes", equipment: "barbell" },
  { name: "Glute Bridge", muscleGroup: "glutes", equipment: "bodyweight" },
  // Calves / Abs / Traps
  { name: "Standing Calf Raise", muscleGroup: "calves", equipment: "machine" },
  { name: "Seated Calf Raise", muscleGroup: "calves", equipment: "machine" },
  { name: "Plank", muscleGroup: "abs", equipment: "bodyweight" },
  { name: "Hanging Leg Raise", muscleGroup: "abs", equipment: "bodyweight" },
  { name: "Cable Crunch", muscleGroup: "abs", equipment: "cable" },
  { name: "Barbell Shrug", muscleGroup: "traps", equipment: "barbell" },
];

// Idempotent seed. Run via: npm exec --workspace @liftify/convex -- convex run exercises:seed
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("exercises").collect();
    const names = new Set(existing.map((e) => e.name));
    let inserted = 0;
    for (const ex of SEED) {
      if (names.has(ex.name)) continue;
      await ctx.db.insert("exercises", ex);
      inserted += 1;
    }
    return { inserted, total: names.size + inserted };
  },
});
