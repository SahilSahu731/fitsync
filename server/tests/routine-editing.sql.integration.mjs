// Applies real workout migrations to a fresh in-memory PostgreSQL database only.
// Deliberately accepts a PGlite module path, never a live database connection.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.FITSYNC_PGLITE_MODULE ?? "@electric-sql/pglite");
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1),
  other = id(2),
  template = id(3);
const publicExercise = id(10),
  ownPublished = id(11),
  ownArchived = id(12),
  foreignExercise = id(13),
  newArchived = id(14),
  publicArchived = id(15),
  timedExercise = id(16);
const dose = (change = {}) => ({
  setType: "normal",
  targetReps: 8,
  targetWeight: 60,
  targetDurationSeconds: null,
  restSeconds: null,
  tempo: null,
  ...change,
});
const movement = (exerciseId, change = {}) => ({
  exerciseId,
  notes: "Setup cue",
  restSeconds: 90,
  supersetGroup: null,
  sets: [dose()],
  ...change,
});
const input = (exercises = [movement(publicExercise)]) => ({
  name: "Edited upper",
  description: "Edited description",
  exercises,
});
const rejectsCode = (promise, code) => assert.rejects(promise, (error) => error.code === code);
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
    CREATE TABLE app_users(id uuid PRIMARY KEY);
    CREATE TABLE exercises(id uuid PRIMARY KEY,owner_user_id uuid REFERENCES app_users(id),status text NOT NULL,name text,tracking_type text);`);
  for (const file of ["006_workouts.sql", "018_advanced_workouts.sql"])
    await db.exec(await readFile(new URL(`../sql/${file}`, import.meta.url), "utf8"));
  // These imported-reference relations need only their real template FK for this RPC's guard.
  for (const table of [
    "user_saved_routines",
    "user_saved_program_routines",
    "coaching_days",
    "program_workout_slots",
  ])
    await db.exec(
      `CREATE TABLE ${table}(template_id uuid REFERENCES workout_templates(id) ON DELETE CASCADE);`,
    );
  await db.query("INSERT INTO app_users(id) VALUES($1),($2)", [owner, other]);
  for (const [exerciseId, actor, status] of [
    [publicExercise, null, "published"],
    [ownPublished, owner, "published"],
    [ownArchived, owner, "archived"],
    [foreignExercise, other, "published"],
    [newArchived, owner, "archived"],
    [publicArchived, null, "archived"],
  ])
    await db.query(
      "INSERT INTO exercises(id,owner_user_id,status,name,tracking_type) VALUES($1,$2,$3,'Press','reps_weight')",
      [exerciseId, actor, status],
    );
  await db.query(
    "INSERT INTO exercises(id,status,name,tracking_type) VALUES($1,'published','Plank','duration')",
    [timedExercise],
  );
  await db.query(
    "INSERT INTO workout_templates(id,user_id,name,description) VALUES($1,$2,'Original upper','Original description')",
    [template, owner],
  );
  for (const [position, exerciseId] of [publicExercise, ownArchived, publicArchived].entries()) {
    const created = await db.query(
      "INSERT INTO workout_template_exercises(template_id,exercise_id,position,notes,rest_seconds) VALUES($1,$2,$3,'Original cue',90) RETURNING id",
      [template, exerciseId, position],
    );
    await db.query(
      "INSERT INTO workout_template_sets(template_exercise_id,position,set_type,target_reps,target_weight) VALUES($1,0,'normal',8,40)",
      [created.rows[0].id],
    );
  }
  await db.query(
    "INSERT INTO workout_sessions(id,user_id,template_id,name,status,finished_at) VALUES($1,$2,$3,'Original upper','completed',now())",
    [id(20), owner, template],
  );
  await db.query(
    "INSERT INTO workout_session_exercises(id,session_id,exercise_id,exercise_name,tracking_type,position,notes,rest_seconds,superset_group) VALUES($1,$2,$3,'Old snapshot name','reps_weight',0,'Old snapshot cue',75,'OLD')",
    [id(21), id(20), publicExercise],
  );
  await db.query(
    "INSERT INTO workout_logged_sets(session_exercise_id,position,set_type,weight_kg,reps,rest_seconds,tempo,completed_at) VALUES($1,0,'rest_pause',40,8,15,'3-1-X-0',now())",
    [id(21)],
  );
  const history = async () =>
    (
      await db.query(
        "SELECT row_to_json(e) AS exercise,(SELECT jsonb_agg(s ORDER BY s.position) FROM workout_logged_sets s WHERE s.session_exercise_id=e.id) AS sets FROM workout_session_exercises e WHERE session_id=$1",
        [id(20)],
      )
    ).rows;
  const originalHistory = await history();
  const migration = await readFile(
    new URL("../sql/020_routine_editing.sql", import.meta.url),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration);
  const revision = async () =>
    (await db.query("SELECT revision FROM workout_templates WHERE id=$1", [template])).rows[0]
      .revision;
  const snapshot = async () => ({
    template: (await db.query("SELECT * FROM workout_templates WHERE id=$1", [template])).rows[0],
    exercises: (
      await db.query(
        "SELECT e.*,(SELECT jsonb_agg(s ORDER BY s.position) FROM workout_template_sets s WHERE s.template_exercise_id=e.id) AS sets FROM workout_template_exercises e WHERE e.template_id=$1 ORDER BY e.position",
        [template],
      )
    ).rows,
  });
  const edit = (actor, expected, data, target = template) =>
    db.query("SELECT edit_fitsync_workout_template($1,$2,$3,$4::jsonb) AS id", [
      actor,
      target,
      expected,
      JSON.stringify(data),
    ]);
  assert.equal(await revision(), 0);
  assert.equal((await snapshot()).exercises.length, 3);
  await db.query("UPDATE workout_templates SET name='Renamed elsewhere' WHERE id=$1", [template]);
  assert.equal(await revision(), 1, "ordinary renames invalidate open editor revisions");
  const renamed = await snapshot();
  await rejectsCode(edit(other, 1, input()), "P0002");
  await rejectsCode(edit(owner, 1, input(), id(999)), "P0002");
  await rejectsCode(edit(owner, 0, input()), "40001");
  // Public archived ownership is NULL. This guards against a SQL three-valued-logic bypass.
  await rejectsCode(edit(owner, 1, input([movement(publicArchived)])), "22023");
  await rejectsCode(edit(owner, 1, input([movement(newArchived)])), "22023");
  await rejectsCode(edit(owner, 1, input([movement(foreignExercise)])), "22023");
  assert.deepEqual(await snapshot(), renamed);
  const savedInput = input([
    movement(ownArchived, {
      restSeconds: 0,
      supersetGroup: "A",
      sets: [
        dose({ setType: "warmup", targetWeight: 20, targetReps: 12 }),
        dose({
          setType: "rest_pause",
          targetWeight: 50,
          targetReps: 6,
          restSeconds: 15,
          tempo: "3-1-X-0",
        }),
      ],
    }),
    movement(ownPublished, {
      notes: "Private custom cue",
      restSeconds: 120,
      supersetGroup: "A",
      sets: [
        dose({
          setType: "drop",
          targetWeight: 30,
          targetReps: 10,
          restSeconds: 0,
          tempo: "2-0-1-0",
        }),
      ],
    }),
    movement(publicExercise, {
      supersetGroup: null,
      sets: [
        dose({ setType: "normal", targetReps: 5, targetWeight: 70 }),
        dose({ setType: "heavy", targetReps: 3, targetWeight: 75, restSeconds: 180 }),
      ],
    }),
    movement(timedExercise, {
      sets: [dose({ targetReps: null, targetWeight: null, targetDurationSeconds: 60 })],
    }),
  ]);
  assert.equal((await edit(owner, 1, savedInput)).rows[0].id, template);
  assert.equal(await revision(), 2);
  const saved = await snapshot();
  assert.equal(saved.template.name, savedInput.name);
  assert.equal(saved.template.description, savedInput.description);
  assert.deepEqual(
    saved.exercises.map((e) => e.exercise_id),
    savedInput.exercises.map((e) => e.exerciseId),
  );
  for (const [index, actual] of saved.exercises.entries()) {
    const expected = savedInput.exercises[index];
    assert.equal(actual.position, index);
    assert.equal(actual.notes, expected.notes);
    assert.equal(actual.rest_seconds, expected.restSeconds);
    assert.equal(actual.superset_group, expected.supersetGroup);
    assert.equal(actual.sets.length, expected.sets.length);
    for (const [position, actualSet] of actual.sets.entries()) {
      const expectedSet = expected.sets[position];
      assert.equal(actualSet.position, position);
      assert.equal(actualSet.set_type, expectedSet.setType);
      assert.equal(actualSet.target_reps, expectedSet.targetReps);
      assert.equal(
        actualSet.target_weight === null ? null : Number(actualSet.target_weight),
        expectedSet.targetWeight,
      );
      assert.equal(actualSet.target_duration_seconds, expectedSet.targetDurationSeconds);
      assert.equal(actualSet.rest_seconds, expectedSet.restSeconds);
      assert.equal(actualSet.tempo, expectedSet.tempo);
    }
  }
  assert.deepEqual(
    await history(),
    originalHistory,
    "editing prescriptions cannot rewrite historical workout snapshots",
  );
  await rejectsCode(edit(owner, 1, savedInput), "40001");
  // Each import origin independently blocks mutation even when its template owner matches.
  for (const table of [
    "user_saved_routines",
    "user_saved_program_routines",
    "coaching_days",
    "program_workout_slots",
  ]) {
    await db.query(`INSERT INTO ${table}(template_id) VALUES($1)`, [template]);
    await rejectsCode(edit(owner, 2, savedInput), "42501");
    assert.deepEqual(await snapshot(), saved);
    await db.query(`DELETE FROM ${table} WHERE template_id=$1`, [template]);
  }
  // This fails after parent update/delete/first inserts, so all state and revision must roll back.
  const invalid = input([
    movement(publicExercise),
    movement(ownArchived, { sets: [dose({ tempo: "invalid" })] }),
  ]);
  await rejectsCode(edit(owner, 2, invalid), "23514");
  assert.deepEqual(await snapshot(), saved);
  assert.deepEqual(await history(), originalHistory);
  for (const invalidInput of [
    { ...savedInput, name: "" },
    { ...savedInput, exercises: [] },
    { ...savedInput, exercises: [movement(publicExercise, { sets: [] })] },
  ]) {
    await rejectsCode(edit(owner, 2, invalidInput), "22023");
    assert.deepEqual(await snapshot(), saved);
  }
  await edit(owner, 2, input());
  const reduced = await snapshot();
  assert.equal(reduced.exercises.length, 1);
  assert.equal(reduced.exercises[0].sets.length, 1);
  assert.equal(reduced.template.revision, 3);
  // An archived private exercise cannot be added again once removed from this routine.
  await rejectsCode(edit(owner, 3, input([movement(ownArchived)])), "22023");
  assert.deepEqual(await snapshot(), reduced);
  assert.deepEqual(await history(), originalHistory);
  for (const role of ["anon", "authenticated"])
    assert.equal(
      (
        await db.query(
          "SELECT has_function_privilege($1,'public.edit_fitsync_workout_template(uuid,uuid,integer,jsonb)','EXECUTE') AS allowed",
          [role],
        )
      ).rows[0].allowed,
      false,
    );
  assert.equal(
    (
      await db.query(
        "SELECT has_function_privilege('service_role','public.edit_fitsync_workout_template(uuid,uuid,integer,jsonb)','EXECUTE') AS allowed",
      )
    ).rows[0].allowed,
    true,
  );
  console.log(
    "Routine editing migration: CAS/rename, owner/import guards, private/archive eligibility, exact advanced sets/order, atomic rollback, historical snapshots and RPC permissions passed.",
  );
} finally {
  await db.close();
}
