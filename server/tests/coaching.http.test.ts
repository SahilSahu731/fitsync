import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
Object.assign(process.env, { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real", GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com", JWT_SECRET: "test-secret-".repeat(6), CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test", REVENUECAT_SECRET_API_KEY: "" });
const { db } = await import("../src/config/supabase.js");
const { default: routes } = await import("../src/modules/coaching/coaching.routes.js");
const { errorHandler } = await import("../src/middleware/error-handler.js");
const owner = "00000000-0000-4000-8000-000000000001";
const sid = "00000000-0000-4000-8000-000000000002";
const requestId = "00000000-0000-4000-8000-000000000003";
const token = jwt.sign({ sid }, process.env.JWT_SECRET!, { subject: owner, issuer: "fitsync-api", audience: "fitsync-mobile", expiresIn: "10m", algorithm: "HS256" });
let server: Server; let base: string;
before(async () => {
  const app = express(); app.use(express.json()); app.use("/api/coaching", routes); app.use(errorHandler);
  server = await new Promise<Server>((resolve, reject) => { const instance = app.listen(0, "127.0.0.1", (error?: Error) => error ? reject(error) : resolve(instance)); instance.once("error", reject); });
  const address = server.address(); assert.ok(address && typeof address !== "string"); base = `http://127.0.0.1:${address.port}/api/coaching`;
});
after(async () => { if (server?.listening) { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); } });
function authDatabase(t: test.TestContext) {
  const scopes: { table: string; key: string; value: unknown }[] = [];
  t.mock.method(db, "from", (table: string) => {
    const result = { data: table === "auth_sessions" ? { id: sid } : null, error: null };
    const builder: any = { select() { return builder; }, eq(key: string, value: unknown) { scopes.push({ table, key, value }); return builder; }, is() { return builder; }, gt() { return builder; }, maybeSingle: async () => result, then(resolve: any, reject: any) { return Promise.resolve(result).then(resolve, reject); } };
    return builder;
  }); return scopes;
}
async function request(path: string, body?: unknown, authorized = true) {
  return fetch(`${base}${path}`, { method: body ? "POST" : "GET", headers: { ...(authorized ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
test("coaching HTTP rejects anonymous requests and invalid tokens before touching account data", async t => {
  const from = t.mock.method(db, "from", () => { throw new Error("Authentication should fail first"); });
  assert.equal((await request("/", undefined, false)).status, 401);
  assert.equal((await fetch(`${base}/`, { headers: { Authorization: "Bearer invalid" } })).status, 401);
  assert.equal(from.mock.callCount(), 0);
});
test("free coaching HTTP reads use the verified token's account", async t => {
  const scopes = authDatabase(t); const response = await request("/");
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { profile: null, plan: null });
  assert.ok(scopes.filter(s => s.key === "user_id").every(s => s.value === owner));
});
test("HTTP owner header accepts the signed-in account and rejects requests left over from another account", async t => {
  const scopes = authDatabase(t);
  const matching = await fetch(`${base}/`, { headers: { Authorization: `Bearer ${token}`, "X-FitSync-Owner": owner } });
  assert.equal(matching.status, 200);
  const before = scopes.length;
  const changed = await fetch(`${base}/`, { headers: { Authorization: `Bearer ${token}`, "X-FitSync-Owner": "00000000-0000-4000-8000-000000000099" } });
  assert.equal(changed.status, 409); assert.match((await changed.json()).message, /account changed/);
  assert.ok(scopes.slice(before).every(scope => scope.table === "auth_sessions"), "Old-account requests fail after session verification and before any coaching/profile read");
});
test("premium HTTP features fail closed when billing is not configured, even if the client sends pro:true", async t => {
  authDatabase(t);
  const rpc = t.mock.method(db, "rpc", () => { throw new Error("A client flag must never unlock a mutation"); });
  for (const path of ["/sessions/00000000-0000-4000-8000-000000000004/adapt", "/sessions/00000000-0000-4000-8000-000000000004/progression", "/sessions/00000000-0000-4000-8000-000000000004/reschedule"]) {
    const response = await request(path, { requestId, expectedRevision: 0, minutes: 30, pro: true });
    assert.equal(response.status, 503); assert.match((await response.json()).message, /not configured/);
  }
  assert.equal((await request("/review")).status, 503); assert.equal(rpc.mock.callCount(), 0);
});
test("free HTTP mutations reject malformed requests and cannot start another account's coaching day", async t => {
  authDatabase(t);
  assert.equal((await request("/plans", { requestId, startDate: "2026-11-07", timezone: "Asia/Kolkata", userId: owner })).status, 400);
  const rpc = t.mock.method(db, "rpc", async (_name: string, args: any) => { assert.equal(args.p_user_id, owner); return { data: null, error: { code: "P0002", message: "Session not found in your current plan." } }; });
  assert.equal((await request("/sessions/00000000-0000-4000-8000-000000000099/start", { requestId })).status, 404);
  assert.equal(rpc.mock.callCount(), 1);
});
