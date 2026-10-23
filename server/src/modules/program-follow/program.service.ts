import { db } from "../../config/supabase.js";
import { ApiError, checkDbError } from "../../common/errors.js";
import { summarizeProgram } from "./program.analytics.js";

export function programError(error: { code?: string; message: string } | null, action: string) {
  if (!error) return;
  if (["42P01", "PGRST205", "PGRST202", "42703"].includes(error.code ?? "")) throw new ApiError(503, "Program tracking is not available yet. The server needs the program-following migration.");
  if (["23514", "40001", "23505"].includes(error.code ?? "")) throw new ApiError(409, error.message);
  if (error.code === "22023") throw new ApiError(400, error.message);
  if (error.code === "P0002") throw new ApiError(404, error.message);
  checkDbError(error, action);
}
export async function activeEnrollment(userId: string) {
  const result = await db.from("program_enrollments").select("*").eq("user_id", userId).eq("status", "active").maybeSingle();
  programError(result.error, "find active program");
  return result.data;
}
export async function programDetail(userId: string, id: string) {
  const result = await db.from("program_enrollments").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  programError(result.error, "load followed program");
  if (!result.data) throw new ApiError(404, "Followed program not found.");
  const [slots, events] = await Promise.all([
    db.from("program_workout_slots").select(`*,workout_sessions(id,status,started_at,finished_at,elapsed_seconds,workout_session_exercises(workout_logged_sets(weight_kg,reps,completed_at)))`).eq("enrollment_id", id).order("scheduled_date"),
    db.from("program_events").select("id,event_type,created_at,details").eq("enrollment_id", id).order("created_at", { ascending: false })
  ]);
  programError(slots.error, "load program workouts"); programError(events.error, "load program history");
  return { ...summarizeProgram(result.data, slots.data ?? []), events: events.data ?? [] };
}
export async function activeProgram(userId: string) {
  const enrollment = await activeEnrollment(userId);
  return enrollment ? programDetail(userId, enrollment.id) : null;
}
export async function programHistory(userId: string) {
  const result = await db.from("program_enrollments").select("id,program_name,cover_url,status,start_date,started_at,ended_at,duration_weeks").eq("user_id", userId).order("started_at", { ascending: false }).limit(50);
  programError(result.error, "load program history"); return result.data ?? [];
}
export type FollowInput = { startDate: string; timezone: string; reminderEnabled: boolean; hour: number; minute: number; expectedActiveId?: string | null };
export async function followProgram(userId: string, programId: string, input: FollowInput) {
  const result = await db.rpc("follow_fitsync_program", {
    p_user_id: userId, p_program_id: programId, p_start_date: input.startDate, p_timezone: input.timezone,
    p_reminder_enabled: input.reminderEnabled, p_hour: input.hour, p_minute: input.minute, p_expected_active_id: input.expectedActiveId ?? null
  });
  programError(result.error, "follow program");
  return programDetail(userId, result.data);
}
export async function stopProgram(userId: string, id: string) {
  const result = await db.rpc("stop_fitsync_program", { p_user_id: userId, p_enrollment_id: id });
  programError(result.error, "stop program");
}
export async function updateReminders(userId: string, id: string, input: Omit<FollowInput, "startDate" | "expectedActiveId">) {
  const result = await db.rpc("update_fitsync_program_reminders", {
    p_user_id: userId, p_enrollment_id: id, p_timezone: input.timezone,
    p_enabled: input.reminderEnabled, p_hour: input.hour, p_minute: input.minute
  });
  programError(result.error, "update program reminders");
  return programDetail(userId, id);
}
export async function registerDevice(userId: string, token: string, sessionId: string) {
  const result = await db.from("program_push_devices").upsert({ user_id: userId, session_id: sessionId, token, enabled: true, updated_at: new Date().toISOString() }, { onConflict: "token" });
  programError(result.error, "register workout reminders");
}
export async function unregisterDevice(userId: string, token: string) {
  const result = await db.from("program_push_devices").update({ enabled: false }).eq("user_id", userId).eq("token", token);
  programError(result.error, "disable workout reminders");
}
// Explicit slots allow choosing any planned workout. Starting a copied routine
// directly credits its earliest unfinished slot in the active program.
export async function resolveProgramSlot(userId: string, templateId?: string, slotId?: string) {
  let enrollment;
  try { enrollment = await activeEnrollment(userId); }
  catch (error) { if (!slotId && error instanceof ApiError && error.status === 503) return null; throw error; }
  if (!enrollment) { if (slotId) throw new ApiError(409, "You are no longer following this program."); return null; }
  let query = db.from("program_workout_slots").select("id,template_id,workout_sessions(status)").eq("enrollment_id", enrollment.id).order("scheduled_date");
  if (slotId) query = query.eq("id", slotId);
  else if (templateId) query = query.eq("template_id", templateId);
  else return null;
  const result = await query;
  programError(result.error, "find program session");
  const slot = (result.data ?? []).find(row => !(row.workout_sessions ?? []).some((workout: any) => ["active", "completed"].includes(workout.status)));
  if (!slot) { if (slotId) throw new ApiError(409, "This session has already been started or completed."); return null; }
  if (!slot.template_id || (templateId && slot.template_id !== templateId)) throw new ApiError(409, "This routine is no longer available.");
  return slot;
}
