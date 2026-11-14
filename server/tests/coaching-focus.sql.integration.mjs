// Real migration functions on a fresh in-memory database. Never accepts a live connection.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.FITSYNC_PGLITE_MODULE ?? "@electric-sql/pglite");
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1), foreign = id(2), plan = id(3), one = id(4), two = id(5), press = id(6), row = id(7);
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
    CREATE TABLE app_users(id uuid PRIMARY KEY);
    CREATE TABLE exercises(id uuid PRIMARY KEY,status text,owner_user_id uuid);
    CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  for (const file of ["006_workouts.sql", "014_coaching.sql", "017_pro_companion.sql", "019_muscle_focus.sql"]) await db.exec(await readFile(new URL(`../sql/${file}`, import.meta.url), "utf8"));
  const today = (await db.query("SELECT current_date::text AS date")).rows[0].date;
  const plusDays = (n) => new Date(Date.parse(`${today}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
  await db.query("INSERT INTO app_users(id) VALUES($1),($2)", [owner, foreign]);
  await db.query("INSERT INTO exercises(id,status) VALUES($1,'published'),($2,'published')", [press, row]);
  await db.query("INSERT INTO coaching_plans(id,user_id,name,profile,start_date,timezone) VALUES($1,$2,'Plan','{}',$3,'UTC')", [plan, owner, today]);
  const prescription = { minutes: 30, effort: "normal", explanation: [], exercises: [press, row].map((exerciseId) => ({ exerciseId, name: exerciseId === press ? "Press" : "Row", sets: 3, restSeconds: 90 })) };
  await db.query("INSERT INTO coaching_days(id,plan_id,sequence,week_number,day_number,scheduled_date,name,prescription) VALUES($1,$3,0,1,1,$4,'One',$5),($2,$3,1,1,3,$6,'Two',$5)", [one, two, plan, today, JSON.stringify(prescription), plusDays(2)]);
  const config = { muscle: "chest", startsOn: today, weeks: 4, additionalSetsPerWeek: 2 };
  const expected = (first = 0, second = 0) => [{ id: one, revision: first }, { id: two, revision: second }];
  const payload = { planId: plan, expectedRevisions: expected(), ...config };
  const changed = { ...prescription, focusId: "focus_active", exercises: prescription.exercises.map((e, i) => ({ ...e, sets: i === 0 ? 4 : 3 })) };
  const call = (userId, requestId, data, focusConfig, days) => db.query("SELECT apply_fitsync_focus_block($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb) AS id", [userId, plan, requestId, JSON.stringify(data), JSON.stringify(focusConfig), JSON.stringify(days)]);
  const updates = [{ id: one, expectedRevision: 0, prescription: changed }];
  await assert.rejects(call(foreign, id(20), payload, config, updates), /Current plan not found/);
  const result = await call(owner, id(21), payload, config, updates);
  assert.equal(result.rows[0].id, plan);
  assert.equal((await db.query("SELECT revision FROM coaching_days WHERE id=$1", [one])).rows[0].revision, 1);
  assert.equal((await db.query("SELECT revision FROM coaching_days WHERE id=$1", [two])).rows[0].revision, 0);
  const savedFocus = (await db.query("SELECT data,revision FROM companion_records WHERE user_id=$1 AND id='focus_active'", [owner])).rows[0];
  assert.deepEqual(savedFocus.data, config);
  assert.equal(savedFocus.revision, 1);
  await call(owner, id(21), payload, config, updates);
  assert.equal((await db.query("SELECT revision FROM coaching_days WHERE id=$1", [one])).rows[0].revision, 1);
  await assert.rejects(call(owner, id(21), { ...payload, muscle: "quads" }, config, updates), /another change/);
  await assert.rejects(call(owner, id(22), payload, config, updates), /plan changed/);
  const currentPayload = { ...payload, expectedRevisions: expected(1, 0) };
  await assert.rejects(call(owner, id(23), currentPayload, config, [{ id: two, expectedRevision: 0, prescription: changed }]), /overlaps/);
  await db.query("UPDATE companion_records SET deleted=true WHERE user_id=$1", [owner]);
  const futureConfig = { ...config, startsOn: plusDays(50) };
  await assert.rejects(call(owner, id(24), { ...currentPayload, ...futureConfig }, futureConfig, [{ id: two, expectedRevision: 0, prescription: changed }]), /outside the focus window/);
  await db.query("INSERT INTO workout_sessions(id,user_id,name) VALUES($1,$2,'Active')", [id(30), owner]);
  await db.query("INSERT INTO coaching_workouts(day_id,workout_id) VALUES($1,$2)", [two, id(30)]);
  // Even if an earlier day was updated first, a later conflict rolls back the full focus operation.
  await assert.rejects(call(owner, id(25), currentPayload, config, [{ id: one, expectedRevision: 1, prescription: changed }, { id: two, expectedRevision: 0, prescription: changed }]), /active or completed/);
  assert.equal((await db.query("SELECT revision FROM coaching_days WHERE id=$1", [one])).rows[0].revision, 1);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM coaching_commands WHERE request_id=$1", [id(25)])).rows[0].n, 0);
  for (const role of ["anon", "authenticated"]) {
    const privilege = (await db.query("SELECT has_function_privilege($1,'public.apply_fitsync_focus_block(uuid,uuid,uuid,jsonb,jsonb,jsonb)','EXECUTE') AS allowed", [role])).rows[0].allowed;
    assert.equal(privilege, false);
  }
  assert.equal((await db.query("SELECT has_function_privilege('service_role','public.apply_fitsync_focus_block(uuid,uuid,uuid,jsonb,jsonb,jsonb)','EXECUTE') AS allowed")).rows[0].allowed, true);
  console.log("Focus migration: ownership, atomic rollback, stale revision, active workout guard, overlap, window, replay and service-role permissions passed.");
} finally { await db.close(); }
