import { internalMutation } from "./_generated/server";
import data from "./seed/checklist.json";

// Run once:  npx convex run seed:seedChecklist
export const seedChecklist = internalMutation({
  args: {},
  handler: async (ctx) => {
    if ((await ctx.db.query("checklistMeta").first()) !== null) return "already seeded";
    let order = 0;
    for (const c of data.categories) {
      const categoryId = await ctx.db.insert("categories", {
        number: c.number, name: c.name, group: c.group, appliesTo: c.appliesTo, tools: c.tools,
        commonFindings: c.commonFindings, roomTypes: c.roomTypes as any, active: true, order: order++,
      });
      let p = 0;
      for (const row of c.parameters) {
        const parameterId = await ctx.db.insert("parameters", {
          categoryId, ref: row.ref, name: row.name, whatToCheck: row.whatToCheck,
          checkTypes: row.checkType.split("+").map((s) => s.trim()),
          extraInput: row.extraInput as any, unit: row.unit, tool: row.tool,
          section: row.section ?? undefined, roomTypes: row.roomTypes as any, active: true, order: p++,
        });
        // Starter defect library = the category's "common findings"; admins refine per row.
        // "Other" and "Missing" are always offered by the app.
        for (const f of c.commonFindings) {
          await ctx.db.insert("defectTypes", { parameterId, name: f, severity: "major", photoRequired: true, active: true });
        }
      }
    }
    const now = Date.now();
    await ctx.db.insert("checklistMeta", { version: 1, lastChangedAt: now, lastChangedBy: "Seed" });
    await ctx.db.insert("checklistVersions", { version: 1, at: now, admin: "Seed", summary: "Initial checklist (23 categories, 272 rows)" });
    return "seeded";
  },
});
