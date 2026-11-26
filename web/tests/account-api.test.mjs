import test from "node:test";
import assert from "node:assert/strict";
import { loadTypeScript } from "./load-typescript.mjs";

test("editor requests keep their captured owner through refresh and preserve caller headers", async () => {
  const calls = [];
  let switched = false;
  const { apiForAccount } = loadTypeScript(
    "../src/lib/api.ts",
    {},
    {
      navigator: {},
      fetch: async (path, options) => {
        calls.push({ path, options });
        if (path === "/api/auth/refresh") {
          switched = true;
          return Response.json({});
        }
        return Response.json(
          { message: switched ? "The signed-in account changed." : "Expired" },
          {
            status: switched ? 409 : 401,
          },
        );
      },
    },
  );
  const oldEditor = apiForAccount("account-a");
  await assert.rejects(
    oldEditor("/me", {
      method: "DELETE",
      headers: new Headers({
        "X-FitSync-Owner": "caller-cannot-change-owner",
        "X-Request-ID": "request-123",
      }),
      json: { confirmation: "DELETE" },
    }),
    (error) => error.status === 409,
  );
  const edits = calls.filter(({ path }) => path === "/api/backend/me");
  assert.equal(edits.length, 3);
  for (const { options } of edits) {
    assert.equal(options.headers.get("X-FitSync-Owner"), "account-a");
    assert.equal(options.headers.get("X-Request-ID"), "request-123");
    assert.equal(options.method, "DELETE");
  }
});

test("signed-out editors cannot send requests", async () => {
  let requests = 0;
  const { apiForAccount } = loadTypeScript(
    "../src/lib/api.ts",
    {},
    {
      fetch: async () => {
        requests++;
        return Response.json({});
      },
    },
  );
  await assert.rejects(
    apiForAccount(undefined)("/me", { method: "DELETE" }),
    (error) => error.status === 401,
  );
  assert.equal(requests, 0);
});

test("an unreadable success response never reaches the catalog as a list of programs", async () => {
  const { api } = loadTypeScript(
    "../src/lib/api.ts",
    {},
    {
      fetch: async () => new Response("<html>Service restarting</html>"),
    },
  );
  await assert.rejects(
    api("/catalog/admin/programs"),
    (error) => error.status === 502 && /read the server response/.test(error.message),
  );
});
