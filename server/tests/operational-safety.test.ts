import test from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, {
  NODE_ENV: "test",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
  GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com",
  JWT_SECRET: "test-secret-".repeat(6),
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test",
});
const { db } = await import("../src/config/supabase.js");
const { rotateRefreshToken } = await import("../src/modules/auth/tokens.js");
const { DatabaseRateLimitStore } = await import("../src/middleware/rate-limit.js");
const { requestLog } = await import("../src/middleware/request-log.js");
const { EventEmitter } = await import("node:events");

test("SQL test setup rejects production and every supported connection variable before loading a driver", async () => {
  const { isolatedDatabase, CONNECTION_VARIABLES } = await import("./sql/isolated-database.mjs");
  for (const environment of [
    { NODE_ENV: "production" },
    ...CONNECTION_VARIABLES.map((key: string) => ({
      [key]: "production-connection",
    })),
  ]) {
    await assert.rejects(isolatedDatabase(environment), /isolated environment/);
  }
});

test("refresh rotation uses a single atomic RPC and returns 401 after persisted replay revocation", async (t) => {
  const session = "123e4567-e89b-42d3-a456-426614174000";
  const token = `${session}.${"a".repeat(64)}`;
  let outcome = "replayed";
  t.mock.method(db, "rpc", (name: string, input: any) => {
    assert.equal(name, "rotate_auth_session_refresh");
    assert.equal(input.p_session_id, session);
    assert.match(input.p_presented_hash, /^[a-f0-9]{64}$/);
    assert.notEqual(input.p_next_hash, input.p_presented_hash);
    assert.ok(!JSON.stringify(input).includes(token));
    return Promise.resolve({
      data: [{ outcome, user_id: outcome === "rotated" ? "athlete" : null }],
      error: null,
    }) as any;
  });
  await assert.rejects(rotateRefreshToken(token), (e: any) => e.status === 401);
  outcome = "rotated";
  const result = await rotateRefreshToken(token);
  assert.ok(result.refreshToken.startsWith(`${session}.`));
  assert.notEqual(result.refreshToken, token);
});

test("shared rate limits use stable private keys and return database reset times", async (t) => {
  const keys: string[] = [];
  let hits = 0;
  t.mock.method(db, "rpc", (name: string, input: any) => {
    assert.equal(name, "consume_rate_limit");
    keys.push(input.p_key);
    assert.equal(input.p_window_ms, 60000);
    return {
      abortSignal: async () => ({
        data: [{ total_hits: ++hits, reset_time: "2026-11-23T00:01:00Z" }],
        error: null,
      }),
    } as any;
  });
  const first = new DatabaseRateLimitStore("workouts");
  const second = new DatabaseRateLimitStore("workouts");
  const other = new DatabaseRateLimitStore("auth");
  assert.equal((await first.increment("192.0.2.1")).totalHits, 1);
  assert.equal((await second.increment("192.0.2.1")).totalHits, 2);
  await other.increment("192.0.2.1");
  assert.equal(keys[0], keys[1]);
  assert.notEqual(keys[0], keys[2]);
  assert.match(keys[0], /^[a-f0-9]{64}$/);
  assert.ok(!keys[0].includes("192.0.2.1"));
});

test("request logs correlate IDs without raw URLs, health values or credentials", (t) => {
  const logs: string[] = [];
  t.mock.method(console, "log", (message: string) => logs.push(message));
  const res = Object.assign(new EventEmitter(), {
    locals: {} as any,
    statusCode: 200,
    writableFinished: true,
    setHeader: (_key: string, _value: string) => {},
  });
  requestLog(
    {
      method: "GET",
      originalUrl: "/api/companion/shared/private-token?weight=81",
      route: { path: "/shared/:token" },
    } as any,
    res as any,
    () => {},
  );
  res.emit("finish");
  res.emit("close");
  assert.equal(logs.length, 1);
  const row = JSON.parse(logs[0]);
  assert.equal(row.requestId, res.locals.requestId);
  assert.equal(row.route, "/shared/:token");
  assert.doesNotMatch(logs[0], /private-token|weight|\?/);
});
test("shared rate limits fail closed on unavailable or malformed counter responses", async (t) => {
  let response: any;
  t.mock.method(db, "rpc", () => ({ abortSignal: async () => response }) as any);
  const store = new DatabaseRateLimitStore("workouts");
  for (const invalid of [
    { data: null, error: { message: "private database detail" } },
    { data: [], error: null },
    { data: [{ total_hits: "invalid", reset_time: new Date().toISOString() }], error: null },
    { data: [{ total_hits: 0, reset_time: new Date().toISOString() }], error: null },
    { data: [{ total_hits: 1, reset_time: "invalid" }], error: null },
  ]) {
    response = invalid;
    await assert.rejects(store.increment("192.0.2.1"), /^Error: Rate limit store unavailable$/);
  }
});
