import test from "node:test";
import assert from "node:assert/strict";
Object.assign(process.env, { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real", GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com", JWT_SECRET: "test-secret-".repeat(6), CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test" });
const { db } = await import("../src/config/supabase.js");
const { finishWorkout } = await import("../src/modules/workouts/workout.service.js");

function fixture(t: test.TestContext) {
  const row: Record<string, any> = { id: "session", status: "active", started_at: new Date(Date.now() - 3600000).toISOString(), workout_session_exercises: [] };
  let updates = 0;
  t.mock.method(db, "from", (table: string) => {
    assert.equal(table, "workout_sessions");
    const filters: Record<string, unknown> = {};
    let patch: Record<string, unknown> | undefined;
    const result = async () => {
      assert.equal(filters.user_id, "owner"); assert.equal(filters.id, "session");
      if (patch) { assert.equal(filters.status, "active"); Object.assign(row, patch); updates++; }
      return { data: { ...row }, error: null };
    };
    const builder: any = { select: () => builder,
      update(value: Record<string, unknown>) { patch = value; return builder; },
      eq(key: string, value: unknown) { filters[key] = value; return builder; },
      maybeSingle: result, single: result, then(resolve: any, reject: any) { return result().then(resolve, reject); },
    };
    return builder;
  });
  return { row, get updates() { return updates; } };
}

test("offline completion preserves when training ended and is idempotent on retry", async t => {
  const f = fixture(t);
  const expected = new Date(Date.parse(f.row.started_at) + 1800 * 1000).toISOString();
  await finishWorkout("owner", "session", "completed", "Felt good", 1800);
  assert.equal(f.row.finished_at, expected);
  assert.equal(f.row.elapsed_seconds, 1800);
  assert.equal(f.row.notes, "Felt good");
  assert.ok(Date.parse(f.row.updated_at) > Date.parse(f.row.finished_at));
  await finishWorkout("owner", "session", "completed", "Retry", 3600);
  assert.equal(f.row.finished_at, expected);
  assert.equal(f.row.elapsed_seconds, 1800);
  assert.equal(f.updates, 1);
  await assert.rejects(finishWorkout("owner", "session", "discarded"), /already ended/);
});

test("client clock skew cannot put a completed workout in the future", async t => {
  const f = fixture(t);
  await finishWorkout("owner", "session", "completed", "", 7200);
  assert.ok(Date.parse(f.row.finished_at) <= Date.now());
});
