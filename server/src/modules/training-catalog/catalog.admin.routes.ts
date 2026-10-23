import { Router } from "express";
import { z } from "zod";
import { db } from "../../config/supabase.js";
import { asyncHandler } from "../../common/async-handler.js";
import { ApiError, checkDbError } from "../../common/errors.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireAdmin } from "../../middleware/admin.js";
import { categorySchema, routineSchema, programSchema, prescriptionSchema, daySchema } from "./catalog.admin.schema.js";

const router = Router();
router.use(requireAuth, requireAdmin);
const kinds = {
  categories: { table: "training_routine_categories", schema: categorySchema, select: "*" },
  routines: { table: "training_routines", schema: routineSchema, select: "*,training_routine_exercises(*)" },
  programs: { table: "training_programs", schema: programSchema, select: "*,training_program_days(*)" },
};
const kindSchema = z.enum(["categories", "routines", "programs"]);
function databaseError(error: { code?: string; message: string } | null) {
  if (error?.code === "23505") throw new ApiError(409, "That slug, exercise position, or schedule day is already in use.");
  if (error?.code === "23503") throw new ApiError(409, "This record is referenced elsewhere, or a selected record no longer exists.");
  checkDbError(error, "manage training catalog");
}
async function parent(kind: "routines" | "programs", id: string) {
  const { data, error } = await db.from(kinds[kind].table).select("id,published").eq("id", id).maybeSingle();
  databaseError(error);
  if (!data) throw new ApiError(404, "Record not found.");
  if (data.published) throw new ApiError(409, "Save this record as a draft before changing its contents.");
}
async function publication(kind: "categories" | "routines" | "programs", id: string) {
  if (kind === "routines") {
    const { data, error } = await db.from("training_routine_exercises").select("exercise_id,exercises(status)").eq("routine_id", id);
    databaseError(error);
    if (!data?.length || data.some(row => (row.exercises as unknown as { status: string } | null)?.status !== "published"))
      throw new ApiError(409, "Add at least one exercise and publish every selected exercise before publishing this routine.");
  }
  if (kind === "programs") {
    const { data, error } = await db.from("training_program_days").select("routine_id,training_routines(published)").eq("program_id", id);
    databaseError(error);
    const workouts = data?.filter(row => row.routine_id) ?? [];
    if (data?.length !== 7 || !workouts.length || workouts.some(row => !(row.training_routines as unknown as { published: boolean } | null)?.published))
      throw new ApiError(409, "Save all seven days, including rest days, and publish every selected routine before publishing this program.");
    return workouts.length;
  }
  return undefined;
}
router.get("/exercises", asyncHandler(async (_req, res) => {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from("exercises").select("id,name,status").order("name").order("id").range(offset, offset + 499);
    databaseError(error); rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  res.json(rows);
}));
router.get("/:kind", asyncHandler(async (req, res) => {
  const config = kinds[kindSchema.parse(req.params.kind)];
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from(config.table).select(config.select).order("name").order("id").range(offset, offset + 499);
    databaseError(error); rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  res.json(rows);
}));
router.post("/:kind", asyncHandler(async (req, res) => {
  const kind = kindSchema.parse(req.params.kind); const config = kinds[kind];
  const input = config.schema.parse(req.body);
  if ("published" in input && input.published) throw new ApiError(409, "Create a draft, add its contents, then publish.");
  const { data, error } = await db.from(config.table).insert({ ...input, ...(kind === "programs" ? { days_per_week: 1 } : {}) }).select(config.select).single();
  databaseError(error); res.status(201).json(data);
}));
router.patch("/:kind/:id", asyncHandler(async (req, res) => {
  const kind = kindSchema.parse(req.params.kind); const id = z.uuid().parse(req.params.id); const config = kinds[kind];
  const input = config.schema.parse(req.body);
  const days = "published" in input && input.published ? await publication(kind, id) : undefined;
  const { data, error } = await db.from(config.table).update({ ...input, ...(days ? { days_per_week: days } : {}) }).eq("id", id).select(config.select).maybeSingle();
  databaseError(error); if (!data) throw new ApiError(404, "Record not found."); res.json(data);
}));
router.delete("/:kind/:id", asyncHandler(async (req, res) => {
  const kind = kindSchema.parse(req.params.kind); const id = z.uuid().parse(req.params.id);
  if (kind !== "categories") await parent(kind, id);
  if (kind === "categories") {
    const { count, error } = await db.from("training_routines").select("id", { count: "exact", head: true }).eq("category_id", id);
    databaseError(error); if (count) throw new ApiError(409, "Move routines out of this category before deleting it.");
  }
  const { data, error } = await db.from(kinds[kind].table).delete().eq("id", id).select("id");
  databaseError(error); if (!data?.length) throw new ApiError(404, "Record not found."); res.status(204).end();
}));
router.post("/:kind/:id/items", asyncHandler(async (req, res) => {
  const kind = z.enum(["routines", "programs"]).parse(req.params.kind); const id = z.uuid().parse(req.params.id);
  await parent(kind, id);
  const routine = kind === "routines";
  const input = routine ? prescriptionSchema.parse(req.body) : daySchema.parse(req.body);
  const { data, error } = await db.from(routine ? "training_routine_exercises" : "training_program_days")
    .upsert({ ...input, [routine ? "routine_id" : "program_id"]: id }, { onConflict: routine ? "routine_id,position" : "program_id,day_number" }).select("*").single();
  databaseError(error); res.json(data);
}));
router.delete("/:kind/:id/items/:itemId", asyncHandler(async (req, res) => {
  const kind = z.enum(["routines", "programs"]).parse(req.params.kind); const id = z.uuid().parse(req.params.id); const itemId = z.uuid().parse(req.params.itemId);
  await parent(kind, id); const routine = kind === "routines";
  const { data, error } = await db.from(routine ? "training_routine_exercises" : "training_program_days").delete().eq("id", itemId).eq(routine ? "routine_id" : "program_id", id).select("id");
  databaseError(error); if (!data?.length) throw new ApiError(404, "Item not found."); res.status(204).end();
}));
export default router;
