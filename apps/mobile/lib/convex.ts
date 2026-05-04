import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_CONVEX_URL. Add it to apps/mobile/.env.local — copy it from Convex dashboard after running `pnpm convex:dev`.",
  );
}

export const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
});
