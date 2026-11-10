import { v } from "convex/values";
import { query } from "./_generated/server";

export const summary = query({
  args: { inspectionId: v.id("inspections") },
  handler: async (ctx, { inspectionId }) => {
    const items = await ctx.db.query("items").withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId)).collect();
    const defects = await ctx.db.query("defects").withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId)).collect();
    const rooms = await ctx.db.query("rooms").withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId)).collect();
    const roomName = new Map(rooms.map((r) => [r._id, r.name]));
    const sev = { critical: 0, major: 0, minor: 0 };
    defects.forEach((d) => sev[d.severity]++);
    const itemById = new Map(items.map((i) => [i._id, i]));
    const byCat = new Map<string, number>();
    defects.forEach((d) => { const n = itemById.get(d.itemId)?.categoryName ?? "Other"; byCat.set(n, (byCat.get(n) ?? 0) + 1); });
    const unchecked = items.filter((i) => i.status === "unchecked").map((i) => ({
      itemId: i._id, roomId: i.roomId, room: roomName.get(i.roomId) ?? "", categoryNumber: i.categoryNumber, category: i.categoryName, name: i.name,
    }));
    const limitations = items.filter((i) => i.status === "notAccessible").map((i) => ({
      itemId: i._id, room: roomName.get(i.roomId) ?? "", name: i.name, reason: i.reason ?? "",
    }));
    const photos = defects.reduce((s, d) => s + d.photoIds.length, 0);
    return {
      severity: sev, totalDefects: defects.length, unchecked, limitations,
      byCategory: [...byCat].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      counts: { rooms: rooms.length, rows: items.length, checked: items.length - unchecked.length, defects: defects.length, photos },
    };
  },
});

// Flat export payload. Format is undecided, so this returns normalised JSON the client can share.
export const exportData = query({
  args: { inspectionId: v.id("inspections") },
  handler: async (ctx, { inspectionId }) => {
    const inspection = await ctx.db.get(inspectionId);
    const rooms = await ctx.db.query("rooms").withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId)).collect();
    const items = await ctx.db.query("items").withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId)).collect();
    const defects = await ctx.db.query("defects").withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId)).collect();
    const parts = (await ctx.db.query("areaParts").collect()).filter((p) => p.inspectionId === inspectionId);
    const roomName = new Map(rooms.map((r) => [r._id, r.name]));
    const itemById = new Map(items.map((i) => [i._id, i]));
    return {
      inspection, rooms,
      results: items.map((i) => ({ room: roomName.get(i.roomId), category: i.categoryName, ref: i.ref, name: i.name, status: i.status, value: i.value, reason: i.reason, markedBulk: i.markedBulk })),
      defects: await Promise.all(defects.map(async (d) => {
        const i = itemById.get(d.itemId);
        return {
          room: roomName.get(d.roomId), category: i?.categoryName, ref: i?.ref, item: i?.name, type: d.type, severity: d.severity, location: d.location, note: d.note,
          photos: await Promise.all(d.photoIds.map(async (id, n) => ({
            name: `${roomName.get(d.roomId)}_${i?.ref}_${d.type}_${n + 1}`.replace(/[^\w.-]+/g, "_"), url: await ctx.storage.getUrl(id),
          }))),
        };
      })),
      measurements: rooms.map((r) => ({ room: r.name, agreedArea: r.agreedArea, parts: parts.filter((p) => p.roomId === r._id).map((p) => ({ length: p.length, width: p.width })) })),
    };
  },
});
