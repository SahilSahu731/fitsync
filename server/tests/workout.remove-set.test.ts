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
const { removeSet } = await import("../src/modules/workouts/workout.service.js");

function fixture(t: test.TestContext, status = "active", ownsSession = true) {
  const sets = [
    { id: "mine", session_exercise_id: "exercise" },
    { id: "other", session_exercise_id: "foreign-exercise" },
  ];
  t.mock.method(db, "from", (table: string) => {
    const filters: Record<string, unknown> = {};
    let allowed: string[] = [];
    const result = async () => {
      if (table === "workout_sessions") {
        assert.equal(filters.user_id, "owner");
        assert.equal(filters.id, "session");
        return {
          data: ownsSession ? { id: "session", status, workout_session_exercises: [] } : null,
          error: null,
        };
      }
      if (table === "workout_session_exercises") {
        assert.equal(filters.session_id, "session");
        return { data: [{ id: "exercise" }], error: null };
      }
      assert.equal(table, "workout_logged_sets");
      const index = sets.findIndex(
        (set) => set.id === filters.id && allowed.includes(set.session_exercise_id),
      );
      return { data: index < 0 ? [] : sets.splice(index, 1), error: null };
    };
    const builder: any = {
      select: () => builder,
      delete: () => builder,
      eq(key: string, value: unknown) {
        filters[key] = value;
        return builder;
      },
      in(key: string, value: string[]) {
        assert.equal(key, "session_exercise_id");
        allowed = value;
        return builder;
      },
      maybeSingle: result,
      single: result,
      then(resolve: any, reject: any) {
        return result().then(resolve, reject);
      },
    };
    return builder;
  });
  return sets;
}

test("remove set deletes only a set in the owner's active workout", async (t) => {
  const rows = fixture(t);
  await assert.rejects(removeSet("owner", "session", "other"), /not found/i);
  assert.equal(rows.length, 2);
  await removeSet("owner", "session", "mine");
  assert.deepEqual(
    rows.map((set) => set.id),
    ["other"],
  );
});
test("completed workout sets cannot be removed", async (t) => {
  const rows = fixture(t, "completed");
  await assert.rejects(removeSet("owner", "session", "mine"), /no longer active/);
  assert.equal(rows.length, 2);
});
test("a session belonging to another account cannot be changed", async (t) => {
  const rows = fixture(t, "active", false);
  await assert.rejects(removeSet("owner", "session", "mine"), /not found/i);
  assert.equal(rows.length, 2);
});
