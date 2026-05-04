import { v } from "convex/values";

import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

const exerciseCategoryValidator = v.union(
  v.literal("strength"),
  v.literal("cardio"),
);

async function getCurrentUserOrThrow(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) {
    throw new Error("User row missing — call getOrCreateCurrentUser first");
  }
  return user;
}

export const list = query({
  args: {
    category: v.optional(exerciseCategoryValidator),
    muscleGroup: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, { category, muscleGroup, includeArchived }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    const allExercises = await ctx.db.query("exercises").collect();

    return allExercises
      .filter((exercise) => {
        const isVisibleToUser =
          exercise.userId === undefined ||
          (currentUser && exercise.userId === currentUser._id);
        if (!isVisibleToUser) return false;
        if (!includeArchived && exercise.archived) return false;
        if (category && exercise.category !== category) return false;
        if (muscleGroup && exercise.muscleGroup !== muscleGroup) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: exerciseCategoryValidator,
    muscleGroup: v.optional(v.string()),
    equipment: v.optional(v.string()),
  },
  handler: async (ctx, { name, category, muscleGroup, equipment }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const trimmedName = name.trim();
    if (trimmedName.length === 0) throw new Error("Name is required");

    return await ctx.db.insert("exercises", {
      userId: user._id,
      name: trimmedName,
      category,
      muscleGroup: muscleGroup?.trim() || undefined,
      equipment: equipment?.trim() || undefined,
      archived: false,
    });
  },
});

export const update = mutation({
  args: {
    exerciseId: v.id("exercises"),
    name: v.optional(v.string()),
    category: v.optional(exerciseCategoryValidator),
    muscleGroup: v.optional(v.string()),
    equipment: v.optional(v.string()),
  },
  handler: async (ctx, { exerciseId, ...patch }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const exercise = await ctx.db.get(exerciseId);
    if (!exercise) throw new Error("Exercise not found");
    if (exercise.userId !== user._id) {
      throw new Error("Cannot edit a seeded exercise — create a custom one instead");
    }

    const cleanedPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) cleanedPatch.name = patch.name.trim();
    if (patch.category !== undefined) cleanedPatch.category = patch.category;
    if (patch.muscleGroup !== undefined) {
      cleanedPatch.muscleGroup = patch.muscleGroup.trim() || undefined;
    }
    if (patch.equipment !== undefined) {
      cleanedPatch.equipment = patch.equipment.trim() || undefined;
    }

    await ctx.db.patch(exerciseId, cleanedPatch);
  },
});

export const archive = mutation({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, { exerciseId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const exercise = await ctx.db.get(exerciseId);
    if (!exercise) throw new Error("Exercise not found");
    if (exercise.userId !== user._id) {
      throw new Error("Cannot archive a seeded exercise");
    }
    await ctx.db.patch(exerciseId, { archived: true });
  },
});

export const restore = mutation({
  args: { exerciseId: v.id("exercises") },
  handler: async (ctx, { exerciseId }) => {
    const user = await getCurrentUserOrThrow(ctx);
    const exercise = await ctx.db.get(exerciseId);
    if (!exercise) throw new Error("Exercise not found");
    if (exercise.userId !== user._id) {
      throw new Error("Cannot restore a seeded exercise");
    }
    await ctx.db.patch(exerciseId, { archived: false });
  },
});

// ----- Seed -----
// Curated ~60 common exercises covering major muscle groups.
// Run via: pnpm --filter @fitness/convex exec convex run exercises:seed
//
// Idempotent: if a global exercise with the same name already exists, skip it.
// Safe to re-run after adding new entries to the array.

const SEED_EXERCISES: Array<{
  name: string;
  category: "strength" | "cardio";
  muscleGroup?: string;
  equipment?: string;
}> = [
  // Chest
  { name: "Barbell Bench Press", category: "strength", muscleGroup: "chest", equipment: "barbell" },
  { name: "Incline Barbell Bench Press", category: "strength", muscleGroup: "chest", equipment: "barbell" },
  { name: "Dumbbell Bench Press", category: "strength", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Incline Dumbbell Bench Press", category: "strength", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Dumbbell Fly", category: "strength", muscleGroup: "chest", equipment: "dumbbell" },
  { name: "Cable Crossover", category: "strength", muscleGroup: "chest", equipment: "cable" },
  { name: "Push Up", category: "strength", muscleGroup: "chest", equipment: "bodyweight" },
  { name: "Dips", category: "strength", muscleGroup: "chest", equipment: "bodyweight" },

  // Back
  { name: "Deadlift", category: "strength", muscleGroup: "back", equipment: "barbell" },
  { name: "Barbell Row", category: "strength", muscleGroup: "back", equipment: "barbell" },
  { name: "Pendlay Row", category: "strength", muscleGroup: "back", equipment: "barbell" },
  { name: "Dumbbell Row", category: "strength", muscleGroup: "back", equipment: "dumbbell" },
  { name: "Pull Up", category: "strength", muscleGroup: "back", equipment: "bodyweight" },
  { name: "Chin Up", category: "strength", muscleGroup: "back", equipment: "bodyweight" },
  { name: "Lat Pulldown", category: "strength", muscleGroup: "back", equipment: "cable" },
  { name: "Seated Cable Row", category: "strength", muscleGroup: "back", equipment: "cable" },
  { name: "T-Bar Row", category: "strength", muscleGroup: "back", equipment: "barbell" },
  { name: "Face Pull", category: "strength", muscleGroup: "back", equipment: "cable" },

  // Shoulders
  { name: "Overhead Press", category: "strength", muscleGroup: "shoulders", equipment: "barbell" },
  { name: "Seated Dumbbell Press", category: "strength", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Arnold Press", category: "strength", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Lateral Raise", category: "strength", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Front Raise", category: "strength", muscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Reverse Fly", category: "strength", muscleGroup: "shoulders", equipment: "dumbbell" },

  // Biceps
  { name: "Barbell Curl", category: "strength", muscleGroup: "biceps", equipment: "barbell" },
  { name: "Dumbbell Curl", category: "strength", muscleGroup: "biceps", equipment: "dumbbell" },
  { name: "Hammer Curl", category: "strength", muscleGroup: "biceps", equipment: "dumbbell" },
  { name: "Preacher Curl", category: "strength", muscleGroup: "biceps", equipment: "barbell" },
  { name: "Cable Curl", category: "strength", muscleGroup: "biceps", equipment: "cable" },

  // Triceps
  { name: "Close-Grip Bench Press", category: "strength", muscleGroup: "triceps", equipment: "barbell" },
  { name: "Tricep Pushdown", category: "strength", muscleGroup: "triceps", equipment: "cable" },
  { name: "Skull Crusher", category: "strength", muscleGroup: "triceps", equipment: "barbell" },
  { name: "Overhead Tricep Extension", category: "strength", muscleGroup: "triceps", equipment: "dumbbell" },
  { name: "Tricep Dip", category: "strength", muscleGroup: "triceps", equipment: "bodyweight" },

  // Quads
  { name: "Back Squat", category: "strength", muscleGroup: "quads", equipment: "barbell" },
  { name: "Front Squat", category: "strength", muscleGroup: "quads", equipment: "barbell" },
  { name: "Leg Press", category: "strength", muscleGroup: "quads", equipment: "machine" },
  { name: "Leg Extension", category: "strength", muscleGroup: "quads", equipment: "machine" },
  { name: "Bulgarian Split Squat", category: "strength", muscleGroup: "quads", equipment: "dumbbell" },
  { name: "Lunge", category: "strength", muscleGroup: "quads", equipment: "dumbbell" },
  { name: "Goblet Squat", category: "strength", muscleGroup: "quads", equipment: "dumbbell" },

  // Hamstrings
  { name: "Romanian Deadlift", category: "strength", muscleGroup: "hamstrings", equipment: "barbell" },
  { name: "Lying Leg Curl", category: "strength", muscleGroup: "hamstrings", equipment: "machine" },
  { name: "Seated Leg Curl", category: "strength", muscleGroup: "hamstrings", equipment: "machine" },
  { name: "Good Morning", category: "strength", muscleGroup: "hamstrings", equipment: "barbell" },

  // Glutes
  { name: "Hip Thrust", category: "strength", muscleGroup: "glutes", equipment: "barbell" },
  { name: "Glute Bridge", category: "strength", muscleGroup: "glutes", equipment: "bodyweight" },
  { name: "Cable Pull-Through", category: "strength", muscleGroup: "glutes", equipment: "cable" },

  // Calves
  { name: "Standing Calf Raise", category: "strength", muscleGroup: "calves", equipment: "machine" },
  { name: "Seated Calf Raise", category: "strength", muscleGroup: "calves", equipment: "machine" },

  // Abs
  { name: "Plank", category: "strength", muscleGroup: "abs", equipment: "bodyweight" },
  { name: "Hanging Leg Raise", category: "strength", muscleGroup: "abs", equipment: "bodyweight" },
  { name: "Cable Crunch", category: "strength", muscleGroup: "abs", equipment: "cable" },
  { name: "Russian Twist", category: "strength", muscleGroup: "abs", equipment: "bodyweight" },
  { name: "Ab Wheel Rollout", category: "strength", muscleGroup: "abs", equipment: "other" },

  // Forearms / Traps
  { name: "Wrist Curl", category: "strength", muscleGroup: "forearms", equipment: "dumbbell" },
  { name: "Barbell Shrug", category: "strength", muscleGroup: "traps", equipment: "barbell" },

  // Cardio
  { name: "Treadmill Run", category: "cardio", muscleGroup: "full body", equipment: "treadmill" },
  { name: "Outdoor Run", category: "cardio", muscleGroup: "full body", equipment: "bodyweight" },
  { name: "Walking", category: "cardio", muscleGroup: "full body", equipment: "bodyweight" },
  { name: "Stationary Bike", category: "cardio", muscleGroup: "full body", equipment: "bike" },
  { name: "Outdoor Cycling", category: "cardio", muscleGroup: "full body", equipment: "bike" },
  { name: "Rowing Machine", category: "cardio", muscleGroup: "full body", equipment: "rower" },
  { name: "Stair Climber", category: "cardio", muscleGroup: "full body", equipment: "machine" },
  { name: "Elliptical", category: "cardio", muscleGroup: "full body", equipment: "machine" },
  { name: "Jump Rope", category: "cardio", muscleGroup: "full body", equipment: "other" },
];

export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existingGlobalExercises = await ctx.db.query("exercises").collect();
    const existingGlobalNames = new Set(
      existingGlobalExercises
        .filter((exercise) => exercise.userId === undefined)
        .map((exercise) => exercise.name),
    );

    let inserted = 0;
    for (const seedExercise of SEED_EXERCISES) {
      if (existingGlobalNames.has(seedExercise.name)) continue;
      await ctx.db.insert("exercises", {
        userId: undefined,
        name: seedExercise.name,
        category: seedExercise.category,
        muscleGroup: seedExercise.muscleGroup,
        equipment: seedExercise.equipment,
        archived: false,
      });
      inserted += 1;
    }

    return {
      inserted,
      totalInLibrary: existingGlobalNames.size + inserted,
    };
  },
});
