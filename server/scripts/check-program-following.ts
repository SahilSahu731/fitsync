import { db } from "../src/config/supabase.js";

// Read-only deployment check. GET probes surface PostgREST schema errors;
// HEAD/count requests can return an empty 204 for an unavailable table.
const checks = [
  ["Program enrollments", () => db.from("program_enrollments").select("id,user_id,program_id,status,weekly_plan,start_date,timezone,reminder_enabled,reminder_hour,reminder_minute").limit(0)],
  ["Workout slots and log relationships", () => db.from("program_workout_slots").select("id,enrollment_id,template_id,scheduled_date,workout_sessions(id,status,workout_session_exercises(workout_logged_sets(weight_kg,reps,completed_at)))").limit(0)],
  ["Program journal", () => db.from("program_events").select("id,enrollment_id,event_type,created_at,details").limit(0)],
  ["Push devices", () => db.from("program_push_devices").select("id,user_id,session_id,token,enabled").limit(0)],
  ["Reminder jobs", () => db.from("program_reminder_jobs").select("id,enrollment_id,device_id,local_date,status,ticket_id").limit(0)]
] as const;

let failed = false;
for (const [label, query] of checks) {
  const { error } = await query();
  if (error) {
    failed = true;
    console.error(`FAIL: ${label} — ${error.code || "connection_error"}: ${error.message}`);
  } else console.log(`OK: ${label}`);
}
if (failed) {
  console.error("Program tracking is not ready. Apply server/sql/008_program_following.sql to the same Supabase project configured in server/.env, then rerun this check. If it was already applied, inspect the reported missing relation/column and reload the PostgREST schema cache; do not drop existing tables.");
  process.exitCode = 1;
} else {
  console.log("Program-tracking tables and workout relationships are available. This check did not read user records or modify any data.");
}
