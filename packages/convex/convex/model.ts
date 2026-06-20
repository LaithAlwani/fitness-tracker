// Shared, non-public helpers (not Convex functions — just utilities the
// query/mutation modules import).
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

export const TRIAL_MS = 30 * 24 * 60 * 60 * 1000; // 30-day trial

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

export async function getCurrentUserOrThrow(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    throw new Error("User row missing — call users.getOrCreateCurrentUser first");
  }
  return user;
}

// The whole app is paid: access = an active subscription or an unexpired trial.
export function hasAccess(user: Doc<"users">, now: number): boolean {
  if (user.subscriptionStatus === "active") return true;
  if (user.subscriptionStatus === "trialing") {
    return user.trialEndsAt === undefined || user.trialEndsAt > now;
  }
  return false;
}

export function requireAccess(user: Doc<"users">, now: number): void {
  if (!hasAccess(user, now)) {
    throw new Error("Subscription required");
  }
}
