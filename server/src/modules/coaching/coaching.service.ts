import { isDeepStrictEqual } from "node:util";
import { db } from "../../config/supabase.js";
import { ApiError, checkDbError } from "../../common/errors.js";
import { getSession } from "../workouts/workout.service.js";
import { adaptPrescription, generatePlan, progressPrescription, weeklyReview, type Exercise, type History, type Profile, type Prescription } from "./coaching.engine.js";
import type { AdaptInput } from "./coaching.schema.js";
import { focusPreview, type FocusConfig } from "./coaching.focus.js";

export function checked(error: { code?: string; message: string } | null, action: string) {
  if (!error) return;
  if (["42P01", "PGRST205", "PGRST202", "42703"].includes(error.code ?? "")) throw new ApiError(503, "Coaching is not available yet. The server needs the coaching migration and current API deployment.");
  if (["23514", "23505", "40001"].includes(error.code ?? "")) throw new ApiError(409, error.code === "23505" ? error.message.includes("coaching_unique_date") ? "That date conflicts with another session. Choose another date or refresh your schedule." : "Your training data changed while this request was saving. Refresh before trying again." : error.message);
  if (error.code === "P0002") throw new ApiError(404, error.message);
  if (error.code === "22023") throw new ApiError(400, error.message);
  checkDbError(error, action);
}
export async function loadProfile(userId: string): Promise<Profile | null> {
  const result = await db.from("fitness_profiles").select("goal,experience,training_days,minutes_per_workout,equipment").eq("user_id", userId).maybeSingle();
  checkDbError(result.error, "load coaching preferences");
  const p = result.data;
  return p ? { goal: p.goal, experience: p.experience, trainingDays: p.training_days, minutesPerWorkout: p.minutes_per_workout, equipment: p.equipment } : null;
}
async function catalog(): Promise<Exercise[]> {
  const result: Exercise[] = [];
  // Supabase defaults to at most 1,000 rows. Read all published choices with a stable order.
  for (let offset = 0; offset < 10000; offset += 500) {
    const page = await db.from("exercise_catalog").select("id,name,tracking_type,movement_pattern,difficulty,equipment,primary_muscles,status").eq("status", "published").is("owner_user_id", null).order("id").range(offset, offset + 499);
    checkDbError(page.error, "load published coaching movements");
    result.push(...(page.data ?? []) as Exercise[]);
    if ((page.data?.length ?? 0) < 500) break;
  }
  return result;
}
export async function loadHistory(userId: string): Promise<History[]> {
  const result = await db.from("workout_sessions")
    .select("id,status,finished_at,elapsed_seconds,workout_session_exercises(exercise_id,exercise_name,tracking_type,workout_logged_sets(set_type,weight_kg,reps,duration_seconds,rpe,rir,completed_at))")
    .eq("user_id", userId).eq("status", "completed").gte("finished_at", new Date(Date.now() - 90 * 86400000).toISOString()).order("finished_at", { ascending: false }).limit(300);
  checkDbError(result.error, "load completed performance records");
  return (result.data ?? []) as History[];
}
export async function getPlan(userId: string, id?: string): Promise<any | null> {
  let query = db.from("coaching_plans").select("*").eq("user_id", userId);
  query = id ? query.eq("id", id) : query.eq("status", "active");
  const planResult = await query.maybeSingle(); checked(planResult.error, "load coaching plan");
  if (!planResult.data) { if (id) throw new ApiError(404, "Coaching plan not found."); return null; }
  const plan = planResult.data;
  const days = await db.from("coaching_days").select("*,coaching_workouts(workout_sessions(id,status,finished_at))").eq("plan_id", plan.id).order("sequence");
  checked(days.error, "load coaching days");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: plan.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const sessions = (days.data ?? []).map((day: any) => {
    const logged = (day.coaching_workouts ?? []).flatMap((link: any) => link.workout_sessions ? [link.workout_sessions] : []);
    const workout = logged.find((w: any) => w.status === "completed") ?? logged.find((w: any) => w.status === "active");
    return { id: day.id, week: day.week_number, day: day.day_number, date: day.scheduled_date, name: day.name,
      status: workout?.status ?? (day.scheduled_date < today ? "overdue" : "planned"), revision: day.revision, workoutId: workout?.id ?? null, prescription: day.prescription };
  });
  return { id: plan.id, name: plan.name, ...plan.profile, status: sessions.length && sessions.every((d: any) => d.status === "completed") ? "completed" : plan.status,
    startDate: plan.start_date, timezone: plan.timezone, explanation: plan.explanation, sessions };
}
export async function state(userId: string) {
  const [profile, plan] = await Promise.all([loadProfile(userId), getPlan(userId)]);
  return { profile, plan };
}
async function prior(userId: string, requestId: string, action: string, requestData: unknown) {
  const result = await db.from("coaching_commands").select("action,request_data,result_id").eq("user_id", userId).eq("request_id", requestId).maybeSingle();
  checked(result.error, "check coaching request");
  if (!result.data) return null;
  if (result.data.action !== action || !isDeepStrictEqual(result.data.request_data, requestData)) throw new ApiError(409, "This request key was already used for another change. Refresh and try again.");
  return result.data.result_id as string;
}
export async function createPlan(userId: string, input: { requestId: string; startDate: string; timezone: string; replacePlanId?: string; preferences?: Profile }) {
  const { requestId, ...requestData } = input;
  const existing = await prior(userId, requestId, "create", requestData);
  if (existing) return getPlan(userId, existing);
  const [savedProfile, exercises] = await Promise.all([loadProfile(userId), catalog()]);
  const profile = input.preferences ?? savedProfile;
  if (!profile) throw new ApiError(409, "Complete your fitness setup before generating a personal plan.");
  let generated;
  try { generated = generatePlan(profile, exercises, input.startDate); } catch (error) { throw new ApiError(409, error instanceof Error ? error.message : "A suitable plan could not be generated."); }
  generated = await applySavedFocus(userId, generated, exercises);
  const result = await db.rpc("create_fitsync_coaching_plan", { p_user_id: userId, p_request_id: requestId, p_request_data: requestData,
    p_plan: { ...generated, timezone: input.timezone, profile: { ...profile, trainingDays: generated.trainingDays } } });
  checked(result.error, "create coaching plan");
  return getPlan(userId, result.data);
}
export async function previewPlan(userId: string, input: { startDate: string; timezone: string; preferences: Profile }) {
  const saved = await loadProfile(userId);
  if (!saved) throw new ApiError(409, "Complete your fitness profile first.");
  const exercises = await catalog();
  try { return { ...await applySavedFocus(userId, generatePlan(input.preferences, exercises, input.startDate), exercises), timezone: input.timezone }; }
  catch (error) { throw new ApiError(409, error instanceof Error ? error.message : "A suitable plan could not be built."); }
}
async function applySavedFocus<T extends { sessions: any[] }>(userId: string, generated: T, exercises: Exercise[]): Promise<T> {
  const result = await db.from("companion_records").select("data").eq("user_id", userId).eq("id", "focus_active").eq("kind", "specialisation").eq("deleted", false).maybeSingle();
  // Old deployments remain usable until the additive companion migration lands.
  if (result.error && ["42P01", "PGRST205"].includes(result.error.code)) return generated;
  checked(result.error, "load saved muscle focus");
  if (!result.data) return generated;
  const focus = focusPreview(generated.sessions, exercises, result.data.data as FocusConfig, "focus_active");
  return { ...generated, sessions: focus.days };
}
export async function specialisePlan(userId: string, input: { requestId: string; planId: string; expectedRevisions: { id: string; revision: number }[]; muscle: string; startsOn: string; weeks: 4 | 8; additionalSetsPerWeek: number; preview?: boolean }) {
  const { requestId, preview, ...requestData } = input;
  if (!preview) { const existing = await prior(userId, requestId, "focus", requestData); if (existing) return { plan: await getPlan(userId, existing), changes: [], explanation: ["This focus block was already applied; your saved plan has been refreshed."] }; }
  const [plan, exercises] = await Promise.all([getPlan(userId, input.planId), catalog()]);
  if (!plan || plan.status === "archived") throw new ApiError(409, "Open your current training plan before adding a focus block.");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: plan.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (input.startsOn < today || input.startsOn > new Date(Date.parse(`${today}T12:00:00Z`) + 90 * 86400000).toISOString().slice(0, 10)) throw new ApiError(400, "Start your focus block from today through 90 days ahead.");
  if (input.expectedRevisions.length !== plan.sessions.length || plan.sessions.some((day: any) => !input.expectedRevisions.some(expected => expected.id === day.id && expected.revision === day.revision))) throw new ApiError(409, "Your plan changed. Refresh and preview the focus block again.");
  const config: FocusConfig = { muscle: input.muscle, startsOn: input.startsOn, weeks: input.weeks, additionalSetsPerWeek: input.additionalSetsPerWeek };
  const result = focusPreview(plan.sessions, exercises, config, "focus_active");
  if (preview) return { plan: { ...plan, sessions: result.days }, changes: result.changes, explanation: result.explanation };
  if (!result.changes.length) throw new ApiError(409, "No eligible unstarted movements can receive this focus. Preview another muscle or create your next plan.");
  const changedIds = new Set(result.changes.map(day => day.dayId));
  const saved = await db.rpc("apply_fitsync_focus_block", { p_user_id: userId, p_plan_id: plan.id, p_request_id: requestId, p_request_data: requestData, p_config: config, p_days: result.days.filter((day: any) => changedIds.has(day.id)).map((day: any) => ({ id: day.id, expectedRevision: day.revision, prescription: day.prescription })) });
  checked(saved.error, "save muscle focus block");
  return { plan: await getPlan(userId, plan.id), changes: result.changes, explanation: result.explanation };
}
async function ownedDay(userId: string, dayId: string) {
  const plan = await getPlan(userId);
  const day = plan?.sessions.find((d: any) => d.id === dayId);
  if (!plan || !day) throw new ApiError(404, "Session not found in your current plan.");
  if (["active", "completed"].includes(day.status)) throw new ApiError(409, "Only an unstarted session can be changed.");
  return { plan, day };
}
async function saveChange(userId: string, dayId: string, requestId: string, action: string, requestData: unknown, prescription?: Prescription) {
  const result = await db.rpc("change_fitsync_coaching_day", { p_user_id: userId, p_day_id: dayId, p_request_id: requestId, p_action: action, p_request_data: requestData, p_prescription: prescription ?? null });
  checked(result.error, "change coaching session"); return getPlan(userId, result.data);
}
export async function adaptDay(userId: string, dayId: string, input: AdaptInput) {
  const { requestId, preview, ...request } = input; const requestData = { ...request, dayId };
  if (!preview) { const existing = await prior(userId, requestId, "adapt", requestData); if (existing) return getPlan(userId, existing); }
  const [{ plan, day }, exercises] = await Promise.all([ownedDay(userId, dayId), catalog()]);
  if (day.revision !== input.expectedRevision) throw new ApiError(409, "This session changed. Refresh before adapting it.");
  let prescription;
  try { prescription = adaptPrescription(day.prescription, plan as Profile, exercises, input); } catch (error) { throw new ApiError(409, error instanceof Error ? error.message : "That change is unavailable."); }
  if (preview) return { ...plan, sessions: plan.sessions.map((d: any) => d.id === dayId ? { ...d, prescription } : d), preview: true };
  return saveChange(userId, dayId, requestId, "adapt", requestData, prescription);
}
export async function progressDay(userId: string, dayId: string, input: { requestId: string; expectedRevision: number; incrementKg?: number; preview?: boolean }) {
  const { requestId, preview, ...request } = input; const requestData = { ...request, dayId };
  if (!preview) { const existing = await prior(userId, requestId, "progression", requestData); if (existing) return getPlan(userId, existing); }
  const [{ plan, day }, history] = await Promise.all([ownedDay(userId, dayId), loadHistory(userId)]);
  if (day.revision !== input.expectedRevision) throw new ApiError(409, "This session changed. Refresh before applying progression.");
  const prescription = progressPrescription(day.prescription, history, input.incrementKg);
  if (preview) return { ...plan, sessions: plan.sessions.map((d: any) => d.id === dayId ? { ...d, prescription } : d), preview: true };
  return saveChange(userId, dayId, requestId, "progression", requestData, prescription);
}
export async function rescheduleDay(userId: string, dayId: string, input: { requestId: string; expectedRevision: number; date: string }) {
  const { requestId, ...request } = input; const requestData = { ...request, dayId };
  const existing = await prior(userId, requestId, "reschedule", requestData); if (existing) return getPlan(userId, existing);
  await ownedDay(userId, dayId);
  return saveChange(userId, dayId, requestId, "reschedule", requestData);
}
export async function startDay(userId: string, dayId: string, requestId: string) {
  const result = await db.rpc("start_fitsync_coaching_day", { p_user_id: userId, p_day_id: dayId, p_request_id: requestId });
  checked(result.error, "start coaching session");
  return getSession(userId, result.data);
}
export async function review(userId: string) {
  const [profile, history, plan] = await Promise.all([loadProfile(userId), loadHistory(userId), getPlan(userId)]);
  const health = await db.from("progress_events").select("id,observed_at,payload").eq("user_id", userId).gte("observed_at", new Date(Date.now() - 35 * 86400000).toISOString()).order("observed_at", { ascending: false }).limit(5000);
  // Optional health sync may not be deployed. Workout review remains honest and usable.
  const missingHealth = ["42P01", "PGRST205"].includes(health.error?.code ?? "");
  if (!missingHealth) checkDbError(health.error, "load coaching check-ins");
  const result = weeklyReview(history, profile, health.data ?? [], new Date(), plan?.timezone ?? "UTC");
  if (missingHealth) result.dataNotes.push("Health cloud sync is not deployed; the review uses completed workout records only.");
  return result;
}
