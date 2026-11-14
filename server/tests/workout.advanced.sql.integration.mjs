// Fresh in-memory PostgreSQL only; no production connection is accepted.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.FITSYNC_PGLITE_MODULE ?? "@electric-sql/pglite");
const db = new PGlite();
try {
  await db.exec("CREATE TABLE app_users(id uuid PRIMARY KEY); CREATE TABLE exercises(id uuid PRIMARY KEY);");
  await db.exec(await readFile(new URL("../sql/006_workouts.sql", import.meta.url), "utf8"));
  await db.exec(await readFile(new URL("../sql/018_advanced_workouts.sql", import.meta.url), "utf8"));
  // Reapplication must preserve existing rows and constraints.
  await db.exec(await readFile(new URL("../sql/018_advanced_workouts.sql", import.meta.url), "utf8"));
  await db.exec(`INSERT INTO app_users VALUES ('00000000-0000-4000-8000-000000000001');
    INSERT INTO exercises VALUES ('00000000-0000-4000-8000-000000000002');
    INSERT INTO workout_templates(id,user_id,name) VALUES ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','Upper');
    INSERT INTO workout_template_exercises(id,template_id,exercise_id,position,superset_group) VALUES ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',0,'A');
    INSERT INTO workout_template_sets(template_exercise_id,position,set_type,rest_seconds,tempo) VALUES ('00000000-0000-4000-8000-000000000004',0,'rest_pause',15,'3-1-X-0');
    INSERT INTO workout_sessions(id,user_id,name) VALUES ('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001','Upper');
    INSERT INTO workout_session_exercises(id,session_id,exercise_id,exercise_name,tracking_type,position,superset_group) VALUES ('00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000002','Press','reps_weight',0,'A');
    INSERT INTO workout_logged_sets(session_exercise_id,position,set_type,rest_seconds,tempo) VALUES ('00000000-0000-4000-8000-000000000006',0,'rest_pause',0,'2-0-X-0');`);
  assert.equal((await db.query("SELECT tempo FROM workout_template_sets")).rows[0].tempo, "3-1-X-0");
  assert.equal((await db.query("SELECT rest_seconds FROM workout_logged_sets")).rows[0].rest_seconds, 0);
  for (const [table, expression] of [
    ["workout_template_sets", "rest_seconds=901"], ["workout_logged_sets", "rest_seconds=-1"],
    ["workout_logged_sets", "tempo='2-0-X'"], ["workout_template_sets", "tempo='22-0-X-0'"],
    ["workout_session_exercises", "superset_group='bad group'"], ["workout_template_exercises", "superset_group=''"],
    ["workout_logged_sets", "set_type='unsupported'"],
  ]) await assert.rejects(db.exec(`UPDATE ${table} SET ${expression}`), /check constraint/);
  await db.exec("UPDATE workout_logged_sets SET tempo=NULL, rest_seconds=NULL; UPDATE workout_session_exercises SET superset_group=NULL;");
  assert.equal((await db.query("SELECT tempo FROM workout_logged_sets")).rows[0].tempo, null);
  console.log("Advanced workout migration: reapplication, new methods, explicit clears and database constraints passed.");
} finally { await db.close(); }
