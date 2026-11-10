import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { roomCode } from "./schema";

// TODO(auth): every mutation here must be admin-only once auth exists.

async function bump(ctx: any, admin: string, summary: string) {
  const meta = await ctx.db.query("checklistMeta").first();
  const version = meta.version + 1;
  await ctx.db.patch(meta._id, { version, lastChangedAt: Date.now(), lastChangedBy: admin });
  await ctx.db.insert("checklistVersions", { version, at: Date.now(), admin, summary });
  return version;
}

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const meta = await ctx.db.query("checklistMeta").first();
    const cats = await ctx.db.query("categories").withIndex("by_order").collect();
    const out = await Promise.all(cats.map(async (c) => ({
      ...c,
      parameterCount: (await ctx.db.query("parameters").withIndex("by_category", (q) => q.eq("categoryId", c._id)).collect()).length,
    })));
    return { meta, categories: out };
  },
});

export const categoryDetail = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, { categoryId }) => ({
    category: await ctx.db.get(categoryId),
    parameters: await ctx.db.query("parameters").withIndex("by_category", (q) => q.eq("categoryId", categoryId)).collect(),
  }),
});

export const parameterDetail = query({
  args: { parameterId: v.id("parameters") },
  handler: async (ctx, { parameterId }) => ({
    parameter: await ctx.db.get(parameterId),
    defectTypes: await ctx.db.query("defectTypes").withIndex("by_parameter", (q) => q.eq("parameterId", parameterId)).collect(),
    usage: (await ctx.db.query("items").withIndex("by_parameter", (q) => q.eq("parameterId", parameterId)).collect()).length,
  }),
});

export const versions = query({
  args: {},
  handler: (ctx) => ctx.db.query("checklistVersions").withIndex("by_version").order("desc").collect(),
});

export const saveParameter = mutation({
  args: {
    admin: v.string(),
    parameterId: v.optional(v.id("parameters")),
    categoryId: v.id("categories"),
    name: v.string(), whatToCheck: v.string(), checkTypes: v.array(v.string()),
    extraInput: v.union(v.literal("none"), v.literal("number"), v.literal("text")),
    unit: v.string(), tool: v.string(), section: v.optional(v.string()),
    roomTypes: v.array(roomCode), active: v.boolean(),
  },
  handler: async (ctx, { admin, parameterId, ...p }) => {
    if (!p.name.trim()) throw new Error("Name is required");
    if (p.roomTypes.length === 0) throw new Error("Select at least one room type");
    const siblings = await ctx.db.query("parameters").withIndex("by_category", (q) => q.eq("categoryId", p.categoryId)).collect();
    if (siblings.some((s) => s.name.toLowerCase() === p.name.trim().toLowerCase() && s._id !== parameterId))
      throw new Error("A parameter with this name already exists.");
    let id: Id<"parameters">;
    if (parameterId) { await ctx.db.patch(parameterId, p); id = parameterId; }
    else {
      const cat = (await ctx.db.get(p.categoryId))!;
      const next = siblings.length + 1;
      id = await ctx.db.insert("parameters", { ...p, ref: `${cat.number}.${next}`, order: siblings.length });
    }
    const version = await bump(ctx, admin, `${parameterId ? "Edited" : "Added"} parameter '${p.name}'`);
    return { id, version };
  },
});

// Used rows can only be hidden; unused rows can be deleted permanently.
export const removeParameter = mutation({
  args: { admin: v.string(), parameterId: v.id("parameters") },
  handler: async (ctx, { admin, parameterId }) => {
    const p = await ctx.db.get(parameterId);
    if (!p) return { hidden: false };
    const used = await ctx.db.query("items").withIndex("by_parameter", (q) => q.eq("parameterId", parameterId)).first();
    if (used) {
      await ctx.db.patch(parameterId, { active: false });
      await bump(ctx, admin, `Hid '${p.name}'`);
      return { hidden: true };
    }
    for (const d of await ctx.db.query("defectTypes").withIndex("by_parameter", (q) => q.eq("parameterId", parameterId)).collect()) await ctx.db.delete(d._id);
    await ctx.db.delete(parameterId);
    await bump(ctx, admin, `Deleted '${p.name}'`);
    return { hidden: false };
  },
});

export const setCategoryActive = mutation({
  args: { admin: v.string(), categoryId: v.id("categories"), active: v.boolean() },
  handler: async (ctx, { admin, categoryId, active }) => {
    const c = await ctx.db.get(categoryId);
    if (!c) return;
    await ctx.db.patch(categoryId, { active });
    return bump(ctx, admin, `${active ? "Showed" : "Hid"} category '${c.name}'`);
  },
});

export const saveDefectType = mutation({
  args: {
    admin: v.string(), parameterId: v.id("parameters"), defectTypeId: v.optional(v.id("defectTypes")),
    name: v.string(), severity: v.union(v.literal("critical"), v.literal("major"), v.literal("minor")),
    photoRequired: v.boolean(), active: v.boolean(),
  },
  handler: async (ctx, { admin, defectTypeId, ...d }) => {
    if (defectTypeId) await ctx.db.patch(defectTypeId, d);
    else await ctx.db.insert("defectTypes", d);
    return bump(ctx, admin, `${defectTypeId ? "Edited" : "Added"} defect type '${d.name}'`);
  },
});

// ---- admin gate, categories, defect lookups ----

// Password comes from the ADMIN_PASSWORD env var. 5 wrong attempts lock the user for 15 minutes.
export const unlock = mutation({
  args: { userId: v.id("users"), password: v.string() },
  handler: async (ctx, { userId, password }) => {
    const now = Date.now();
    const rec = await ctx.db.query("adminLock").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (rec && rec.lockedUntil > now) return { ok: false as const, lockedUntil: rec.lockedUntil, attemptsLeft: 0 };
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) throw new Error("ADMIN_PASSWORD is not set on the server");
    if (password === expected) {
      if (rec) await ctx.db.patch(rec._id, { failed: 0, lockedUntil: 0 });
      return { ok: true as const };
    }
    const failed = (rec?.failed ?? 0) + 1;
    const lockedUntil = failed >= 5 ? now + 15 * 60 * 1000 : 0;
    if (rec) await ctx.db.patch(rec._id, { failed: lockedUntil ? 0 : failed, lockedUntil });
    else await ctx.db.insert("adminLock", { userId, failed: lockedUntil ? 0 : failed, lockedUntil });
    return { ok: false as const, lockedUntil, attemptsLeft: lockedUntil ? 0 : 5 - failed };
  },
});

export const saveCategory = mutation({
  args: {
    admin: v.string(), categoryId: v.optional(v.id("categories")),
    name: v.string(), group: v.string(), appliesTo: v.string(), commonFindings: v.array(v.string()),
    roomTypes: v.array(roomCode), active: v.boolean(),
  },
  handler: async (ctx, { admin, categoryId, ...c }) => {
    if (!c.name.trim()) throw new Error("Name is required");
    if (c.roomTypes.length === 0) throw new Error("Select at least one room type");
    const all = await ctx.db.query("categories").withIndex("by_order").collect();
    if (all.some((x) => x.name.toLowerCase() === c.name.trim().toLowerCase() && x._id !== categoryId)) throw new Error("A category with this name already exists.");
    if (categoryId) await ctx.db.patch(categoryId, c);
    else await ctx.db.insert("categories", { ...c, tools: "", number: Math.max(0, ...all.map((x) => x.number)) + 1, order: all.length });
    return bump(ctx, admin, `${categoryId ? "Edited" : "Added"} category '${c.name}'`);
  },
});

export const categoryUsage = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, { categoryId }) => {
    const params = await ctx.db.query("parameters").withIndex("by_category", (q) => q.eq("categoryId", categoryId)).collect();
    let used = false;
    for (const p of params) if (await ctx.db.query("items").withIndex("by_parameter", (q) => q.eq("parameterId", p._id)).first()) { used = true; break; }
    return { used, parameterCount: params.length };
  },
});

// Used categories are hidden; unused ones are deleted with their parameters.
export const removeCategory = mutation({
  args: { admin: v.string(), categoryId: v.id("categories") },
  handler: async (ctx, { admin, categoryId }) => {
    const c = await ctx.db.get(categoryId);
    if (!c) return { hidden: false };
    const params = await ctx.db.query("parameters").withIndex("by_category", (q) => q.eq("categoryId", categoryId)).collect();
    for (const p of params) {
      if (await ctx.db.query("items").withIndex("by_parameter", (q) => q.eq("parameterId", p._id)).first()) {
        await ctx.db.patch(categoryId, { active: false });
        await bump(ctx, admin, `Hid category '${c.name}'`);
        return { hidden: true };
      }
    }
    for (const p of params) {
      for (const d of await ctx.db.query("defectTypes").withIndex("by_parameter", (q) => q.eq("parameterId", p._id)).collect()) await ctx.db.delete(d._id);
      await ctx.db.delete(p._id);
    }
    await ctx.db.delete(categoryId);
    await bump(ctx, admin, `Deleted category '${c.name}'`);
    return { hidden: false };
  },
});

export const removeDefectType = mutation({
  args: { admin: v.string(), defectTypeId: v.id("defectTypes") },
  handler: async (ctx, { admin, defectTypeId }) => {
    const d = await ctx.db.get(defectTypeId);
    if (!d) return;
    await ctx.db.delete(defectTypeId);
    return bump(ctx, admin, `Removed defect type '${d.name}'`);
  },
});

export const groups = query({
  args: {},
  handler: async (ctx) => [...new Set((await ctx.db.query("categories").collect()).map((c) => c.group))],
});
