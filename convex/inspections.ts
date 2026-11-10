import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

type Code = Doc<"rooms">["type"];

const counts = v.object({
  bedrooms: v.number(), living: v.number(), kitchen: v.number(), utility: v.number(),
  washrooms: v.number(), balconies: v.number(), store: v.number(), maid: v.number(),
  acArea: v.number(), passage: v.number(),
});

// [count key, room type, name, hub group]
const ROOM_PLAN: [keyof typeof emptyCounts, Code, string, string][] = [
  ["bedrooms", "H", "Bedroom", "Bedrooms"],
  ["living", "H", "Living / Dining", "Other"],
  ["maid", "H", "Maid room", "Other"],
  ["washrooms", "W", "Washroom", "Washrooms"],
  ["balconies", "B", "Balcony", "Balconies"],
  ["kitchen", "K", "Kitchen", "Kitchen and utility"],
  ["utility", "U", "Utility", "Kitchen and utility"],
  ["store", "S", "Store room", "Other"],
  ["acArea", "S", "AC unit area", "Other"],
  ["passage", "S", "Passage / foyer", "Other"],
];
const emptyCounts = { bedrooms: 0, living: 0, kitchen: 0, utility: 0, washrooms: 0, balconies: 0, store: 0, maid: 0, acArea: 0, passage: 0 };

async function addRoom(ctx: any, inspectionId: Id<"inspections">, type: Code, name: string, group: string, order: number) {
  const roomId: Id<"rooms"> = await ctx.db.insert("rooms", { inspectionId, type, name, group, order });
  const cats: Doc<"categories">[] = await ctx.db.query("categories").withIndex("by_order").collect();
  for (const cat of cats) {
    if (!cat.active) continue;
    // Category 1 (area measurement) is answered once per flat, via the area screen.
    if (cat.number === 1 && type !== "F") continue;
    const params: Doc<"parameters">[] = await ctx.db.query("parameters")
      .withIndex("by_category", (q: any) => q.eq("categoryId", cat._id)).collect();
    for (const p of params) {
      if (!p.active || !p.roomTypes.includes(type)) continue;
      await ctx.db.insert("items", {
        inspectionId, roomId, parameterId: p._id, categoryNumber: cat.number, categoryName: cat.name,
        ref: p.ref, section: p.section, name: p.name, whatToCheck: p.whatToCheck, checkTypes: p.checkTypes,
        extraInput: p.extraInput, unit: p.unit, tool: p.tool, order: p.order, status: "unchecked",
      });
    }
  }
  return roomId;
}

export const create = mutation({
  args: {
    inspectorId: v.id("users"),
    customerName: v.string(), customerPhone: v.string(), customerEmail: v.optional(v.string()),
    project: v.string(), tower: v.optional(v.string()), flatNumber: v.string(),
    floor: v.optional(v.string()), builder: v.optional(v.string()),
    flatType: v.string(), service: v.string(), scheduledAt: v.number(),
    agreedCarpet: v.optional(v.number()), agreedSuperBuiltUp: v.optional(v.number()),
    agreedBalcony: v.optional(v.number()), agreedUtility: v.optional(v.number()),
    rooms: counts,
  },
  handler: async (ctx, { rooms, ...rest }) => {
    const meta = await ctx.db.query("checklistMeta").first();
    if (!meta) throw new Error("Checklist not seeded. Run: npx convex run seed:seedChecklist");
    const id = await ctx.db.insert("inspections", { ...rest, status: "draft", checklistVersion: meta.version });
    let order = 0;
    await addRoom(ctx, id, "F", "Whole flat", "Whole flat", order++);
    for (const [key, type, label, group] of ROOM_PLAN) {
      const n = rooms[key];
      for (let i = 1; i <= n; i++) {
        const name = ["living", "kitchen", "store", "maid", "acArea", "passage", "utility"].includes(key) && n === 1 ? label : `${label} ${i}`;
        await addRoom(ctx, id, type, name, group, order++);
      }
    }
    return id;
  },
});

export const addRoomTo = mutation({
  args: { inspectionId: v.id("inspections"), type: v.string(), name: v.string() },
  handler: async (ctx, { inspectionId, type, name }) => {
    const last = await ctx.db.query("rooms").withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId)).order("desc").first();
    const group = ({ H: "Other", K: "Kitchen and utility", U: "Kitchen and utility", W: "Washrooms", B: "Balconies", S: "Other", F: "Whole flat" } as Record<string, string>)[type];
    return addRoom(ctx, inspectionId, type as Code, name, group, (last?.order ?? 0) + 1);
  },
});

export const list = query({
  args: { inspectorId: v.id("users"), completed: v.boolean() },
  handler: async (ctx, { inspectorId, completed }) => {
    const all = await ctx.db.query("inspections").withIndex("by_inspector", (q) => q.eq("inspectorId", inspectorId)).order("desc").collect();
    const mine = all.filter((i) => (i.status === "draft") !== completed);
    return Promise.all(mine.map(async (i) => ({ ...i, ...(await progress(ctx, i._id)) })));
  },
});

async function progress(ctx: any, inspectionId: Id<"inspections">) {
  const items: Doc<"items">[] = await ctx.db.query("items").withIndex("by_inspection", (q: any) => q.eq("inspectionId", inspectionId)).collect();
  const defects: Doc<"defects">[] = await ctx.db.query("defects").withIndex("by_inspection", (q: any) => q.eq("inspectionId", inspectionId)).collect();
  const done = items.filter((i) => i.status !== "unchecked").length;
  const sev = { critical: 0, major: 0, minor: 0 };
  defects.forEach((d) => sev[d.severity]++);
  return { total: items.length, done, percent: items.length ? Math.round((done / items.length) * 100) : 0, defectCount: defects.length, severity: sev };
}

export const hub = query({
  args: { inspectionId: v.id("inspections") },
  handler: async (ctx, { inspectionId }) => {
    const inspection = await ctx.db.get(inspectionId);
    if (!inspection) return null;
    const rooms = await ctx.db.query("rooms").withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId)).collect();
    const items = await ctx.db.query("items").withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId)).collect();
    const defects = await ctx.db.query("defects").withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId)).collect();
    const parts = await ctx.db.query("areaParts").collect().then((a) => a.filter((p) => p.inspectionId === inspectionId));
    const roomStats = rooms.map((r) => {
      const ri = items.filter((i) => i.roomId === r._id);
      const done = ri.filter((i) => i.status !== "unchecked").length;
      return { ...r, total: ri.length, done, defects: defects.filter((d) => d.roomId === r._id).length,
        state: done === 0 ? "notStarted" : done === ri.length ? "done" : "inProgress" };
    });
    const sev = { critical: 0, major: 0, minor: 0 };
    defects.forEach((d) => sev[d.severity]++);
    const measured = parts.reduce((s, p) => s + p.length * p.width, 0);
    return {
      inspection, rooms: roomStats, severity: sev, total: items.length,
      done: items.filter((i) => i.status !== "unchecked").length,
      measuredArea: measured, agreedCarpet: inspection.agreedCarpet ?? null,
    };
  },
});

export const complete = mutation({
  args: { inspectionId: v.id("inspections"), generalObservations: v.optional(v.string()) },
  handler: async (ctx, { inspectionId, generalObservations }) => {
    const open = await ctx.db.query("items").withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId))
      .filter((q) => q.eq(q.field("status"), "unchecked")).first();
    if (open) throw new Error("Unchecked rows remain. Mark them or set Not accessible with a reason.");
    await ctx.db.patch(inspectionId, { status: "completed", completedAt: Date.now(), generalObservations });
  },
});

// TODO(auth): restrict to admins once real auth is in place.
export const reopen = mutation({
  args: { inspectionId: v.id("inspections") },
  handler: (ctx, { inspectionId }) => ctx.db.patch(inspectionId, { status: "draft", completedAt: undefined }),
});
