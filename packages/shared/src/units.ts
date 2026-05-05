// Canonical storage: weights are always stored in kg in Convex. Convert at the
// edges (input → kg before saving, kg → user's unit before displaying).

export type WeightUnit = "kg" | "lb";

const KG_PER_LB = 0.45359237;
const LB_PER_KG = 1 / KG_PER_LB;

export const kgToLb = (kg: number): number => kg * LB_PER_KG;
export const lbToKg = (lb: number): number => lb * KG_PER_LB;

// Round to 1 decimal place for display, dropping trailing .0.
const roundDisplay = (value: number): string => {
  const rounded = Math.round(value * 10) / 10;
  return rounded.toString().replace(/\.0$/, "");
};

// Display a kg value in the user's preferred unit. Used for set rows, target
// previews, etc.  Returns e.g. "60 kg" or "132.3 lb".
export const formatWeight = (kg: number, units: WeightUnit): string => {
  if (units === "lb") {
    return `${roundDisplay(kgToLb(kg))} lb`;
  }
  return `${roundDisplay(kg)} kg`;
};

// Same as formatWeight but only the number, no unit suffix. For input
// placeholders / default values where the unit is shown separately.
export const formatWeightValue = (kg: number, units: WeightUnit): string => {
  if (units === "lb") {
    return roundDisplay(kgToLb(kg));
  }
  return roundDisplay(kg);
};

// Parse a user-typed input back to canonical kg. Returns undefined on bad input
// so callers can validate before saving.
export const parseWeightInputToKg = (
  input: string,
  units: WeightUnit,
): number | undefined => {
  const trimmed = input.trim();
  if (trimmed.length === 0) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return units === "lb" ? lbToKg(parsed) : parsed;
};

// Convenience: just the unit suffix string for labels ("kg" or "lb").
export const weightUnitLabel = (units: WeightUnit): string => units;
