import test from "node:test";
import assert from "node:assert/strict";
import { createTemplateSchema, updateSessionExerciseSchema, updateSetSchema } from "../src/modules/workouts/workout.schema.js";
Object.assign(process.env, {
  SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
  GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com", JWT_SECRET: "test-secret-".repeat(6),
  CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test",
});
const { db } = await import("../src/config/supabase.js");
const { updateSessionExercise } = await import("../src/modules/workouts/workout.service.js");
test("advanced workout settings validate without allowing unknown input", () => {
  const parsed = updateSetSchema.parse({ setType: "rest_pause", restSeconds: 15, tempo: "3-1-X-0" });
  assert.equal(parsed.restSeconds, 15);
  assert.equal(updateSetSchema.safeParse({ restSeconds: null, tempo: null }).success, true);
  for (const patch of [{ restSeconds: 901 }, { restSeconds: -1 }, { tempo: "2-0-1" }, { tempo: "20-0-X-0" }, { tempo: "2-0-x-0" }, { user_id: "other" }]) assert.equal(updateSetSchema.safeParse(patch).success, false);
  assert.equal(updateSessionExerciseSchema.safeParse({ restSeconds: 0, supersetGroup: "A" }).success, true);
  assert.equal(updateSessionExerciseSchema.safeParse({ supersetGroup: null }).success, true);
  assert.equal(updateSessionExerciseSchema.safeParse({}).success, false);
  assert.equal(updateSessionExerciseSchema.safeParse({ supersetGroup: "spaces not allowed" }).success, false);
  const template = createTemplateSchema.parse({ name: "Upper", exercises: [{ exerciseId: "00000000-0000-4000-8000-000000000001", supersetGroup: "A", sets: [{ setType: "rest_pause", restSeconds: 10, tempo: "2-0-X-0" }] }] });
  assert.equal(template.exercises[0].sets[0].tempo, "2-0-X-0");
});
test("exercise updates scope the active session owner and the exact exercise row", async (t) => {
  const filters: Record<string, unknown>[] = [];
  let saved: Record<string, unknown> | null = null;
  t.mock.method(db, "from", (table: string) => {
    const filter: Record<string, unknown> = {};
    filters.push(filter);
    const result = async () => table === "workout_sessions"
      ? { data: { id: "session", status: "active", workout_session_exercises: [] }, error: null }
      : { data: [{ id: "exercise" }], error: null };
    const q: any = { select: () => q, eq: (k: string, v: unknown) => { filter[k] = v; return q; }, update: (data: Record<string, unknown>) => { saved = data; return q; }, maybeSingle: result, single: result, then: (resolve: any, reject: any) => result().then(resolve, reject) };
    return q;
  });
  await updateSessionExercise("owner", "session", "exercise", { restSeconds: 30, supersetGroup: "B" });
  assert.deepEqual(saved, { rest_seconds: 30, superset_group: "B" });
  assert.equal(filters[0].user_id, "owner");
  assert.equal(filters[1].session_id, "session");
  assert.equal(filters[1].id, "exercise");
});
test("foreign, completed and missing exercise updates fail without broad mutation", async (t) => {
  for (const mode of ["foreign", "completed", "missing"]) {
    let writes = 0;
    t.mock.method(db, "from", (table: string) => {
      const result = async () => table === "workout_sessions"
        ? { data: mode === "foreign" ? null : { id: "session", status: mode === "completed" ? "completed" : "active" }, error: null }
        : { data: [], error: null };
      const q: any = { select: () => q, eq: () => q, update: () => { writes++; return q; }, maybeSingle: result, then: (resolve: any, reject: any) => result().then(resolve, reject) };
      return q;
    });
    await assert.rejects(updateSessionExercise("owner", "session", "exercise", { restSeconds: 0 }), /not found|no longer active/);
    assert.equal(writes, mode === "missing" ? 1 : 0);
    t.mock.restoreAll();
  }
});
