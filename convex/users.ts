import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// TODO(auth): replace with real OTP / Convex Auth. Dev stub: a user is matched
// by phone, and any code of 4+ characters is accepted while DEV_LOGIN=true.
export const login = mutation({
  args: { phone: v.string(), code: v.string() },
  handler: async (ctx, { phone, code }) => {
    const user = await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phone", phone)).unique();
    if (!user || !user.active) throw new Error("No active user with this number");
    if (process.env.DEV_LOGIN !== "true") throw new Error("OTP login is not configured");
    if (code.length < 4) throw new Error("Invalid code");
    return user;
  },
});

export const get = query({
  args: { id: v.id("users") },
  handler: (ctx, { id }) => ctx.db.get(id),
});

export const create = mutation({
  args: { name: v.string(), phone: v.string(), role: v.union(v.literal("inspector"), v.literal("admin")) },
  handler: (ctx, a) => ctx.db.insert("users", { ...a, active: true }),
});
