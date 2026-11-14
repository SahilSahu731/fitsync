import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
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
const { editTemplateSchema } = await import("../src/modules/workouts/workout.schema.js");
const { editTemplate } = await import("../src/modules/workouts/workout.service.js");
const { default: routes } = await import("../src/modules/workouts/workout.routes.js");
const { errorHandler } = await import("../src/middleware/error-handler.js");
const owner = "00000000-0000-4000-8000-000000000001",
  templateId = "00000000-0000-4000-8000-000000000002",
  exerciseId = "00000000-0000-4000-8000-000000000003",
  sid = "00000000-0000-4000-8000-000000000004";
const body = {
  name: "Updated upper",
  expectedRevision: 3,
  exercises: [
    {
      exerciseId,
      sets: [
        {
          setType: "rest_pause",
          targetReps: 8,
          targetWeight: 20,
          restSeconds: 20,
          tempo: "3-1-1-0",
        },
      ],
      supersetGroup: "A",
    },
  ],
};
const token = jwt.sign({ sid }, process.env.JWT_SECRET!, {
  subject: owner,
  issuer: "fitsync-api",
  audience: "fitsync-mobile",
  expiresIn: "10m",
  algorithm: "HS256",
});
let server: Server;
let base: string;
before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/api/workouts", routes);
  app.use(errorHandler);
  server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(0, "127.0.0.1", (error?: Error) =>
      error ? reject(error) : resolve(instance),
    );
    instance.once("error", reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}/api/workouts`;
});
after(async () => {
  if (server?.listening) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
function database(
  t: test.TestContext,
  rows: any[] = [{ id: templateId, name: "Old", revision: 3 }],
) {
  const scopes: { table: string; key: string; value: unknown }[] = [];
  t.mock.method(db, "from", (table: string) => {
    assert.ok(
      ["auth_sessions", "workout_templates"].includes(table),
      "Child replacements must go through the atomic SQL RPC",
    );
    const result = {
      data:
        table === "auth_sessions"
          ? { id: sid }
          : { id: templateId, name: "Updated upper", revision: 4 },
      error: null,
    };
    const query: any = {
      select() {
        return query;
      },
      eq(key: string, value: unknown) {
        scopes.push({ table, key, value });
        return query;
      },
      is() {
        return query;
      },
      gt() {
        return query;
      },
      order() {
        return query;
      },
      range: async () => ({ data: rows, error: null }),
      maybeSingle: async () => result,
    };
    return query;
  });
  return scopes;
}
test("full routine update schema requires an explicit revision and rejects hidden owner fields", () => {
  const input = editTemplateSchema.parse(body);
  assert.equal(input.expectedRevision, 3);
  assert.equal(input.exercises[0].sets[0].tempo, "3-1-1-0");
  const { expectedRevision: _revision, ...without } = body;
  assert.equal(editTemplateSchema.safeParse(without).success, false);
  assert.equal(editTemplateSchema.safeParse({ ...body, ownerId: owner }).success, false);
  assert.equal(editTemplateSchema.safeParse({ ...body, expectedRevision: -1 }).success, false);
});
test("personal edits scope all reads and send the complete ordered draft plus CAS revision to one RPC", async (t) => {
  const scopes = database(t);
  let args: any;
  t.mock.method(db, "rpc", async (name: string, value: any) => {
    assert.equal(name, "edit_fitsync_workout_template");
    args = value;
    return { data: templateId, error: null };
  });
  const saved = await editTemplate(owner, templateId, editTemplateSchema.parse(body));
  assert.equal(saved.revision, 4);
  assert.equal(args.p_user_id, owner);
  assert.equal(args.p_template_id, templateId);
  assert.equal(args.p_expected_revision, 3);
  assert.equal(args.p_data.exercises[0].supersetGroup, "A");
  assert.equal(args.p_data.exercises[0].sets[0].setType, "rest_pause");
  assert.ok(
    scopes.filter((scope) => scope.key === "user_id").every((scope) => scope.value === owner),
  );
});
test("all imported and coach-managed routine references are denied before mutation", async (t) => {
  const rpc = t.mock.method(db, "rpc", () => {
    throw new Error("Imported routine must not mutate");
  });
  for (const reference of [
    "user_saved_routines",
    "user_saved_program_routines",
    "coaching_days",
    "program_workout_slots",
  ]) {
    database(t, [{ id: templateId, [reference]: [{ id: "link" }] }]);
    await assert.rejects(editTemplate(owner, templateId, editTemplateSchema.parse(body)), {
      status: 403,
    });
    t.mock.restoreAll();
    t.mock.method(db, "rpc", () => {
      throw new Error("Imported routine must not mutate");
    });
  }
  assert.equal(rpc.mock.callCount(), 0);
});
test("stale routine updates become 409 and missing migrations produce actionable 503", async (t) => {
  database(t);
  let code = "40001";
  t.mock.method(db, "rpc", async () => ({ data: null, error: { code, message: "Conflict" } }));
  await assert.rejects(editTemplate(owner, templateId, editTemplateSchema.parse(body)), {
    status: 409,
  });
  code = "PGRST202";
  await assert.rejects(editTemplate(owner, templateId, editTemplateSchema.parse(body)), {
    status: 503,
  });
});
test("routine PUT requires authentication, validates revision, and uses the verified owner's scope", async (t) => {
  const scopes = database(t);
  t.mock.method(db, "rpc", async (_name: string, args: any) => {
    assert.equal(args.p_user_id, owner);
    assert.equal(args.p_expected_revision, 3);
    return { data: templateId, error: null };
  });
  const send = (payload: unknown, auth = true, extra: Record<string, string> = {}) =>
    fetch(`${base}/templates/${templateId}`, {
      method: "PUT",
      headers: {
        ...(auth ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
        ...extra,
      },
      body: JSON.stringify(payload),
    });
  assert.equal((await send(body, false)).status, 401);
  assert.equal((await send({ ...body, expectedRevision: undefined })).status, 400);
  const response = await send(body);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).revision, 4);
  const before = scopes.length;
  assert.equal((await send(body, true, { "X-FitSync-Owner": exerciseId })).status, 409);
  assert.ok(scopes.slice(before).every((scope) => scope.table === "auth_sessions"));
});
