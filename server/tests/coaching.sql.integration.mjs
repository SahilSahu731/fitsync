// Optional real PostgreSQL/PLpgSQL verification without Docker, production data or a project dependency.
// npm install --prefix /tmp/fitsync-coaching-sql @electric-sql/pglite
// FITSYNC_PGLITE_MODULE=/tmp/fitsync-coaching-sql/node_modules/@electric-sql/pglite/dist/index.js node tests/coaching.sql.integration.mjs
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const { PGlite } = await import(process.env.FITSYNC_PGLITE_MODULE ?? "@electric-sql/pglite");
// No dataDir is accepted here: this is always an isolated in-memory PostgreSQL instance.
const db = new PGlite();
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
    CREATE TABLE public.app_users(id uuid PRIMARY KEY);
    CREATE TABLE public.exercises(id uuid PRIMARY KEY,name text,tracking_type text,status text);
    CREATE TABLE public.user_settings(user_id uuid PRIMARY KEY REFERENCES public.app_users(id) ON DELETE CASCADE,workout_reminders boolean DEFAULT false);
    CREATE TABLE public.auth_sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES public.app_users(id) ON DELETE CASCADE,refresh_hash text,expires_at timestamptz,revoked_at timestamptz);
  `);
  for (const name of ["006_workouts.sql", "007_training_catalog.sql", "008_program_following.sql", "012_progress_tracking.sql", "013_billing.sql", "014_coaching.sql", "015_wellness.sql"]) {
    const sql = await readFile(new URL(`../sql/${name}`, import.meta.url), "utf8");
    await db.exec(sql); console.log(`Applied ${name}`);
  }
  await db.exec(await readFile(new URL("./sql/coaching.sql", import.meta.url), "utf8"));
  const { rows } = await db.query("SELECT count(*)::integer AS count FROM public.coaching_plans");
  assert.equal(rows[0].count, 0, "Fixtures roll back every account/plan/log");
  console.log("PASS: real PL/pgSQL lifecycle, replay, ownership, reschedule, logging, billing and invitation assertions");
} catch (error) {
  console.error(`SQL integration failed in ${fileURLToPath(new URL("./sql/coaching.sql", import.meta.url))}:`, error);
  process.exitCode = 1;
} finally { await db.close(); }
