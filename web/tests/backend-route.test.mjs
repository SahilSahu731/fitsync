import test from "node:test";
import assert from "node:assert/strict";
import { loadTypeScript } from "./load-typescript.mjs";

class NextResponse extends Response {
  static json(value, init) {
    return new NextResponse(JSON.stringify(value), {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  }
}
function fixture({ token, result = Response.json({ ok: true }) } = {}) {
  const calls = [];
  const route = loadTypeScript("../src/app/api/backend/[...path]/route.ts", {
    "next/server": { NextResponse },
    "@/lib/catalog-access": loadTypeScript("../src/lib/catalog-access.ts"),
    "@/lib/request-body": loadTypeScript("../src/lib/request-body.ts"),
    "@/lib/server-api": {
      accessToken: async () => token,
      validOrigin: (request) => request.headers.get("origin") === "http://localhost",
      unavailable: () => Response.json({ message: "Unavailable" }, { status: 503 }),
      upstream: async (path, options) => {
        calls.push({ path, options });
        if (result instanceof Error) throw result;
        return result;
      },
    },
  });
  return {
    calls,
    request(path, { method = "GET", body, headers = {}, search = "" } = {}) {
      const request = new Request(`http://localhost/api/backend/${path}${search}`, {
        method,
        body,
        headers: { origin: "http://localhost", ...headers },
      });
      request.nextUrl = new URL(request.url);
      return route[method](request, { params: Promise.resolve({ path: path.split("/") }) });
    },
  };
}

test("the proxy exposes published catalog, download link and valid shared reads without authentication", async () => {
  for (const path of [
    "site/mobile-download",
    "catalog/programs",
    "catalog/routines",
    "catalog/categories",
    "catalog/programs/123e4567-e89b-12d3-a456-426614174000",
    "catalog/routines/123e4567-e89b-12d3-a456-426614174000",
    `companion/shared/${"a".repeat(43)}`,
  ]) {
    const f = fixture();
    assert.equal((await f.request(path)).status, 200, path);
    assert.equal(f.calls.length, 1);
  }
  for (const path of [
    "site/mobile-download/private",
    "me",
    "exercises",
    "workouts/templates",
    "catalog/admin/programs",
    "catalog/my-routines",
    "catalog/my-programs",
    "catalog/programs/123e4567-e89b-12d3-a456-426614174000/save",
    "catalog/programs/not-a-uuid",
    "catalog/routines/bad-id",
    `companion/shared/${"a".repeat(42)}`,
  ]) {
    const f = fixture();
    assert.equal((await f.request(path)).status, 401, path);
    assert.equal(f.calls.length, 0);
  }
  for (const method of ["POST", "PATCH", "DELETE", "PUT"]) {
    const f = fixture();
    assert.equal((await f.request("site/mobile-download", { method })).status, 401);
    assert.equal(
      (await f.request("catalog/routines/123e4567-e89b-12d3-a456-426614174000", { method })).status,
      401,
    );
    assert.equal(f.calls.length, 0);
  }
});

test("private writes preserve the captured owner and ignore client Authorization", async () => {
  const f = fixture({ token: "server-cookie-access" });
  const response = await f.request("me/settings", {
    method: "PATCH",
    body: JSON.stringify({ weightUnit: "lb" }),
    search: "?revision=2",
    headers: {
      "X-FitSync-Owner": "rendered-owner",
      Authorization: "Bearer forged",
      "Content-Type": "application/json",
    },
  });
  assert.equal(response.status, 200);
  const [{ path, options }] = f.calls;
  assert.equal(path, "/me/settings?revision=2");
  assert.equal(options.method, "PATCH");
  assert.equal(options.headers.get("Authorization"), "Bearer server-cookie-access");
  assert.equal(options.headers.get("X-FitSync-Owner"), "rendered-owner");
  assert.equal(new TextDecoder().decode(options.body), JSON.stringify({ weightUnit: "lb" }));
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("disallowed origins, paths and oversized bodies never reach the upstream API", async () => {
  const f = fixture({ token: "access" });
  assert.equal(
    (await f.request("me", { method: "DELETE", headers: { origin: "https://other.example" } }))
      .status,
    403,
  );
  assert.equal((await f.request("auth/refresh")).status, 404);
  assert.equal((await f.request("catalog/../me")).status, 404);
  assert.equal(
    (
      await f.request("exercises/example/media", {
        method: "POST",
        body: "ignored",
        headers: { "Content-Length": String(27 * 1024 * 1024) },
      })
    ).status,
    413,
  );
  assert.equal(f.calls.length, 0);
});

test("the proxy keeps empty success responses valid and handles upstream failures", async () => {
  const f = fixture({ token: "access", result: new Response(null, { status: 204 }) });
  const response = await f.request("me", { method: "DELETE" });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  const offline = fixture({ token: "access", result: new Error("Unavailable") });
  assert.equal((await offline.request("me")).status, 503);
});
