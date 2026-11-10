import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const roomCode = v.union(
  v.literal("H"), v.literal("K"), v.literal("U"), v.literal("W"),
  v.literal("B"), v.literal("S"), v.literal("F"),
);
export const severity = v.union(v.literal("critical"), v.literal("major"), v.literal("minor"));
export const itemStatus = v.union(
  v.literal("unchecked"), v.literal("ok"), v.literal("defect"),
  v.literal("na"), v.literal("notAccessible"),
);

export default defineSchema({
  users: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    role: v.union(v.literal("inspector"), v.literal("admin")),
    active: v.boolean(),
  }).index("by_phone", ["phone"]),

  // ---- master checklist (admin-managed) ----
  checklistMeta: defineTable({
    version: v.number(),
    lastChangedAt: v.number(),
    lastChangedBy: v.string(),
  }),
  checklistVersions: defineTable({
    version: v.number(),
    at: v.number(),
    admin: v.string(),
    summary: v.string(),
  }).index("by_version", ["version"]),
  categories: defineTable({
    number: v.number(),
    name: v.string(),
    group: v.string(),
    appliesTo: v.string(),
    tools: v.string(),
    commonFindings: v.array(v.string()),
    roomTypes: v.array(roomCode),
    active: v.boolean(),
    order: v.number(),
  }).index("by_order", ["order"]),
  parameters: defineTable({
    categoryId: v.id("categories"),
    ref: v.string(),
    name: v.string(),
    whatToCheck: v.string(),
    checkTypes: v.array(v.string()), // Visual, Measure, Test, Operate, Verify, Record
    extraInput: v.union(v.literal("none"), v.literal("number"), v.literal("text")),
    unit: v.string(),
    tool: v.string(),
    section: v.optional(v.string()),
    roomTypes: v.array(roomCode),
    active: v.boolean(),
    order: v.number(),
  }).index("by_category", ["categoryId", "order"]),
  defectTypes: defineTable({
    parameterId: v.id("parameters"),
    name: v.string(),
    severity,
    photoRequired: v.boolean(),
    active: v.boolean(),
  }).index("by_parameter", ["parameterId"]),

  adminLock: defineTable({
    userId: v.id("users"),
    failed: v.number(),
    lockedUntil: v.number(),
  }).index("by_user", ["userId"]),

  // ---- inspections ----
  inspections: defineTable({
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    project: v.string(),
    tower: v.optional(v.string()),
    flatNumber: v.string(),
    floor: v.optional(v.string()),
    builder: v.optional(v.string()),
    flatType: v.string(),
    service: v.string(),
    scheduledAt: v.number(),
    inspectorId: v.id("users"),
    agreedCarpet: v.optional(v.number()),
    agreedSuperBuiltUp: v.optional(v.number()),
    agreedBalcony: v.optional(v.number()),
    agreedUtility: v.optional(v.number()),
    status: v.union(v.literal("draft"), v.literal("completed"), v.literal("exported")),
    checklistVersion: v.number(),
    generalObservations: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  }).index("by_inspector", ["inspectorId"]),
  rooms: defineTable({
    inspectionId: v.id("inspections"),
    type: roomCode,
    name: v.string(),
    group: v.string(), // hub heading
    order: v.number(),
    agreedArea: v.optional(v.number()),
  }).index("by_inspection", ["inspectionId", "order"]),
  // checklist row instance for one room, snapshotting the master row
  items: defineTable({
    inspectionId: v.id("inspections"),
    roomId: v.id("rooms"),
    parameterId: v.id("parameters"),
    categoryNumber: v.number(),
    categoryName: v.string(),
    ref: v.string(),
    section: v.optional(v.string()),
    name: v.string(),
    whatToCheck: v.string(),
    checkTypes: v.array(v.string()),
    extraInput: v.string(),
    unit: v.string(),
    tool: v.string(),
    order: v.number(),
    status: itemStatus,
    value: v.optional(v.string()),
    reason: v.optional(v.string()), // N/A or not-accessible reason
    markedBulk: v.optional(v.boolean()),
  })
    .index("by_room", ["roomId", "categoryNumber", "order"])
    .index("by_inspection", ["inspectionId"])
    .index("by_parameter", ["parameterId"]),
  defects: defineTable({
    inspectionId: v.id("inspections"),
    roomId: v.id("rooms"),
    itemId: v.id("items"),
    type: v.string(),
    severity,
    location: v.optional(v.string()),
    note: v.optional(v.string()),
    photoIds: v.array(v.id("_storage")),
    createdAt: v.number(),
  })
    .index("by_item", ["itemId"])
    .index("by_inspection", ["inspectionId"]),
  roomPhotos: defineTable({
    inspectionId: v.id("inspections"),
    roomId: v.id("rooms"),
    storageId: v.id("_storage"),
    takenAt: v.number(),
  }).index("by_room", ["roomId"]),
  areaParts: defineTable({
    inspectionId: v.id("inspections"),
    roomId: v.id("rooms"),
    length: v.number(),
    width: v.number(),
  }).index("by_room", ["roomId"]),
});
