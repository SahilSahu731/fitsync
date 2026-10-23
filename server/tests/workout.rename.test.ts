import test from "node:test";
import assert from "node:assert/strict";
Object.assign(process.env, { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real", GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com", JWT_SECRET: "test-secret-".repeat(6), CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test" });
const { db } = await import("../src/config/supabase.js");
const { renameTemplate } = await import("../src/modules/workouts/workout.service.js");
test("rename rejects missing, imported, and program routines; permits a personal routine", async t => {
  let rows: Record<string, unknown>[] = []; let writes = 0; const scopes: unknown[] = [];
  t.mock.method(db, "from", () => ({
    select: () => ({ eq: (key: string, value: string) => { scopes.push([key, value]); return { order: async () => ({ data: rows, error: null }) }; } }),
    update: () => { writes++; return { eq: () => ({ eq: async (key: string, value: string) => { scopes.push([key, value]); return { error: null }; } }) }; },
  }));
  await assert.rejects(renameTemplate("owner", "routine", "New name"), /not found/);
  rows = [{ id: "routine", user_saved_routines: [{ routine_id: "source" }], user_saved_program_routines: [] }];
  await assert.rejects(renameTemplate("owner", "routine", "New name"), /Only routines you created/);
  rows = [{ id: "routine", user_saved_routines: [], user_saved_program_routines: [{ id: "link" }] }];
  await assert.rejects(renameTemplate("owner", "routine", "New name"), /Only routines you created/);
  assert.equal(writes, 0);
  rows = [{ id: "routine", user_saved_routines: [], user_saved_program_routines: [] }];
  assert.deepEqual(await renameTemplate("owner", "routine", "New name"), { id: "routine", name: "New name" });
  assert.equal(writes, 1);
  assert.ok(scopes.every(scope => JSON.stringify(scope) === JSON.stringify(["user_id", "owner"])));
});
