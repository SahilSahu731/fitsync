import test from "node:test";
import assert from "node:assert/strict";
Object.assign(process.env, {
  SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
  GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com", JWT_SECRET: "test-secret-".repeat(6),
  CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test"
});
const { db } = await import("../src/config/supabase.js");
const { addSessionExercises } = await import("../src/modules/workouts/workout.service.js");
const { addSessionExercisesSchema } = await import("../src/modules/workouts/workout.schema.js");

type Query = { table: string; operation: string; filters: Record<string, unknown>; rows?: any; columns?: string };
function mockQueries(t: test.TestContext, results: { data?: any; error?: any }[]) {
  const queries: Query[] = [];
  t.mock.method(db, "from", (table: string) => {
    const query: Query = { table, operation: "select", filters: {} };
    queries.push(query);
    const result = results.shift();
    assert.ok(result, `Unexpected database query to ${table}`);
    const done = () => Promise.resolve({ data: result.data ?? null, error: result.error ?? null });
    const builder: any = {
      select(columns: string) { query.columns = columns; return builder; },
      eq(key: string, value: unknown) { query.filters[key] = value; return builder; },
      in(key: string, value: unknown) { query.filters[key] = value; return builder; },
      insert(rows: unknown) { query.operation = "insert"; query.rows = rows; return builder; },
      delete() { query.operation = "delete"; return builder; },
      single: done, maybeSingle: done,
      then(resolve: any, reject: any) { return done().then(resolve, reject); }
    };
    return builder;
  });
  return queries;
}
const session = { id: "session", status: "active", workout_session_exercises: [] };
const catalog = [
  { id: "a", name: "Squat", tracking_type: "reps_weight" },
  { id: "b", name: "Push up", tracking_type: "reps" }
];

test("batch preserves selection order, adds every initial set, and hydrates only once", async t => {
  const queries = mockQueries(t, [
    { data: session }, { data: catalog }, { data: [{ exercise_id: "existing", position: 3 }] },
    { data: [{ id: "item-b" }, { id: "item-a" }] }, {}, { data: session }, { data: session }
  ]);
  await addSessionExercises("owner", "session", ["b", "a"]);
  assert.equal(queries.length, 7);
  assert.equal(queries[0].filters.user_id, "owner");
  assert.equal(queries[1].filters.status, "published");
  assert.deepEqual(queries[3].rows.map((row: any) => [row.exercise_id, row.position]), [["b", 4], ["a", 5]]);
  assert.deepEqual(queries[4].rows.map((row: any) => row.session_exercise_id), ["item-b", "item-a"]);
  assert.equal(queries[6].filters.user_id, "owner");
});

test("retrying a saved selection does not create duplicate exercises", async t => {
  const queries = mockQueries(t, [
    { data: session }, { data: catalog }, { data: [{ exercise_id: "a", position: 0 }, { exercise_id: "b", position: 1 }] },
    { data: session }, { data: session }
  ]);
  await addSessionExercises("owner", "session", ["a", "b"]);
  assert.ok(queries.every(query => query.operation === "select"));
});

test("an unavailable selection cannot cause partial additions", async t => {
  const queries = mockQueries(t, [{ data: session }, { data: [catalog[0]] }, { data: [] }]);
  await assert.rejects(addSessionExercises("owner", "session", ["a", "b"]), /unavailable/);
  assert.ok(queries.every(query => query.operation === "select"));
});

test("inactive workouts reject additions before reading or writing exercises", async t => {
  const queries = mockQueries(t, [{ data: { ...session, status: "completed" } }]);
  await assert.rejects(addSessionExercises("owner", "session", ["a"]), /no longer active/);
  assert.equal(queries.length, 1);
});

test("failed set insertion removes only the newly added exercise rows", async t => {
  const queries = mockQueries(t, [
    { data: session }, { data: catalog }, { data: [] }, { data: [{ id: "new-a" }, { id: "new-b" }] },
    { error: { message: "set insertion failed" } }, {}
  ]);
  await assert.rejects(addSessionExercises("owner", "session", ["a", "b"]));
  assert.equal(queries[5].operation, "delete");
  assert.deepEqual(queries[5].filters, { session_id: "session", id: ["new-a", "new-b"] });
});

test("batch validates selection size and duplicate exercise IDs", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  assert.ok(addSessionExercisesSchema.safeParse({ exerciseIds: [id] }).success);
  for (const ids of [[], [id, id], Array(51).fill(id)]) assert.equal(addSessionExercisesSchema.safeParse({ exerciseIds: ids }).success, false);
});
