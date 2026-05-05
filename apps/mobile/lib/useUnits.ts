import { useQuery } from "convex/react";

import { api } from "@fitness/convex";
import type { WeightUnit } from "@fitness/shared";

// Single source of truth for the user's preferred weight unit. Convex caches
// the underlying query, so calling this hook in many components is cheap —
// they all share one subscription to api.users.me.
export function useUnits(): WeightUnit {
  const me = useQuery(api.users.me);
  return me?.units ?? "kg";
}
