import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";

Object.assign(process.env, {
  NODE_ENV: "test",
  SENTRY_DSN: "",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
  GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com",
  JWT_SECRET: "test-secret-".repeat(6),
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test",
  WEB_PROXY_SECRET: "proxy-test-secret-".repeat(3),
  REVENUECAT_SECRET_API_KEY: "",
});
const { app } = await import("../src/app.js");
const { db } = await import("../src/config/supabase.js");
let server: Server;
let base: string;
before(async () => {
  server = await new Promise<Server>((resolve, reject) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    instance.once("error", reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  if (server?.listening) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("health verifies database access without reading account data and is not cached", async (t) => {
  t.mock.method(db, "from", (table: string) => {
    assert.equal(table, "app_users");
    return {
      select(column: string, options: unknown) {
        assert.equal(column, "id");
        assert.deepEqual(options, { head: true });
        return {
          limit(limit: number) {
            assert.equal(limit, 1);
            return {
              abortSignal: async (signal: AbortSignal) => {
                assert.ok(signal instanceof AbortSignal);
                return { error: null };
              },
            };
          },
        };
      },
    } as any;
  });
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { ok: true, service: "fitsync-api", database: "up" });
});

test("database errors and network timeouts return 503 without exposing failure details", async (t) => {
  for (const failure of ["database", "timeout"]) {
    t.mock.method(
      db,
      "from",
      () =>
        ({
          select: () => ({
            limit: () => ({
              abortSignal: async () => {
                if (failure === "timeout") throw new Error("private URL and token");
                return { error: { message: "private database details" } };
              },
            }),
          }),
        }) as any,
    );
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      ok: false,
      service: "fitsync-api",
      database: "unavailable",
    });
    t.mock.restoreAll();
  }
});

async function login(headers: Record<string, string>) {
  return fetch(`${base}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: "{}",
  });
}
test("one client hitting the auth limit does not block other clients behind the ingress", async () => {
  assert.equal(app.get("trust proxy"), 1);
  for (let i = 0; i < 30; i++)
    assert.equal((await login({ "X-Forwarded-For": "198.51.100.10" })).status, 400);
  assert.equal((await login({ "X-Forwarded-For": "198.51.100.10" })).status, 429);
  assert.equal((await login({ "X-Forwarded-For": "198.51.100.11" })).status, 400);
  // Untrusted leftmost forwarded entries cannot change the ingress-selected key.
  assert.equal((await login({ "X-Forwarded-For": "192.0.2.99, 198.51.100.10" })).status, 429);
  // A browser cannot bypass its limit by forging the BFF headers.
  assert.equal(
    (
      await login({
        "X-Forwarded-For": "198.51.100.10",
        "X-FitSync-Client-IP": "192.0.2.99",
        "X-FitSync-Proxy-Secret": "incorrect",
      })
    ).status,
    429,
  );
});
test("authenticated BFF requests have independent per-user auth limits", async () => {
  const headers = {
    "X-Forwarded-For": "203.0.113.1",
    "X-FitSync-Proxy-Secret": process.env.WEB_PROXY_SECRET!,
    "X-FitSync-Client-IP": "192.0.2.10",
  };
  for (let i = 0; i < 30; i++) assert.equal((await login(headers)).status, 400);
  assert.equal((await login(headers)).status, 429);
  assert.equal((await login({ ...headers, "X-FitSync-Client-IP": "192.0.2.11" })).status, 400);
});

test("draining fails readiness and rejects new API work with a retryable response", async () => {
  const { beginDraining } = await import("../src/common/lifecycle.js");
  beginDraining();
  const readiness = await fetch(`${base}/health`);
  assert.equal(readiness.status, 503);
  assert.deepEqual(await readiness.json(), {
    ok: false,
    service: "fitsync-api",
    status: "draining",
  });
  const response = await fetch(`${base}/api/workouts/history`);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "5");
  assert.match(response.headers.get("x-request-id")!, /^[a-f0-9-]{36}$/);
});
