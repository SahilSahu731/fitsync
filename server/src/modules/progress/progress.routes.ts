import { Router } from "express";
import { z } from "zod";
import { db } from "../../config/supabase.js";
import { asyncHandler } from "../../common/async-handler.js";
import { ApiError, checkDbError } from "../../common/errors.js";
import { requireAuth, getAuth } from "../../middleware/auth.js";
import { batchSchema } from "./progress.schema.js";

const router = Router();
router.use(requireAuth);
function owned(authId: string, owner: unknown) {
  if (z.uuid().parse(owner) !== authId) throw new ApiError(403, "The signed-in account changed. Reopen Progress.");
  return authId;
}
function checked(error: { code?: string; message: string } | null) {
  if (error?.code === "PGRST205" || error?.code === "42P01") throw new ApiError(503, "Cloud health tracking is not available yet. Your device logs remain saved locally.");
  checkDbError(error, "progress journal");
}
router.get("/events", asyncHandler(async (req, res) => {
  const userId = owned(getAuth(req).userId, req.query.ownerId);
  const after = z.string().regex(/^[a-zA-Z0-9_-]{20,80}$/).optional().parse(req.query.after);
  let query = db.from("progress_events").select("id,observed_at,payload").eq("user_id", userId).order("id").limit(500);
  if (after) query = query.gt("id", after);
  const { data, error } = await query; checked(error);
  res.json({ events: (data ?? []).map(row => ({ ...row.payload, id: row.id, observedAt: row.observed_at })), next: data?.length === 500 ? data.at(-1)!.id : null });
}));
router.post("/events", asyncHandler(async (req, res) => {
  const input = batchSchema.parse(req.body);
  const userId = owned(getAuth(req).userId, input.ownerId);
  const rows = input.events.map(({ id, observedAt, ...payload }) => ({ user_id: userId, id, observed_at: observedAt, payload }));
  const { error } = await db.from("progress_events").upsert(rows, { onConflict: "user_id,id", ignoreDuplicates: true });
  checked(error); res.json({ accepted: input.events.map(e => e.id) });
}));
router.get("/workouts", asyncHandler(async (req, res) => {
  const userId = owned(getAuth(req).userId, req.query.ownerId);
  const before = z.iso.datetime({ offset: true }).optional().parse(req.query.before);
  const beforeId = z.uuid().optional().parse(req.query.beforeId);
  if (Boolean(before) !== Boolean(beforeId)) throw new ApiError(400, "Both workout cursor fields are required.");
  let query = db.from("workout_sessions")
    .select("id,name,status,started_at,finished_at,elapsed_seconds,workout_session_exercises(id,exercise_id,exercise_name,tracking_type,position,workout_logged_sets(id,position,set_type,weight_kg,reps,duration_seconds,distance_meters,rpe,rir,completed_at))")
    .eq("user_id", userId).eq("status", "completed").order("finished_at", { ascending: false }).order("id", { ascending: false }).limit(50);
  if (before && beforeId) query = query.or(`finished_at.lt.${before},and(finished_at.eq.${before},id.lt.${beforeId})`);
  const { data, error } = await query; checkDbError(error, "progress workouts");
  const last = data?.at(-1);
  res.json({ workouts: data ?? [], next: data?.length === 50 && last ? { before: last.finished_at, beforeId: last.id } : null });
}));
export default router;
