import test from "node:test";
import assert from "node:assert/strict";
Object.assign(process.env, {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
  GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com",
  JWT_SECRET: "test-secret-".repeat(6),
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test",
});
const { db } = await import("../src/config/supabase.js");
const { startWorkout } = await import("../src/modules/workouts/workout.service.js");
for (const failSets of [false, true])
  test(`batched start preserves positions and targets on base schema (set failure: ${failSets})`, async (t) => {
    const writes: { table: string; rows: any[] }[] = [];
    const deletes: string[] = [];
    let exerciseReads = 0;
    t.mock.method(db, "from", (table: string) => {
      let insert: any;
      let deleting = false;
      const result = async () => {
        if (deleting) {
          deletes.push(table);
          return { data: null, error: null };
        }
        if (insert) {
          const rows = Array.isArray(insert) ? insert : [insert];
          writes.push({ table, rows });
          for (const row of rows)
            for (const key of ["superset_group", "tempo"])
              assert.equal(Object.hasOwn(row, key), false);
          if (table === "workout_logged_sets") {
            for (const row of rows) assert.equal(Object.hasOwn(row, "rest_seconds"), false);
            if (failSets) return { data: null, error: { code: "XX000", message: "failed" } };
          }
          return { data: { id: "session" }, error: null };
        }
        if (table === "workout_sessions")
          return {
            data: writes.length ? { id: "session", workout_session_exercises: [] } : null,
            error: null,
          };
        if (table === "program_enrollments") return { data: null, error: null };
        if (table === "exercises") {
          exerciseReads++;
          return {
            data: [
              { id: "a", name: "A", tracking_type: "reps_weight" },
              { id: "b", name: "B", tracking_type: "reps_weight" },
            ],
            error: null,
          };
        }
        if (table === "workout_templates")
          return {
            data: {
              name: "Routine",
              workout_template_exercises: [
                {
                  exercise_id: "b",
                  position: 9,
                  rest_seconds: 60,
                  notes: "second",
                  workout_template_sets: [],
                },
                {
                  exercise_id: "a",
                  position: 2,
                  rest_seconds: 90,
                  notes: "first",
                  workout_template_sets: [
                    {
                      position: 0,
                      set_type: "normal",
                      target_weight: 20,
                      target_reps: 8,
                      target_duration_seconds: null,
                    },
                  ],
                },
              ],
            },
            error: null,
          };
        throw new Error(table);
      };
      const q: any = {
        select: () => q,
        eq: () => q,
        in: () => q,
        or: () => q,
        order: () => q,
        insert: (value: any) => {
          insert = value;
          return q;
        },
        delete: () => {
          deleting = true;
          return q;
        },
        maybeSingle: result,
        single: result,
        then: (resolve: any, reject: any) => result().then(resolve, reject),
      };
      return q;
    });
    t.mock.method(console, "error", () => {});
    if (failSets) await assert.rejects(startWorkout("owner", "template"));
    else await startWorkout("owner", "template");
    assert.equal(exerciseReads, 1);
    assert.deepEqual(
      writes.map((w) => w.table),
      ["workout_sessions", "workout_session_exercises", "workout_logged_sets"],
    );
    const exercises = writes[1].rows;
    const sets = writes[2].rows;
    assert.deepEqual(
      exercises.map((e) => [e.exercise_id, e.position, e.notes]),
      [
        ["a", 0, "first"],
        ["b", 1, "second"],
      ],
    );
    assert.equal(sets[0].session_exercise_id, exercises[0].id);
    assert.equal(sets[0].weight_kg, 20);
    assert.equal(sets[0].reps, 8);
    assert.equal(sets[1].session_exercise_id, exercises[1].id);
    assert.deepEqual(deletes, failSets ? ["workout_sessions"] : []);
  });
