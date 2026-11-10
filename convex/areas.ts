import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const overview = query({
  args: { inspectionId: v.id("inspections") },
  handler: async (ctx, { inspectionId }) => {
    const insp = await ctx.db.get(inspectionId);
    if (!insp) return null;
    const rooms = await ctx.db.query("rooms").withIndex("by_inspection", (q) => q.eq("inspectionId", inspectionId)).collect();
    const parts = (await ctx.db.query("areaParts").collect()).filter((p) => p.inspectionId === inspectionId);
    const list = rooms.filter((r) => r.type !== "F").map((r) => {
      const rp = parts.filter((p) => p.roomId === r._id);
      return { roomId: r._id, name: r.name, type: r.type, group: r.type === "B" || r.type === "U" ? "Balconies and utility" : "Rooms",
        area: rp.reduce((s, p) => s + p.length * p.width, 0), measured: rp.length > 0 };
    });
    // Balconies and utility are excluded from carpet area unless the agreement says otherwise.
    const carpetMeasured = list.filter((r) => r.type !== "B" && r.type !== "U").reduce((s, r) => s + r.area, 0);
    return {
      list, carpetMeasured, agreedCarpet: insp.agreedCarpet ?? null,
      diff: insp.agreedCarpet != null ? carpetMeasured - insp.agreedCarpet : null,
      diffPct: insp.agreedCarpet ? ((carpetMeasured - insp.agreedCarpet) / insp.agreedCarpet) * 100 : null,
    };
  },
});

export const roomParts = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => ({
    room: await ctx.db.get(roomId),
    parts: await ctx.db.query("areaParts").withIndex("by_room", (q) => q.eq("roomId", roomId)).collect(),
  }),
});

export const saveRoom = mutation({
  args: {
    roomId: v.id("rooms"), agreedArea: v.optional(v.number()),
    parts: v.array(v.object({ length: v.number(), width: v.number() })),
  },
  handler: async (ctx, { roomId, parts, agreedArea }) => {
    const room = await ctx.db.get(roomId);
    if (!room) throw new Error("Room not found");
    const old = await ctx.db.query("areaParts").withIndex("by_room", (q) => q.eq("roomId", roomId)).collect();
    for (const o of old) await ctx.db.delete(o._id);
    for (const p of parts) if (p.length > 0 && p.width > 0) await ctx.db.insert("areaParts", { ...p, roomId, inspectionId: room.inspectionId });
    await ctx.db.patch(roomId, { agreedArea });
  },
});
