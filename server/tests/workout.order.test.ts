import test from "node:test";
import assert from "node:assert/strict";
import { planPositionChanges } from "../src/modules/workouts/workout.order.js";
Object.assign(process.env, { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real", GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com", JWT_SECRET: "test-secret-".repeat(6), CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test" });
const { db } = await import("../src/config/supabase.js");
const { reorderSessionExercises, removeSessionExercise } = await import("../src/modules/workouts/workout.service.js");

test("all permutations keep unique positions at every step, including existing gaps", () => {
  const permutations = (ids: string[]): string[][] => ids.length ? ids.flatMap(id => permutations(ids.filter(other => other !== id)).map(rest => [id, ...rest])) : [[]];
  for (const ids of permutations(["a", "b", "c", "d"])) {
    for (const starts of [[0, 1, 2, 3], [2, 4, 8, 9]]) {
      const rows = ["a", "b", "c", "d"].map((id, index) => ({ id, position: starts[index] }));
      for (const change of planPositionChanges(rows, ids)) {
        const row = rows.find(row => row.id === change.id)!;
        assert.equal(row.position, change.from);
        assert.ok(!rows.some(row => row.position === change.to));
        row.position = change.to;
      }
      assert.deepEqual([...rows].sort((a, b) => a.position - b.position).map(row => row.id), ids);
    }
  }
  assert.throws(() => planPositionChanges([{ id: "a", position: 0 }], ["b"]));
  assert.throws(() => planPositionChanges([{ id: "a", position: 0 }, { id: "b", position: 1 }], ["a", "a"]));
});

function fixture(t: test.TestContext, failAt = 0, status = "active") {
  const rows = [{ id: "a", position: 0 }, { id: "b", position: 1 }, { id: "c", position: 2 }];
  let updates = 0;
  t.mock.method(db, "from", (table: string) => {
    let operation = "select"; let patch: any; const filters: Record<string, unknown> = {};
    const result = async () => {
      if (table === "workout_sessions") {
        assert.equal(filters.user_id, "owner"); assert.equal(filters.id, "session");
        return { data: { id: "session", status, workout_session_exercises: rows.map(row => ({ ...row, exercises: null, workout_logged_sets: [] })) }, error: null };
      }
      assert.equal(table, "workout_session_exercises"); assert.equal(filters.session_id, "session");
      const index = rows.findIndex(row => row.id === filters.id && (filters.position === undefined || row.position === filters.position));
      if (operation === "update") {
        if (++updates === failAt) return { data: null, error: { message: "simulated write failure" } };
        if (index < 0) return { data: [], error: null };
        assert.ok(!rows.some(row => row.position === patch.position));
        rows[index].position = patch.position;
        return { data: [{ id: rows[index].id }], error: null };
      }
      if (operation === "delete") return { data: index < 0 ? [] : rows.splice(index, 1), error: null };
      return { data: rows.map(row => ({ ...row })), error: null };
    };
    const builder: any = {
      select: () => builder, eq(key: string, value: unknown) { filters[key] = value; return builder; },
      update(value: any) { operation = "update"; patch = value; return builder; }, delete() { operation = "delete"; return builder; },
      maybeSingle: result, single: result, then(resolve: any, reject: any) { return result().then(resolve, reject); }
    };
    return builder;
  });
  return rows;
}
test("saved order is persisted and scoped to the owner's active session", async t => {
  const rows = fixture(t);
  await reorderSessionExercises("owner", "session", ["c", "a", "b"]);
  assert.deepEqual([...rows].sort((a, b) => a.position - b.position).map(row => row.id), ["c", "a", "b"]);
});
test("failed reordering restores the original positions", async t => {
  const rows = fixture(t, 3);
  await assert.rejects(reorderSessionExercises("owner", "session", ["c", "a", "b"]));
  assert.deepEqual(rows.map(row => row.position), [0, 1, 2]);
});
test("stale and completed workouts cannot be reordered", async t => {
  const rows = fixture(t);
  await assert.rejects(reorderSessionExercises("owner", "session", ["a", "c"]), /list changed/);
  assert.deepEqual(rows.map(row => row.position), [0, 1, 2]);
});
test("completed workouts cannot be edited", async t => {
  fixture(t, 0, "completed");
  await assert.rejects(reorderSessionExercises("owner", "session", ["a", "b", "c"]), /no longer active/);
  await assert.rejects(removeSessionExercise("owner", "session", "a"), /no longer active/);
});
test("remove affects only the requested exercise in the session", async t => {
  const rows = fixture(t);
  await removeSessionExercise("owner", "session", "b");
  assert.deepEqual(rows.map(row => row.id), ["a", "c"]);
  await assert.rejects(removeSessionExercise("owner", "session", "other"), /not found/);
});
