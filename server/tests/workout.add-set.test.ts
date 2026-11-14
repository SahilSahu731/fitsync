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
const { addSet } = await import("../src/modules/workouts/workout.service.js");

function fixture(t: test.TestContext, status = "active", owns = true) {
  const calls: string[] = [];
  let inserted: Record<string, unknown> | null = null;
  t.mock.method(db, "from", (table: string) => {
    calls.push(table);
    const filters: Record<string, unknown> = {};
    const result = async () => {
      if (table === "workout_sessions") {
        assert.equal(filters.user_id, "owner");
        return { data: owns ? { id: "session", status } : null, error: null };
      }
      if (table === "workout_session_exercises") {
        assert.equal(filters.session_id, "session");
        assert.equal(filters.id, "exercise");
        return { data: { id: "exercise" }, error: null };
      }
      assert.equal(table, "workout_logged_sets");
      if (inserted) return { data: { id: "added", ...inserted, completed_at: null }, error: null };
      return {
        data: [
          { position: 2, weight_kg: 40, reps: 10, duration_seconds: null, distance_meters: null },
        ],
        error: null,
      };
    };
    const builder: any = {
      select: () => builder,
      order: () => builder,
      limit: () => builder,
      eq(key: string, value: unknown) {
        filters[key] = value;
        return builder;
      },
      insert(value: Record<string, unknown>) {
        inserted = value;
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
  return {
    calls,
    get inserted() {
      return inserted;
    },
  };
}

test("compact add returns only the new unlogged set without hydrating the session", async (t) => {
  const f = fixture(t);
  const result = await addSet(
    "owner",
    "session",
    "exercise",
    { setType: "normal", weightKg: null, reps: null },
    true,
  );
  assert.equal(result.id, "added");
  assert.equal(result.position, 3);
  assert.equal(result.set_type, "normal");
  assert.equal(result.reps, 10);
  assert.equal(result.completed_at, null);
  assert.equal(f.calls.filter((table) => table === "workout_sessions").length, 1);
  assert.equal(f.calls.length, 4);
});

test("compact additions still reject completed and foreign workouts", async (t) => {
  let f = fixture(t, "completed");
  await assert.rejects(
    addSet("owner", "session", "exercise", { setType: "normal", weightKg: null, reps: null }, true),
    /no longer active/,
  );
  assert.equal(f.inserted, null);
  t.mock.restoreAll();
  f = fixture(t, "active", false);
  await assert.rejects(
    addSet("owner", "session", "exercise", { setType: "normal", weightKg: null, reps: null }, true),
    /not found/i,
  );
  assert.equal(f.inserted, null);
});
