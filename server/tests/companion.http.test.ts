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
  REVENUECAT_SECRET_API_KEY: "",
});
const { db } = await import("../src/config/supabase.js");
const { default: routes } = await import("../src/modules/companion/companion.routes.js");
const { errorHandler } = await import("../src/middleware/error-handler.js");
const owner = "00000000-0000-4000-8000-000000000001",
  sid = "00000000-0000-4000-8000-000000000002";
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
  app.use("/api/companion", routes);
  app.use(errorHandler);
  server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(0, "127.0.0.1", (error?: Error) =>
      error ? reject(error) : resolve(instance),
    );
    instance.once("error", reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}/api/companion`;
});
after(async () => {
  if (server?.listening) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
function database(t: test.TestContext) {
  const scopes: { table: string; key: string; value: unknown }[] = [];
  t.mock.method(db, "from", (table: string) => {
    const result = {
      data: table === "auth_sessions" ? { id: sid } : table === "companion_shares" ? null : [],
      error: null,
    };
    const builder: any = {
      select() {
        return builder;
      },
      eq(key: string, value: unknown) {
        scopes.push({ table, key, value });
        return builder;
      },
      is() {
        return builder;
      },
      gt() {
        return builder;
      },
      gte() {
        return builder;
      },
      lt() {
        return builder;
      },
      lte() {
        return builder;
      },
      order() {
        return builder;
      },
      range() {
        return builder;
      },
      update() {
        return builder;
      },
      delete() {
        return builder;
      },
      maybeSingle: async () => result,
      then(resolve: any, reject: any) {
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    return builder;
  });
  return scopes;
}
function request(path: string, method = "GET", body?: unknown, extra: Record<string, string> = {}) {
  return fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
test("private companion endpoints reject anonymous requests before any database read", async (t) => {
  const from = t.mock.method(db, "from", () => {
    throw new Error("No account access before authentication");
  });
  assert.equal((await fetch(`${base}/state`)).status, 401);
  assert.equal(from.mock.callCount(), 0);
});
test("state, export and deletes stay available without a paid entitlement and are owner-scoped", async (t) => {
  const scopes = database(t);
  const rpc = t.mock.method(db, "rpc", async (_name: string, args: any) => {
    assert.equal(args.p_user_id, owner);
    assert.equal(args.p_expected_revision, 2);
    return { data: null, error: null };
  });
  const state = await request("/state");
  assert.equal(state.status, 200);
  assert.deepEqual(await state.json(), { records: [], photos: [], shares: [] });
  assert.match(state.headers.get("cache-control") ?? "", /no-store/);
  const report = await request("/reports?month=2026-11&timezone=Asia%2FKolkata");
  assert.equal(report.status, 200);
  assert.equal((await report.json()).summary.workouts, 0);
  assert.equal((await request("/records/readiness_2026-11-14?revision=2", "DELETE")).status, 200);
  assert.equal(rpc.mock.callCount(), 1);
  assert.ok(
    scopes.filter((scope) => scope.key === "user_id").every((scope) => scope.value === owner),
  );
});
test("account-switch headers block stale requests before private reads", async (t) => {
  const scopes = database(t);
  const response = await request("/state", "GET", undefined, {
    "X-FitSync-Owner": "00000000-0000-4000-8000-000000000099",
  });
  assert.equal(response.status, 409);
  assert.ok(scopes.every((scope) => scope.table === "auth_sessions"));
});
test("new Pro data fails closed when billing verification is unconfigured", async (t) => {
  database(t);
  const rpc = t.mock.method(db, "rpc", () => {
    throw new Error("Client cannot bypass Pro");
  });
  assert.equal(
    (
      await request("/records/checkin", "PUT", {
        kind: "readiness",
        date: "2026-11-14",
        expectedRevision: 0,
        data: { energy: 4 },
        isPro: true,
      })
    ).status,
    503,
  );
  assert.equal(
    (
      await request("/shares", "POST", {
        label: "Coach",
        fields: ["plan"],
        expiresInDays: 7,
        isPro: true,
      })
    ).status,
    503,
  );
  assert.equal(rpc.mock.callCount(), 0);
});
test("shared token endpoint is public, uncached and returns no data for an unavailable token", async (t) => {
  const scopes = database(t);
  const response = await fetch(`${base}/shared/${"a".repeat(43)}`);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.ok(scopes.every((scope) => scope.table === "companion_shares"));
  assert.ok(
    scopes.some(
      (scope) =>
        scope.key === "token_hash" && typeof scope.value === "string" && scope.value.length === 64,
    ),
  );
});
