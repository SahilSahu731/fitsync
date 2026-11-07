import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
Object.assign(process.env, { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real", GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com", JWT_SECRET: "test-secret-".repeat(6), CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test", REVENUECAT_SECRET_API_KEY: "" });
const { db } = await import("../src/config/supabase.js");
const { default: routes } = await import("../src/modules/wellness/wellness.routes.js");
const { errorHandler } = await import("../src/middleware/error-handler.js");
const owner = "00000000-0000-4000-8000-000000000001", sid = "00000000-0000-4000-8000-000000000002", peer = "00000000-0000-4000-8000-000000000003", connection = "00000000-0000-4000-8000-000000000004", outsider = "00000000-0000-4000-8000-000000000099", week = "2026-11-02";
const token = jwt.sign({ sid }, process.env.JWT_SECRET!, { subject: owner, issuer: "fitsync-api", audience: "fitsync-mobile", expiresIn: "10m", algorithm: "HS256" });
let server: Server; let base: string;
before(async () => {
  const app = express(); app.use(express.json()); app.use("/api/wellness", routes); app.use(errorHandler);
  server = await new Promise<Server>((resolve, reject) => { const instance = app.listen(0, "127.0.0.1", (error?: Error) => error ? reject(error) : resolve(instance)); instance.once("error", reject); });
  const address = server.address(); assert.ok(address && typeof address !== "string"); base = `http://127.0.0.1:${address.port}/api/wellness`;
});
after(async () => { if (server?.listening) { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); } });
type Query = { table: string; columns: string; action: string; payload?: any; filters: { op: string; key: string; value: unknown }[] };
function database(t: test.TestContext, resolve?: (query: Query) => { data: any; error: any } | undefined) {
  const queries: Query[] = [];
  t.mock.method(db, "from", (table: string) => {
    const query: Query = { table, columns: "", action: "select", filters: [] }; queries.push(query);
    const result = () => resolve?.(query) ?? { data: table === "auth_sessions" ? { id: sid } : null, error: null };
    const filter = (op: string, key: string, value: unknown) => { query.filters.push({ op, key, value }); return builder; };
    const builder: any = {
      select(columns: string) { query.columns = columns; return builder; }, eq(key: string, value: unknown) { return filter("eq", key, value); },
      is(key: string, value: unknown) { return filter("is", key, value); }, gt(key: string, value: unknown) { return filter("gt", key, value); },
      not(key: string, op: string, value: unknown) { return filter(`not:${op}`, key, value); }, or(expression: string) { return filter("or", "", expression); },
      upsert(payload: unknown) { query.action = "upsert"; query.payload = payload; return builder; }, update(payload: unknown) { query.action = "update"; query.payload = payload; return builder; },
      delete() { query.action = "delete"; return builder; }, maybeSingle: async () => result(), then(onFulfilled: any, onRejected: any) { return Promise.resolve(result()).then(onFulfilled, onRejected); },
    }; return builder;
  }); return queries;
}
async function request(path: string, options: { method?: string; body?: unknown; authorization?: string | null; expectedOwner?: string } = {}) {
  return fetch(`${base}${path}`, { method: options.method ?? "GET", headers: { "Content-Type": "application/json", ...(options.authorization === null ? {} : { Authorization: options.authorization ?? `Bearer ${token}` }), ...(options.expectedOwner ? { "X-FitSync-Owner": options.expectedOwner } : {}) }, ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }) });
}
const writes = (queries: Query[]) => queries.filter(query => query.action !== "select");

test("wellness HTTP rejects anonymous and invalid tokens before any database read or mutation", async t => {
  const from = t.mock.method(db, "from", () => { throw new Error("Authentication must reject first"); });
  const rpc = t.mock.method(db, "rpc", () => { throw new Error("No anonymous RPC"); });
  assert.equal((await request("/recipes", { authorization: null })).status, 401);
  assert.equal((await request("/partner/invite", { method: "POST", body: {}, authorization: "Bearer invalid" })).status, 401);
  assert.equal(from.mock.callCount(), 0); assert.equal(rpc.mock.callCount(), 0);
});
test("revoked sessions fail before any wellness query", async t => {
  const queries = database(t, query => query.table === "auth_sessions" ? { data: null, error: null } : undefined);
  assert.equal((await request(`/state?week=${week}`)).status, 401); assert.ok(queries.every(query => query.table === "auth_sessions"));
});
test("expected-owner headers accept the token account and block stale-account writes", async t => {
  const queries = database(t);
  assert.equal((await request(`/state?week=${week}`, { expectedOwner: owner })).status, 200);
  const before = queries.length;
  const response = await request("/preferences", { method: "PUT", expectedOwner: outsider, body: { diet: "vegan" } });
  assert.equal(response.status, 409); assert.match((await response.json()).message, /account changed/);
  assert.ok(queries.slice(before).every(query => query.table === "auth_sessions")); assert.equal(writes(queries).length, 0);
});
test("free recipes, state, preferences and commitments use the verified owner and selected week", async t => {
  const queries = database(t);
  const recipes = await request("/recipes"); assert.equal(recipes.status, 200);
  assert.ok((await recipes.json()).recipes.some((recipe: any) => recipe.id === "banana-oats"));
  const state = await request(`/state?week=${week}&userId=${outsider}`); assert.equal(state.status, 200); assert.equal((await state.json()).plan, null);
  const preferences = await request("/preferences", { method: "PUT", body: { diet: "vegan", exclude: ["soy"], servings: 2, maxPrepMinutes: 20, favoriteIds: ["banana-oats"] } });
  assert.equal(preferences.status, 200); assert.equal((await preferences.json()).diet, "vegan");
  assert.equal((await request("/commitment", { method: "PUT", body: { week, target: 3, habit: "walk", reflection: "Private reflection" } })).status, 200);
  assert.equal(writes(queries).length, 2); for (const query of writes(queries)) assert.equal(query.payload.user_id, owner);
  for (const query of queries.filter(query => query.table.startsWith("wellness_") && query.action === "select")) assert.ok(query.filters.some(filter => filter.key === "user_id" && filter.value === owner));
  for (const query of queries.filter(query => ["wellness_meal_plans", "wellness_commitments"].includes(query.table) && query.action === "select")) assert.ok(query.filters.some(filter => filter.key === "week" && filter.value === week));
});
test("Pro meal generation and swap fail closed without configured billing despite forged Pro claims", async t => {
  const queries = database(t); const rpc = t.mock.method(db, "rpc", () => { throw new Error("No paid mutation"); });
  for (const [path, method, body] of [["/meal-plan", "POST", { week, pro: true, tier: "pro" }], ["/meal-plan/swap", "PATCH", { week, date: week, slot: "breakfast", recipeId: "banana-oats", pro: true }]] as const) {
    const response = await request(path, { method, body }); assert.equal(response.status, 503); assert.match((await response.json()).message, /not configured/);
  }
  assert.ok(queries.every(query => query.table === "auth_sessions")); assert.equal(rpc.mock.callCount(), 0);
});
test("strict validation rejects account injection, invalid weeks, unknown meals and excessive targets before writes", async t => {
  const queries = database(t); const rpc = t.mock.method(db, "rpc", async () => ({ data: null, error: null }));
  for (const [path, method, body] of [
    ["/preferences", "PUT", { userId: outsider, diet: "vegan" }], ["/preferences", "PUT", { favoriteIds: ["unknown-recipe"] }], ["/preferences", "PUT", { servings: 7 }],
    ["/commitment", "PUT", { week: "2026-11-03", target: 3, habit: "walk" }], ["/commitment", "PUT", { week, target: 8, habit: "walk" }],
    ["/commitment", "PUT", { week, target: 3, habit: "train", completed_dates: [week], userId: outsider }], ["/partner/join", "POST", { code: "a".repeat(24), userId: outsider }],
  ] as const) assert.equal((await request(path, { method, body })).status, 400);
  assert.equal((await request("/state?week=2026-11-03")).status, 400); assert.equal(writes(queries).length, 0); assert.equal(rpc.mock.callCount(), 0);
});
test("self-reported check-ins bind the RPC to the token owner and reject future or out-of-week dates", async t => {
  database(t); const rpc = t.mock.method(db, "rpc", async (name: string, args: any) => {
    assert.equal(name, "fitsync_commitment_checkin"); assert.equal(args.p_user, owner); assert.equal(args.p_week, week); assert.equal(args.p_date, "2026-11-07"); assert.equal(args.p_completed, true); return { data: null, error: null };
  });
  assert.equal((await request("/commitment/check-in?today=2026-11-07", { method: "PATCH", body: { week, date: "2026-11-07", completed: true } })).status, 200);
  for (const date of ["2026-11-08", "2026-11-01"]) assert.equal((await request("/commitment/check-in?today=2026-11-07", { method: "PATCH", body: { week, date, completed: true } })).status, 400);
  assert.equal(rpc.mock.callCount(), 1);
});
test("linked partners use display_name and expose only target, habit and completed-day count", async t => {
  const queries = database(t, query => {
    if (query.table === "accountability_partners") return { data: [{ id: connection, owner_id: owner, partner_id: peer }], error: null };
    if (query.table === "app_users") return { data: { display_name: "Chosen partner", name: "Wrong column", email: "private@example.test", bio: "private" }, error: null };
    if (query.table === "wellness_commitments") return { data: { target: 4, habit: "walk", completed_dates: ["2026-11-02", "2026-11-04"], reflection: "never share", calories: 2000 }, error: null };
  });
  const response = await request(`/partners?week=${week}&userId=${outsider}`); assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { partners: [{ id: connection, name: "Chosen partner", commitment: { target: 4, habit: "walk", completed: 2 } }] });
  const person = queries.find(query => query.table === "app_users")!; assert.equal(person.columns, "display_name"); assert.ok(person.filters.some(filter => filter.key === "id" && filter.value === peer));
  assert.ok(queries.find(query => query.table === "accountability_partners")!.filters.some(filter => filter.op === "or" && filter.value === `owner_id.eq.${owner},partner_id.eq.${owner}`));
});
test("unconnected accounts cannot select arbitrary users' progress through query parameters", async t => {
  const queries = database(t, query => query.table === "accountability_partners" ? { data: [], error: null } : undefined);
  const response = await request(`/partners?week=${week}&userId=${outsider}`); assert.equal(response.status, 200); assert.deepEqual(await response.json(), { partners: [] });
  assert.ok(!queries.some(query => query.table === "app_users" || query.table === "wellness_commitments"));
});
test("private invite RPC stores only a hash and join always uses the verified account", async t => {
  database(t); const rpc = t.mock.method(db, "rpc", async (name: string, args: any) => {
    assert.equal(args.p_user, owner); assert.match(args.p_hash, /^[a-f0-9]{64}$/);
    if (name === "fitsync_create_invite") { assert.ok(Date.parse(args.p_expires) > Date.now()); return { data: connection, error: null }; }
    assert.equal(name, "fitsync_join_partner"); return { data: connection, error: null };
  });
  const invited = await request("/partner/invite", { method: "POST", body: {} }); assert.equal(invited.status, 201);
  const invitation = await invited.json(); assert.match(invitation.code, /^[A-Za-z0-9_-]{24}$/); assert.ok(Date.parse(invitation.expiresAt) > Date.now());
  assert.equal((rpc.mock.calls[0]!.arguments[1] as any).p_hash, createHash("sha256").update(invitation.code).digest("hex"));
  const joined = await request("/partner/join", { method: "POST", body: { code: invitation.code } }); assert.equal(joined.status, 200); assert.deepEqual(await joined.json(), { id: connection }); assert.equal(rpc.mock.callCount(), 2);
});
test("disconnect requests with foreign IDs retain both connection-ID and account predicates", async t => {
  const queries = database(t); assert.equal((await request(`/partner/${outsider}`, { method: "DELETE" })).status, 200);
  const deletion = queries.find(query => query.action === "delete")!; assert.equal(deletion.table, "accountability_partners");
  assert.ok(deletion.filters.some(filter => filter.key === "id" && filter.value === outsider)); assert.ok(deletion.filters.some(filter => filter.op === "or" && filter.value === `owner_id.eq.${owner},partner_id.eq.${owner}`));
});
