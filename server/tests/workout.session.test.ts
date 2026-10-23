import test from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
  GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com",
  JWT_SECRET: "test-secret-".repeat(6),
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test"
});
const { db } = await import("../src/config/supabase.js");
const { getSession, getActiveSession } = await import("../src/modules/workouts/workout.service.js");

test("active workouts load relational muscle tags without querying nonexistent exercise columns", async t => {
  const sets = [{ id: "set", reps: 8, notes: "Controlled" }];
  const session = {
    id: "session", user_id: "owner", status: "active", notes: "Leg day",
    workout_session_exercises: [
      { id: "tagged", workout_logged_sets: sets, exercises: { exercise_muscles: [
        { role: "primary", exercise_muscle_groups: { code: "quads" } },
        { role: "secondary", exercise_muscle_groups: { code: "glutes" } },
        { role: "primary", exercise_muscle_groups: null }
      ] } },
      { id: "untagged", workout_logged_sets: [], exercises: { exercise_muscles: [] } },
      { id: "removed", workout_logged_sets: sets, exercises: null }
    ]
  };
  const queries: { columns: string; filters: Record<string, string> }[] = [];
  t.mock.method(db, "from", (table: string) => {
    assert.equal(table, "workout_sessions");
    return { select(columns: string) {
      const query = { columns, filters: {} as Record<string, string> };
      queries.push(query);
      const builder = {
        eq(key: string, value: string) { query.filters[key] = value; return builder; },
        async maybeSingle() { return { data: session, error: null }; },
        async single() {
          assert.match(columns, /exercises\(exercise_muscles\(role,exercise_muscle_groups\(code\)\)\)/);
          assert.doesNotMatch(columns, /primary_muscles|secondary_muscles/);
          return { data: session, error: null };
        }
      };
      return builder;
    } };
  });

  for (const result of [await getSession("owner", "session"), await getActiveSession("owner")]) {
    assert.ok(result);
    assert.equal(result.notes, "Leg day");
    assert.deepEqual(result.workout_session_exercises.map(e => e.exercises), [
      { primary_muscles: ["quads"], secondary_muscles: ["glutes"] },
      { primary_muscles: [], secondary_muscles: [] },
      { primary_muscles: [], secondary_muscles: [] }
    ]);
    assert.deepEqual(result.workout_session_exercises[0].workout_logged_sets, sets);
  }
  assert.ok(queries.every(query => query.filters.user_id === "owner"));
});
