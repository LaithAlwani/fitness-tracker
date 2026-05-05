// PR (personal record) math — pure functions used by both Convex (for PR
// detection on session finish) and the mobile UI (for displaying PR cards
// and the progress chart).

// Epley formula for 1-rep max estimate. Industry standard, matches Strong/Hevy.
// Returns the same weight if reps == 1 (no estimation needed).
export const estimate1RM = (weight: number, reps: number): number => {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
};

export const calcSetVolume = (weight: number, reps: number): number =>
  weight * reps;

export type SetSnapshot = {
  weight: number;
  reps: number;
  completed: boolean;
};

// Pick the "best" set in a session for charting / PR detection. Default sort
// is by weight desc, then reps desc — matches how lifters intuitively rank
// "my best set today". For 1RM-leaning analysis, use findTopSetByOneRm.
export const findTopSetByWeight = (sets: SetSnapshot[]) => {
  const completed = sets.filter((set) => set.completed);
  if (completed.length === 0) return null;
  return [...completed].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return b.reps - a.reps;
  })[0]!;
};

export const findTopSetByOneRm = (sets: SetSnapshot[]) => {
  const completed = sets.filter((set) => set.completed);
  if (completed.length === 0) return null;
  return [...completed].sort(
    (a, b) => estimate1RM(b.weight, b.reps) - estimate1RM(a.weight, a.reps),
  )[0]!;
};

export const findTopSetByVolume = (sets: SetSnapshot[]) => {
  const completed = sets.filter((set) => set.completed);
  if (completed.length === 0) return null;
  return [...completed].sort(
    (a, b) => calcSetVolume(b.weight, b.reps) - calcSetVolume(a.weight, a.reps),
  )[0]!;
};

// Total volume (weight × reps summed over completed sets) for a single
// session — used by the History stat card and PR detection.
export const calcSessionVolume = (sets: SetSnapshot[]): number => {
  return sets
    .filter((set) => set.completed)
    .reduce((sum, set) => sum + calcSetVolume(set.weight, set.reps), 0);
};
