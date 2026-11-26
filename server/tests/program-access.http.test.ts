import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../src/common/errors.js";

Object.assign(process.env, {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
  GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com",
  JWT_SECRET: "test-secret-".repeat(6),
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test",
  REVENUECAT_SECRET_API_KEY: "test-only-server-key",
});
const { db } = await import("../src/config/supabase.js");
const { billingService } = await import("../src/modules/billing/billing.service.js");
const { freeEntitlement } = await import("../src/modules/billing/billing.policy.js");
const { default: programs } = await import("../src/modules/program-follow/program.routes.js");
const { default: catalog } = await import("../src/modules/training-catalog/catalog.routes.js");
const { default: catalogAdmin } =
  await import("../src/modules/training-catalog/catalog.admin.routes.js");
const { default: billing } = await import("../src/modules/billing/billing.routes.js");
const { default: coaching } = await import("../src/modules/coaching/coaching.routes.js");
const { default: workouts } = await import("../src/modules/workouts/workout.routes.js");
const { errorHandler } = await import("../src/middleware/error-handler.js");
const owner = "00000000-0000-4000-8000-000000000001";
const sid = "00000000-0000-4000-8000-000000000002";
const id = "00000000-0000-4000-8000-000000000003";
const outsider = "00000000-0000-4000-8000-000000000099";
const token = jwt.sign({ sid }, process.env.JWT_SECRET!, {
  subject: owner,
  issuer: "fitsync-api",
  audience: "fitsync-mobile",
  expiresIn: "10m",
  algorithm: "HS256",
});
const reminders = { timezone: "Asia/Kolkata", reminderEnabled: true, hour: 18, minute: 0 };
const paidActions = [
  { path: `/program-follow/follow/${id}`, body: { ...reminders, startDate: "2026-11-17" } },
  { path: `/program-follow/${id}/reminders`, method: "PATCH", body: reminders },
  { path: `/catalog/programs/${id}/save`, body: {} },
  {
    path: "/coaching/plans",
    body: { requestId: id, startDate: "2026-11-17", timezone: "Asia/Kolkata" },
  },
  { path: `/coaching/sessions/${id}/start`, body: { requestId: id } },
  { path: "/workouts/start", body: { programSlotId: id } },
];
let server: Server;
let base: string;
before(async () => {
  const app = express();
  app.use(express.json());
  app.use("/program-follow", programs);
  app.use("/catalog/admin", catalogAdmin);
  app.use("/billing", billing);
  app.use("/catalog", catalog);
  app.use("/coaching", coaching);
  app.use("/workouts", workouts);
  app.use(errorHandler);
  server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(0, "127.0.0.1", (error?: Error) =>
      error ? reject(error) : resolve(instance),
    );
    instance.once("error", reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  if (server?.listening) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

function database(t: test.TestContext, role = "user") {
  const queries: { table: string; filters: Record<string, unknown>; inserted?: any }[] = [];
  let created = false;
  t.mock.method(db, "from", (table: string) => {
    const query: (typeof queries)[number] = { table, filters: {} };
    queries.push(query);
    const result = () => ({
      error: null,
      data:
        table === "auth_sessions"
          ? { id: sid }
          : table === "workout_sessions"
            ? created
              ? { id, status: "active", workout_session_exercises: [] }
              : null
            : table === "user_saved_routines"
              ? { template_id: id }
              : table === "training_programs"
                ? []
                : null,
    });
    const builder: any = {
      select() {
        return builder;
      },
      eq(key: string, value: unknown) {
        query.filters[key] = value;
        return builder;
      },
      is() {
        return builder;
      },
      gt() {
        return builder;
      },
      order() {
        return builder;
      },
      limit() {
        return builder;
      },
      range() {
        return builder;
      },
      insert(value: unknown) {
        query.inserted = value;
        created = true;
        return builder;
      },
      async maybeSingle() {
        return { ...result(), data: table === "training_programs" ? null : result().data };
      },
      async single() {
        if (table === "app_users") {
          assert.equal(query.filters.id, owner);
          return { data: { role }, error: null };
        }
        return result();
      },
      then(resolve: any, reject: any) {
        return Promise.resolve(result()).then(resolve, reject);
      },
    };
    return builder;
  });
  return queries;
}

test("a database admin can open the program editor and use paid program actions without a purchase", async (t) => {
  database(t, "admin");
  const status = await request("/billing/status");
  assert.equal(status.status, 200);
  const { entitlement } = await status.json();
  assert.equal(entitlement.source, "admin");
  assert.equal(entitlement.active, true);
  assert.equal((await request("/catalog/admin/programs")).status, 200);
  const rpc = t.mock.method(db, "rpc", async (name: string, args: any) => {
    assert.equal(name, "follow_fitsync_program");
    assert.equal(args.p_user_id, owner);
    assert.equal(args.p_program_id, id);
    return { data: null, error: { code: "P0002", message: "Program not found." } };
  });
  // The program lookup deliberately returns no record. Admins still use the
  // same published program and account ownership checks after access is granted.
  assert.equal((await request(paidActions[0]!.path, paidActions[0]!)).status, 404);
  assert.equal(rpc.mock.callCount(), 1);
});

test("a paid subscription alone cannot open the admin program editor", async (t) => {
  database(t);
  const pro = verified(t, true);
  assert.equal((await request("/catalog/admin/programs")).status, 403);
  assert.equal(pro.mock.callCount(), 0);
});
function verified(t: test.TestContext, pro: boolean, fails = false) {
  return t.mock.method(billingService, "getEntitlement", async (userId: string) => {
    assert.equal(userId, owner, "Entitlement identity must come from the verified session");
    if (fails) throw new ApiError(503, "Provider unavailable");
    return {
      ...freeEntitlement(),
      ...(pro ? { active: true, tier: "pro" as const, source: "revenuecat" as const } : {}),
    };
  });
}
async function request(
  path: string,
  options: { method?: string; body?: unknown; authorized?: boolean; expectedOwner?: string } = {},
) {
  return fetch(`${base}${path}`, {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    headers: {
      "Content-Type": "application/json",
      ...(options.authorized === false ? {} : { Authorization: `Bearer ${token}` }),
      ...(options.expectedOwner ? { "X-FitSync-Owner": options.expectedOwner } : {}),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

test("free users cannot choose, save or start paid programs with forged client claims", async (t) => {
  const queries = database(t);
  const access = verified(t, false);
  const rpc = t.mock.method(db, "rpc", () => {
    throw new Error("Blocked requests must never mutate program data");
  });
  for (const action of paidActions) {
    const response = await request(action.path, {
      ...action,
      body: { ...action.body, userId: outsider, pro: true, tier: "pro" },
    });
    assert.equal(response.status, 402, action.path);
    assert.match((await response.json()).message, /Pro is required/);
  }
  assert.equal(access.mock.callCount(), paidActions.length);
  assert.equal(rpc.mock.callCount(), 0);
  assert.ok(queries.every((query) => query.table === "auth_sessions"));
});

test("verified Pro proceeds to owned program services and cannot start another account's coaching day", async (t) => {
  const queries = database(t);
  const access = verified(t, true);
  const rpc = t.mock.method(db, "rpc", async (_name: string, args: any) => {
    assert.equal(args.p_user_id, owner);
    return { data: null, error: { code: "P0002", message: "Program or session not found." } };
  });
  for (const action of paidActions) {
    const response = await request(action.path, action);
    assert.ok([404, 409].includes(response.status), `${action.path}: ${response.status}`);
  }
  assert.equal(access.mock.callCount(), paidActions.length);
  assert.equal(
    rpc.mock.callCount(),
    3,
    "Follow, reminder change and coaching start reach owned RPCs",
  );
  assert.ok(
    queries.some((query) => query.table === "coaching_commands" && query.filters.user_id === owner),
  );
  assert.ok(
    queries.some(
      (query) => query.table === "program_enrollments" && query.filters.user_id === owner,
    ),
  );
});

test("catalog browsing, normal routine save and direct workouts remain free without billing requests", async (t) => {
  const queries = database(t);
  const access = t.mock.method(billingService, "getEntitlement", () => {
    throw new Error("Normal workouts must not depend on billing");
  });
  const browse = await request("/catalog/programs", { authorized: false });
  assert.equal(browse.status, 200);
  assert.deepEqual(await browse.json(), []);
  const saved = await request(`/catalog/routines/${id}/save`, { body: {} });
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), { saved: true, templateId: id });
  const workout = await request("/workouts/start", { body: {} });
  assert.equal(workout.status, 201);
  assert.equal((await workout.json()).id, id);
  assert.equal(access.mock.callCount(), 0);
  const inserted = queries.find(
    (query) => query.table === "workout_sessions" && query.inserted,
  )?.inserted;
  assert.equal(inserted.user_id, owner);
  assert.equal(inserted.template_id, null);
  assert.equal(Object.hasOwn(inserted, "program_slot_id"), false);
});

test("expired members can stop programs and disable reminders without verified Pro", async (t) => {
  database(t);
  const access = t.mock.method(billingService, "getEntitlement", () => {
    throw new Error("Withdrawing consent must remain available");
  });
  const rpc = t.mock.method(db, "rpc", async (name: string, args: any) => {
    assert.equal(args.p_user_id, owner);
    if (name === "update_fitsync_program_reminders") assert.equal(args.p_enabled, false);
    return {
      data: null,
      error:
        name === "stop_fitsync_program"
          ? null
          : { code: "P0002", message: "Followed program not found." },
    };
  });
  assert.equal((await request(`/program-follow/${id}/stop`, { body: {} })).status, 204);
  assert.equal(
    (
      await request(`/program-follow/${id}/reminders`, {
        method: "PATCH",
        body: { ...reminders, reminderEnabled: false },
      })
    ).status,
    404,
  );
  assert.equal(access.mock.callCount(), 0);
  assert.equal(rpc.mock.callCount(), 2);
});

test("authentication and account switches fail before entitlement verification or program mutations", async (t) => {
  const queries = database(t);
  const access = verified(t, true);
  const rpc = t.mock.method(db, "rpc", () => {
    throw new Error("Authentication must reject first");
  });
  assert.equal((await request(paidActions[0]!.path, { body: {}, authorized: false })).status, 401);
  assert.equal(
    (await request(paidActions[0]!.path, { body: {}, expectedOwner: outsider })).status,
    409,
  );
  assert.equal(access.mock.callCount(), 0);
  assert.equal(rpc.mock.callCount(), 0);
  assert.ok(queries.every((query) => query.table === "auth_sessions"));
});

test("provider failures fail closed for program actions", async (t) => {
  const queries = database(t);
  verified(t, true, true);
  t.mock.method(console, "error", () => {});
  const rpc = t.mock.method(db, "rpc", () => {
    throw new Error("No program mutation during outage");
  });
  assert.equal((await request(paidActions[0]!.path, { body: paidActions[0]!.body })).status, 503);
  assert.equal(rpc.mock.callCount(), 0);
  assert.ok(queries.every((query) => query.table === "auth_sessions"));
});
