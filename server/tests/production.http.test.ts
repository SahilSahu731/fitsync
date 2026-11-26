import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

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

test("visitors read the download link and only an admin can publish a new revision", async (t) => {
  let row = {
    url: "https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata",
    revision: 1,
  };
  let role = "user";
  t.mock.method(db, "from", (table: string) => {
    const filters: Record<string, unknown> = {};
    let update: typeof row | undefined;
    const query = {
      select() {
        return query;
      },
      is() {
        return query;
      },
      gt() {
        return query;
      },
      eq(key: string, value: unknown) {
        filters[key] = value;
        return query;
      },
      update(value: typeof row) {
        update = value;
        return query;
      },
      maybeSingle() {
        return query.single();
      },
      single() {
        if (table === "auth_sessions") return { data: { id: "active" }, error: null };
        if (table === "app_users") return { data: { role }, error: null };
        assert.equal(table, "site_mobile_download");
        assert.equal(filters.id, true);
        if (update) {
          if (filters.revision !== row.revision) return { data: null, error: null };
          row = update;
        }
        return { data: row, error: null };
      },
    };
    return query as any;
  });
  const endpoint = `${base}/api/site/mobile-download`;
  const token = jwt.sign({ sid: "active" }, process.env.JWT_SECRET!, {
    subject: "owner",
    issuer: "fitsync-api",
    audience: "fitsync-mobile",
    expiresIn: "10m",
  });
  const put = (url: string, signedIn = true) =>
    fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(signedIn && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ url, revision: 1 }),
    });
  const initial = await fetch(endpoint);
  assert.equal(initial.headers.get("cache-control"), "no-store");
  assert.deepEqual(await initial.json(), { ...row, isPlaceholder: true });
  const replacement = "https://downloads.example.com/android?release=beta";
  assert.equal((await put(replacement, false)).status, 401);
  assert.equal((await put(replacement)).status, 403);
  role = "admin";
  for (const invalid of [
    "javascript:alert(1)",
    "/local",
    "https://user:password@example.com/app",
    "https://example.com/" + "x".repeat(2000),
  ])
    assert.equal((await put(invalid)).status, 400);
  assert.equal((await put(replacement)).status, 200);
  assert.equal((await put("https://stale.example.com")).status, 409);
  assert.deepEqual(await (await fetch(endpoint)).json(), {
    url: replacement,
    revision: 2,
    isPlaceholder: false,
  });
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

test("invalid JSON, oversized bodies and unsupported encodings fail as client input errors", async (t) => {
  const reports = t.mock.method(console, "error", () => {});
  for (const input of [
    { body: '{"refreshToken":"private-token"', headers: {}, status: 400 },
    {
      body: JSON.stringify({ refreshToken: "private-token".repeat(6000) }),
      headers: {},
      status: 413,
    },
    { body: "{}", headers: { "Content-Encoding": "compress" }, status: 415 },
  ]) {
    const response = await fetch(`${base}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...input.headers },
      body: input.body,
    });
    assert.equal(response.status, input.status);
    assert.doesNotMatch(JSON.stringify(await response.json()), /private-token|stack|SyntaxError/);
  }
  assert.equal(reports.mock.callCount(), 0);
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

test("Explore deletion requires an admin, respects published links, kind and record revision", async (t) => {
  const id = "53e71323-d3df-4af0-866f-c8adddd0d319";
  const slug = "test-session";
  const version = "2026-03-04T12:34:00Z";
  let role = "user";
  let referenced = true;
  let deleted = 0;
  const fixture = createClient("https://explore.test", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        const url = new URL(input.toString());
        const table = url.pathname.split("/").pop();
        if (table === "auth_sessions") return Response.json([{ id: "active" }]);
        if (table === "app_users") return Response.json({ role });
        assert.equal(table, "explore_resources");
        const params = url.searchParams;
        if (init?.method === "GET") {
          assert.equal(params.get("published"), "eq.true");
          assert.equal(params.get("id"), `neq.${id}`);
          assert.equal(
            params.get("body"),
            "cs." + JSON.stringify([{ links: [{ url: `/explore/resources/${slug}` }] }]),
          );
          return Response.json(referenced ? [{ id: "referrer" }] : []);
        }
        assert.equal(init?.method, "DELETE");
        assert.equal(params.get("id"), `eq.${id}`);
        assert.equal(params.get("slug"), `eq.${slug}`);
        if (params.get("kind") !== "eq.mobility" || params.get("updated_at") !== `eq.${version}`)
          return Response.json([]);
        assert.equal(params.get("tags"), 'not.cs.{"fitsync:tool"}');
        deleted++;
        return Response.json([{ id }]);
      },
    },
  });
  t.mock.method(db, "from", fixture.from.bind(fixture));
  const token = jwt.sign({ sid: "active" }, process.env.JWT_SECRET!, {
    subject: "owner",
    issuer: "fitsync-api",
    audience: "fitsync-mobile",
    expiresIn: "10m",
  });
  const remove = (kind = "mobility", updated_at = version) =>
    fetch(`${base}/api/explore/admin/${kind}/${id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ slug, updated_at }),
    });
  assert.equal((await remove()).status, 403);
  role = "admin";
  assert.equal((await remove()).status, 409);
  referenced = false;
  assert.equal((await remove("tools")).status, 409);
  assert.equal((await remove("mobility", "2026-03-03T12:34:00Z")).status, 409);
  assert.equal(deleted, 0);
  assert.equal((await remove()).status, 204);
  assert.equal(deleted, 1);
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
