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
const { customExerciseInputSchema } = await import("../src/modules/exercises/custom.schema.js");
const { customList, customArchive, customRestore, muscleIndex } =
  await import("../src/modules/exercises/custom.service.js");
const { getExercise, listExercises, listExercisePicker } =
  await import("../src/modules/exercises/exercise.service.js");
const { exerciseListSchema } = await import("../src/modules/exercises/exercise.schema.js");
const { db } = await import("../src/config/supabase.js");
const input = {
  name: "My cable press",
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
};
test("custom exercise schema permits private content without publishing/media controls", () => {
  assert.ok(customExerciseInputSchema.safeParse(input).success);
  for (const extra of [
    { owner_user_id: "foreign" },
    { created_by: "foreign" },
    { status: "published" },
    { slug: "public-catalog" },
    { isPro: true },
  ])
    assert.equal(customExerciseInputSchema.safeParse({ ...input, ...extra }).success, false);
  assert.equal(
    customExerciseInputSchema.safeParse({ ...input, primaryMuscles: [] }).success,
    false,
  );
  assert.equal(
    customExerciseInputSchema.safeParse({ ...input, secondaryMuscles: ["chest"] }).success,
    false,
  );
  assert.equal(
    customExerciseInputSchema.safeParse({ ...input, primaryMuscles: ["chest", "chest"] }).success,
    false,
  );
});
function queries(t: test.TestContext, results: any[]) {
  const calls: { table: string; filters: Record<string, unknown>; update?: unknown }[] = [];
  t.mock.method(db, "from", (table: string) => {
    const call = { table, filters: {} } as (typeof calls)[number];
    calls.push(call);
    const value = results.shift();
    assert.ok(value, `Unexpected query ${table}`);
    const builder: any = {
      select() {
        return builder;
      },
      eq(k: string, v: unknown) {
        call.filters[k] = v;
        return builder;
      },
      or(v: string) {
        call.filters.or = v;
        return builder;
      },
      order() {
        return builder;
      },
      range() {
        return builder;
      },
      update(v: unknown) {
        call.update = v;
        return builder;
      },
      maybeSingle: async () => value,
      then(resolve: any, reject: any) {
        return Promise.resolve(value).then(resolve, reject);
      },
    };
    return builder;
  });
  return calls;
}
test("private library and archive/restore always scope by authenticated owner", async (t) => {
  const calls = queries(t, [
    { data: [], error: null },
    { data: [{ id: "owned" }], error: null },
    { data: [{ id: "owned" }], error: null },
  ]);
  assert.deepEqual(await customList("owner"), []);
  await customArchive("owner", "owned");
  await customRestore("owner", "owned");
  assert.ok(calls.every((c) => c.filters.owner_user_id === "owner"));
  assert.equal(calls[1].filters.id, "owned");
  assert.equal((calls[1].update as any).status, "archived");
  assert.equal((calls[2].update as any).status, "published");
});
test("foreign archive returns not-found and cannot update public or another user's content", async (t) => {
  const calls = queries(t, [{ data: [], error: null }]);
  await assert.rejects(customArchive("other", "owned"), (e: any) => e.status === 404);
  assert.deepEqual(calls[0].filters, { id: "owned", owner_user_id: "other" });
});
test("catalog, picker and detail apply the same public-or-owner visibility rule", async (t) => {
  const calls = queries(t, [
    { data: [], error: null, count: 0 },
    { data: [], error: null },
    { data: null, error: null },
  ]);
  await listExercises(exerciseListSchema.parse({}), false, "owner");
  await listExercisePicker(1, "", "owner");
  await assert.rejects(getExercise("private-slug", false, "owner"), (e: any) => e.status === 404);
  assert.ok(calls.every((c) => c.filters.or === "owner_user_id.is.null,owner_user_id.eq.owner"));
  assert.ok(calls.every((c) => c.filters.status === "published"));
});
test("muscle index preserves private archived labels without publishing them", async (t) => {
  const calls = queries(t, [
    {
      data: [
        {
          id: "owned",
          primary_muscles: ["chest"],
          secondary_muscles: [],
          movement_pattern: "push",
        },
      ],
      error: null,
    },
  ]);
  const data = await muscleIndex("owner", 1);
  assert.equal(data.items[0].id, "owned");
  assert.match(String(calls[0].filters.or), /owner_user_id.eq.owner/);
  assert.match(String(calls[0].filters.or), /and\(owner_user_id.is.null,status.eq.published\)/);
});
