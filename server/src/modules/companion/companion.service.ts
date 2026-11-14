import { createHash, randomBytes } from "node:crypto";
import { db } from "../../config/supabase.js";
import { ApiError, checkDbError } from "../../common/errors.js";
import { getPlan } from "../coaching/coaching.service.js";
import type { SaveRecord } from "./companion.schema.js";
import { z } from "zod";

export function checked(error: { code?: string; message: string } | null, action = "companion") {
  if (["42P01", "PGRST205", "PGRST202", "42883"].includes(error?.code ?? ""))
    throw new ApiError(
      503,
      "Companion sync needs migration 017 and the updated API. Your existing training data is unchanged.",
    );
  if (["40001", "23505"].includes(error?.code ?? ""))
    throw new ApiError(409, "This item changed on another device. Refresh before saving again.");
  if (error?.code === "22023") throw new ApiError(400, error.message);
  checkDbError(error, action);
}
export function mapRecord(row: any) {
  return {
    id: row.id,
    kind: row.kind,
    date: row.date,
    data: row.data,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}
export function mapShare(row: any) {
  return {
    id: row.id,
    label: row.label,
    fields: row.fields,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}
export async function listRecords(userId: string) {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await db
      .from("companion_records")
      .select("id,kind,date,data,revision,updated_at")
      .eq("user_id", userId)
      .eq("deleted", false)
      .order("id")
      .range(offset, offset + 499);
    checked(result.error);
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) return rows.map(mapRecord);
  }
}
export async function exerciseUsage(userId: string) {
  const replacements: { exerciseId: string; date: string; requestId: string }[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await db
      .from("coaching_commands")
      .select("request_id,request_data,created_at")
      .eq("user_id", userId)
      .eq("action", "adapt")
      .not("request_data->>swapExerciseId", "is", null)
      .order("created_at")
      .order("request_id")
      .range(offset, offset + 499);
    checked(result.error);
    for (const row of result.data ?? []) {
      const exerciseId = z.uuid().safeParse(row.request_data?.swapExerciseId);
      if (exerciseId.success)
        replacements.push({
          exerciseId: exerciseId.data,
          date: row.created_at,
          requestId: row.request_id,
        });
    }
    if ((result.data?.length ?? 0) < 500) return { replacements };
  }
}
export async function saveRecord(userId: string, id: string, input: SaveRecord) {
  if (id === "focus_active")
    throw new ApiError(400, "Use the muscle-focus preview to save this block.");
  if (Buffer.byteLength(JSON.stringify(input.data)) > 12000)
    throw new ApiError(400, "This item is too large to sync.");
  const exerciseId = "exerciseId" in input.data ? input.data.exerciseId : null;
  if (exerciseId) {
    const exercise = await db
      .from("exercises")
      .select("id")
      .eq("id", exerciseId)
      .or(`owner_user_id.is.null,owner_user_id.eq.${userId}`)
      .maybeSingle();
    checked(exercise.error);
    if (!exercise.data) throw new ApiError(400, "Choose an exercise available to your account.");
  }
  const result = await db.rpc("save_fitsync_companion_record", {
    p_user_id: userId,
    p_id: id,
    p_kind: input.kind,
    p_date: "date" in input ? (input.date ?? null) : null,
    p_data: input.data,
    p_expected_revision: input.expectedRevision,
    p_delete: false,
  });
  checked(result.error);
  // PostgREST can represent named composite function results as a one-row array.
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!row) throw new ApiError(502, "The saved item could not be read. Refresh your companion.");
  return mapRecord(row);
}
export async function deleteRecord(userId: string, id: string, revision: number) {
  const result = await db.rpc("save_fitsync_companion_record", {
    p_user_id: userId,
    p_id: id,
    p_kind: null,
    p_date: null,
    p_data: {},
    p_expected_revision: revision,
    p_delete: true,
  });
  checked(result.error);
  return { deleted: true };
}
export async function listShares(userId: string) {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await db
      .from("companion_shares")
      .select("id,label,fields,expires_at,revoked_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    checked(result.error);
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) return rows.map(mapShare);
  }
}
export async function createShare(
  userId: string,
  input: { label: string; fields: ("workouts" | "plan")[]; expiresInDays: number },
) {
  const token = randomBytes(32).toString("base64url");
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.parse(createdAt) + input.expiresInDays * 86400000).toISOString();
  const result = await db
    .from("companion_shares")
    .insert({
      user_id: userId,
      label: input.label,
      fields: input.fields,
      token_hash: createHash("sha256").update(token).digest("hex"),
      expires_at: expiresAt,
      created_at: createdAt,
    })
    .select("id,label,fields,expires_at,revoked_at,created_at")
    .single();
  checked(result.error);
  return { token, share: mapShare(result.data) };
}
export async function revokeShare(userId: string, id: string) {
  const result = await db
    .from("companion_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();
  checked(result.error);
  return { revoked: true };
}
export const workoutColumns =
  "id,name,status,started_at,finished_at,elapsed_seconds,workout_session_exercises(exercise_id,exercise_name,tracking_type,position,workout_logged_sets(id,position,set_type,weight_kg,reps,duration_seconds,distance_meters,rpe,rir,completed_at))";
export async function loadWorkouts(userId: string, from: string, until: string) {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 100) {
    const result = await db
      .from("workout_sessions")
      .select(workoutColumns)
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("finished_at", from)
      .lt("finished_at", until)
      .lte("finished_at", new Date().toISOString())
      .order("finished_at")
      .order("id")
      .range(offset, offset + 99);
    checked(result.error);
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 100)
      return rows.map((workout) => ({
        ...workout,
        workout_session_exercises: [...(workout.workout_session_exercises ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((exercise) => ({
            ...exercise,
            workout_logged_sets: [...(exercise.workout_logged_sets ?? [])].sort(
              (a, b) => a.position - b.position,
            ),
          })),
      }));
  }
}
/** A deliberately narrow consent boundary. Never serialize raw account, health or plan rows here. */
export function sharedPlan(plan: any) {
  if (!plan) return null;
  return {
    name: plan.name,
    startDate: plan.startDate,
    timezone: plan.timezone,
    sessions: plan.sessions.map((day: any) => ({
      date: day.date,
      name: day.name,
      status: day.status,
      exercises: (day.prescription?.exercises ?? []).map((exercise: any) => ({
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        trackingType: exercise.trackingType,
        sets: exercise.sets,
        repsMin: exercise.repsMin,
        repsMax: exercise.repsMax,
        restSeconds: exercise.restSeconds,
        weightKg: exercise.weightKg,
        durationSeconds: exercise.durationSeconds,
      })),
    })),
  };
}
export async function readShare(token: string) {
  const hash = createHash("sha256").update(token).digest("hex");
  const result = await db
    .from("companion_shares")
    .select("id,user_id,fields,expires_at")
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  checked(result.error);
  if (!result.data) throw new ApiError(404, "This shared training view is unavailable or expired.");
  const share = result.data;
  const [workouts, plan] = await Promise.all([
    share.fields.includes("workouts")
      ? loadWorkouts(
          share.user_id,
          new Date(Date.now() - 90 * 86400000).toISOString(),
          new Date().toISOString(),
        )
      : undefined,
    share.fields.includes("plan") ? getPlan(share.user_id).then(sharedPlan) : undefined,
  ]);
  // Recheck after loading: revocation during a long read must not return newly fetched data.
  const current = await db
    .from("companion_shares")
    .select("id")
    .eq("id", share.id)
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  checked(current.error);
  if (!current.data)
    throw new ApiError(404, "This shared training view is unavailable or expired.");
  return {
    fields: share.fields,
    expiresAt: share.expires_at,
    ...(workouts ? { workouts } : {}),
    ...(plan !== undefined ? { plan } : {}),
    note: "Read-only training view. Workout history covers the last 90 days. Measurements, check-ins, nutrition, and photos are not shared.",
  };
}
