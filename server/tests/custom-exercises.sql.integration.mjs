// Always creates a fresh in-memory PostgreSQL database. No production connection accepted.
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { PGlite } = await import(process.env.FITSYNC_PGLITE_MODULE ?? "@electric-sql/pglite");
const db = new PGlite();
const owner = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
const input = {
  name: "My cable press",
  description: "Private setup",
  category: "strength",
  activityType: "weight-training",
  bodyRegion: "upper-body",
  difficulty: "beginner",
  trackingType: "reps_weight",
  movementPattern: "push",
  primaryMuscles: ["chest"],
  secondaryMuscles: ["triceps"],
  equipment: ["cable"],
  instructions: ["Set up the cable"],
  tips: [],
  mistakes: [],
  safetyNotes: [],
  breathingTip: "",
};
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
    CREATE TABLE public.app_users(id uuid PRIMARY KEY);
    CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  for (const name of [
    "004_exercise_library.sql",
    "006_workouts.sql",
    "007_training_catalog.sql",
    "016_custom_exercises.sql",
  ]) {
    await db.exec(await readFile(new URL(`../sql/${name}`, import.meta.url), "utf8"));
    console.log(`Applied ${name}`);
  }
  await db.query("INSERT INTO app_users(id) VALUES($1),($2)", [owner, other]);
  const saved = await db.query("SELECT save_fitsync_custom_exercise($1,null,$2::jsonb) AS id", [
    owner,
    JSON.stringify(input),
  ]);
  const id = saved.rows[0].id;
  const own = await db.query(
    "SELECT * FROM exercise_catalog WHERE id=$1 AND (owner_user_id IS NULL OR owner_user_id=$2)",
    [id, owner],
  );
  assert.equal(own.rows[0].name, input.name);
  assert.deepEqual(own.rows[0].primary_muscles, ["chest"]);
  const foreign = await db.query(
    "SELECT * FROM exercise_catalog WHERE id=$1 AND (owner_user_id IS NULL OR owner_user_id=$2)",
    [id, other],
  );
  assert.equal(foreign.rows.length, 0);
  await assert.rejects(
    db.query("SELECT save_fitsync_custom_exercise($1,$2,$3::jsonb)", [
      other,
      id,
      JSON.stringify({ ...input, name: "Foreign edit" }),
    ]),
    /Exercise not found/,
  );
  await assert.rejects(
    db.query("SELECT save_fitsync_custom_exercise($1,$2,$3::jsonb)", [
      owner,
      id,
      JSON.stringify({ ...input, primaryMuscles: ["unknown"] }),
    ]),
    /Invalid muscle/,
  );
  assert.equal(
    (await db.query("SELECT name FROM exercises WHERE id=$1", [id])).rows[0].name,
    input.name,
  );
  await db.query(
    "INSERT INTO workout_templates(id,user_id,name) VALUES('00000000-0000-4000-8000-000000000003',$1,'My routine')",
    [owner],
  );
  await db.query(
    "INSERT INTO workout_template_exercises(template_id,exercise_id,position) VALUES('00000000-0000-4000-8000-000000000003',$1,0)",
    [id],
  );
  await assert.rejects(
    db.query("SELECT save_fitsync_custom_exercise($1,$2,$3::jsonb)", [
      owner,
      id,
      JSON.stringify({ ...input, trackingType: "duration" }),
    ]),
    /Tracking type cannot change/,
  );
  await db.query("UPDATE exercises SET status='archived' WHERE id=$1 AND owner_user_id=$2", [
    id,
    owner,
  ]);
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM workout_template_exercises WHERE exercise_id=$1",
        [id],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (await db.query("SELECT count(*)::int AS n FROM exercise_catalog WHERE owner_user_id IS NULL"))
      .rows[0].n,
    0,
  );
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    await assert.rejects(
      db.query("SELECT public.save_fitsync_custom_exercise($1,null,$2::jsonb)", [
        owner,
        JSON.stringify(input),
      ]),
      /permission denied/,
    );
    await assert.rejects(db.query("SELECT * FROM public.exercise_catalog"), /permission denied/);
    await db.exec("RESET ROLE");
  }
  await db.exec(
    "INSERT INTO training_routines(id,slug,name,description,level,goal,equipment) VALUES('00000000-0000-4000-8000-000000000004','shared','Shared routine','Test','beginner','strength','gym')",
  );
  await assert.rejects(
    db.query(
      "INSERT INTO training_routine_exercises(routine_id,exercise_id,position,sets,min_reps,max_reps) VALUES('00000000-0000-4000-8000-000000000004',$1,0,3,8,12)",
      [id],
    ),
    /Private exercises cannot/,
  );
  // Account deletion must not convert a private exercise into a public row.
  await db.query("DELETE FROM app_users WHERE id=$1", [owner]);
  assert.equal(
    (await db.query("SELECT count(*)::int AS n FROM exercises WHERE id=$1", [id])).rows[0].n,
    0,
  );
  console.log(
    "PASS: actual migration, private ownership, taxonomy rollback, tracking integrity, archival, grants and account deletion",
  );
} finally {
  await db.close();
}
