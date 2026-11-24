import test from "node:test";
import assert from "node:assert/strict";
import { loadTypeScript } from "./load-typescript.mjs";

const requestBody = loadTypeScript("../src/lib/request-body.ts");
function fixture({ access = "old-access", refresh = "refresh-token", responses = [] } = {}) {
  const calls = [];
  let cleared = 0;
  const nextResponse = { json: (value, init) => Response.json(value, init) };
  const { POST } = loadTypeScript("../src/app/api/auth/[action]/route.ts", {
    "next/headers": {
      cookies: async () => ({ get: () => (refresh ? { value: refresh } : undefined) }),
    },
    "next/server": { NextResponse: nextResponse },
    "@/lib/request-body": requestBody,
    "@/lib/server-api": {
      accessToken: async () => access,
      refreshCookie: "fitsync_refresh",
      clearTokens: () => {
        cleared++;
      },
      setTokens: () => {},
      validOrigin: (request) => request.headers.get("origin") === "http://localhost",
      unavailable: () => Response.json({ message: "Unavailable" }, { status: 503 }),
      upstream: async (path, options) => {
        calls.push({ path, options });
        const response = responses.shift();
        if (response instanceof Error) throw response;
        assert.ok(response, `Unexpected upstream call: ${path}`);
        return response;
      },
    },
  });
  return {
    calls,
    get cleared() {
      return cleared;
    },
    post(action, body = "", headers = {}) {
      return POST(
        new Request(`http://localhost/api/auth/${action}`, {
          method: "POST",
          headers: { origin: "http://localhost", ...headers },
          body,
        }),
        { params: Promise.resolve({ action }) },
      );
    },
  };
}

test("logout revokes the rotated session when its existing access token expired", async () => {
  const f = fixture({
    responses: [
      Response.json({}, { status: 401 }),
      Response.json({ accessToken: "fresh-access", refreshToken: "fresh-refresh" }),
      Response.json({}),
    ],
  });
  const response = await f.post("logout");
  assert.equal(response.status, 200);
  assert.equal(f.cleared, 1);
  assert.deepEqual(
    f.calls.map(({ path }) => path),
    ["/auth/logout", "/auth/refresh", "/auth/logout"],
  );
  assert.equal(f.calls[2].options.headers.Authorization, "Bearer fresh-access");
});

test("logout clears browser cookies when revocation cannot reach the server", async () => {
  const f = fixture({ responses: [new Error("offline")] });
  assert.equal((await f.post("logout")).status, 200);
  assert.equal(f.cleared, 1);
});

test("valid access logout does not rotate the refresh token unnecessarily", async () => {
  const f = fixture({ responses: [Response.json({})] });
  await f.post("logout");
  assert.equal(f.calls.length, 1);
  assert.equal(f.cleared, 1);
});

test("invalid, oversized and cross-origin Google credentials never reach the API", async () => {
  for (const body of [
    "not-json",
    JSON.stringify({ idToken: 123 }),
    JSON.stringify({ idToken: "short" }),
  ]) {
    const f = fixture();
    assert.equal((await f.post("google", body)).status, 400);
    assert.equal(f.calls.length, 0);
  }
  const f = fixture();
  assert.equal((await f.post("google", "x", { "content-length": "50000" })).status, 413);
  assert.equal((await f.post("google", "", { origin: "https://other.example" })).status, 403);
  assert.equal(f.calls.length, 0);
});
