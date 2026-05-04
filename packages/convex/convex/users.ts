import { mutation, query } from "./_generated/server";

export const getOrCreateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existingUser) {
      const needsNameUpdate =
        identity.givenName && existingUser.firstName !== identity.givenName;
      const needsLastNameUpdate =
        identity.familyName && existingUser.lastName !== identity.familyName;
      const needsEmailUpdate =
        identity.email && existingUser.email !== identity.email;

      if (needsNameUpdate || needsLastNameUpdate || needsEmailUpdate) {
        await ctx.db.patch(existingUser._id, {
          firstName: identity.givenName ?? existingUser.firstName,
          lastName: identity.familyName ?? existingUser.lastName,
          email: identity.email ?? existingUser.email,
        });
      }

      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email ?? "",
      firstName: identity.givenName ?? "",
      lastName: identity.familyName ?? "",
      units: "kg",
      createdAt: Date.now(),
    });

    return userId;
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});
