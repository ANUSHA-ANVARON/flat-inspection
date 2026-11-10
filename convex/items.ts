import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { severity } from "./schema";

async function assertEditable(ctx: any, inspectionId: any) {
  const insp = await ctx.db.get(inspectionId);
  if (!insp || insp.status !== "draft") throw new Error("This inspection is locked");
}

export const roomCategories = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const room = await ctx.db.get(roomId);
    const items = await ctx.db.query("items").withIndex("by_room", (q) => q.eq("roomId", roomId)).collect();
    const defects = await ctx.db.query("defects").collect().then((d) => d.filter((x) => x.roomId === roomId));
    const photos = await ctx.db.query("roomPhotos").withIndex("by_room", (q) => q.eq("roomId", roomId)).collect();
    const map = new Map<number, { number: number; name: string; total: number; done: number; defects: number }>();
    for (const i of items) {
      const c = map.get(i.categoryNumber) ?? { number: i.categoryNumber, name: i.categoryName, total: 0, done: 0, defects: 0 };
      c.total++;
      if (i.status !== "unchecked") c.done++;
      if (i.status === "defect") c.defects += defects.filter((d) => d.itemId === i._id).length;
      map.set(i.categoryNumber, c);
    }
    return { room, photoCount: photos.length, categories: [...map.values()].sort((a, b) => a.number - b.number) };
  },
});

export const categoryItems = query({
  args: { roomId: v.id("rooms"), categoryNumber: v.number() },
  handler: async (ctx, { roomId, categoryNumber }) => {
    const items = await ctx.db.query("items")
      .withIndex("by_room", (q) => q.eq("roomId", roomId).eq("categoryNumber", categoryNumber)).collect();
    return Promise.all(items.map(async (i) => {
      const defects = await ctx.db.query("defects").withIndex("by_item", (q) => q.eq("itemId", i._id)).collect();
      const library = await ctx.db.query("defectTypes").withIndex("by_parameter", (q) => q.eq("parameterId", i.parameterId)).collect();
      return {
        ...i, defects,
        library: library.filter((d) => d.active).map((d) => ({ name: d.name, severity: d.severity, photoRequired: d.photoRequired })),
      };
    }));
  },
});

export const setStatus = mutation({
  args: {
    itemId: v.id("items"),
    status: v.union(v.literal("unchecked"), v.literal("ok"), v.literal("na"), v.literal("defect"), v.literal("notAccessible")),
    reason: v.optional(v.string()),
    value: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, status, reason, value }) => {
    const item = await ctx.db.get(itemId);
    if (!item) throw new Error("Row not found");
    await assertEditable(ctx, item.inspectionId);
    if ((status === "na" || status === "notAccessible") && !reason) throw new Error("A reason is required");
    await ctx.db.patch(itemId, { status, reason: status === "na" || status === "notAccessible" ? reason : undefined, ...(value !== undefined ? { value } : {}) });
  },
});

export const setValue = mutation({
  args: { itemId: v.id("items"), value: v.string() },
  handler: async (ctx, { itemId, value }) => {
    const item = await ctx.db.get(itemId);
    if (!item) throw new Error("Row not found");
    await assertEditable(ctx, item.inspectionId);
    await ctx.db.patch(itemId, { value });
  },
});

export const markRestOk = mutation({
  args: { roomId: v.id("rooms"), categoryNumber: v.number() },
  handler: async (ctx, { roomId, categoryNumber }) => {
    const items = await ctx.db.query("items")
      .withIndex("by_room", (q) => q.eq("roomId", roomId).eq("categoryNumber", categoryNumber)).collect();
    if (items[0]) await assertEditable(ctx, items[0].inspectionId);
    let n = 0;
    for (const i of items) if (i.status === "unchecked") { await ctx.db.patch(i._id, { status: "ok", markedBulk: true }); n++; }
    return n;
  },
});

export const saveDefect = mutation({
  args: {
    itemId: v.id("items"), type: v.string(), severity,
    location: v.optional(v.string()), note: v.optional(v.string()),
    photoIds: v.array(v.id("_storage")), defectId: v.optional(v.id("defects")),
  },
  handler: async (ctx, { itemId, defectId, ...d }) => {
    const item = await ctx.db.get(itemId);
    if (!item) throw new Error("Row not found");
    await assertEditable(ctx, item.inspectionId);
    if (d.photoIds.length < 1) throw new Error("Add at least 1 photo");
    if (defectId) await ctx.db.patch(defectId, d);
    else await ctx.db.insert("defects", { ...d, itemId, roomId: item.roomId, inspectionId: item.inspectionId, createdAt: Date.now() });
    await ctx.db.patch(itemId, { status: "defect", reason: undefined });
  },
});

export const removeDefect = mutation({
  args: { defectId: v.id("defects") },
  handler: async (ctx, { defectId }) => {
    const d = await ctx.db.get(defectId);
    if (!d) return;
    await assertEditable(ctx, d.inspectionId);
    await ctx.db.delete(defectId);
    const left = await ctx.db.query("defects").withIndex("by_item", (q) => q.eq("itemId", d.itemId)).first();
    if (!left) await ctx.db.patch(d.itemId, { status: "unchecked" });
  },
});

export const generateUploadUrl = mutation({ args: {}, handler: (ctx) => ctx.storage.generateUploadUrl() });

export const addRoomPhoto = mutation({
  args: { roomId: v.id("rooms"), storageId: v.id("_storage") },
  handler: async (ctx, { roomId, storageId }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    await ctx.db.insert("roomPhotos", { inspectionId: room.inspectionId, roomId, storageId, takenAt: Date.now() });
  },
});

export const roomPhotos = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const photos = await ctx.db.query("roomPhotos").withIndex("by_room", (q) => q.eq("roomId", roomId)).collect();
    return Promise.all(photos.map(async (p) => ({ ...p, url: await ctx.storage.getUrl(p.storageId) })));
  },
});
