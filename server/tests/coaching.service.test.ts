import test from "node:test";
import assert from "node:assert/strict";
Object.assign(process.env, { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real", GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com", JWT_SECRET: "test-secret-".repeat(6), CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test" });
const { db } = await import("../src/config/supabase.js");
const service = await import("../src/modules/coaching/coaching.service.js");
type Query = { table: string; filters: Record<string, unknown>; columns?: string };
function mockQueries(t: test.TestContext, results: { data?: any; error?: any }[]) {
  const queries: Query[] = [];
  t.mock.method(db, "from", (table: string) => {
    const q: Query = { table, filters: {} }; queries.push(q); const result = results.shift(); assert.ok(result, `Unexpected query ${table}`);
    const done = () => Promise.resolve({ data: result.data ?? null, error: result.error ?? null });
    const builder: any = { select(columns: string) { q.columns = columns; return builder; }, eq(key: string, value: unknown) { q.filters[key] = value; return builder; }, gte(key: string, value: unknown) { q.filters[key] = value; return builder; }, order() { return builder; }, range() { return builder; }, limit() { return builder; }, single: done, maybeSingle: done, then(resolve: any, reject: any) { return done().then(resolve, reject); } };
    return builder;
  }); return queries;
}
const plan = { id: "owned-plan", name: "Personal plan", status: "active", start_date: "2026-11-07", timezone: "Asia/Kolkata", explanation: [], profile: { goal: "strength", experience: "beginner", trainingDays: 3, minutesPerWorkout: 30, equipment: "gym" } };
const day = { id: "owned-day", week_number: 1, day_number: 1, scheduled_date: "2026-11-07", revision: 0, name: "Full body A", prescription: { exercises: [] }, coaching_workouts: [] };
test("coaching data is scoped to the authenticated account and completion comes from actual linked logs", async t => {
  const q = mockQueries(t, [{ data: plan }, { data: [{ ...day, coaching_workouts: [{ workout_sessions: { id: "discarded", status: "discarded" } }, { workout_sessions: { id: "actual", status: "completed" } }] }] }]);
  const result = await service.getPlan("owner");
  assert.equal(q[0].filters.user_id, "owner"); assert.equal(q[1].filters.plan_id, "owned-plan");
  assert.equal(result.sessions[0].status, "completed"); assert.equal(result.sessions[0].workoutId, "actual"); assert.equal(result.status, "completed");
});
test("a foreign plan ID is unavailable before its day rows are queried", async t => {
  const q = mockQueries(t, [{ data: null }]);
  await assert.rejects(service.getPlan("owner", "foreign-plan"), (e: any) => e.status === 404);
  assert.equal(q.length, 1); assert.deepEqual(q[0].filters, { user_id: "owner", id: "foreign-plan" });
});
test("a repeated create request returns the original plan without writing another routine", async t => {
  const request = { requestId: "request", startDate: "2026-11-07", timezone: "Asia/Kolkata" };
  const q = mockQueries(t, [{ data: { action: "create", request_data: { startDate: request.startDate, timezone: request.timezone }, result_id: "owned-plan" } }, { data: plan }, { data: [day] }]);
  const rpc = t.mock.method(db, "rpc", () => { throw new Error("Should not mutate on retry"); });
  assert.equal((await service.createPlan("owner", request)).id, "owned-plan");
  assert.equal(rpc.mock.callCount(), 0); assert.equal(q[0].filters.user_id, "owner");
});
test("reusing an idempotency key for a different payload fails before a mutation", async t => {
  mockQueries(t, [{ data: { action: "reschedule", request_data: { dayId: "owned-day", date: "2026-11-08", expectedRevision: 0 }, result_id: "owned-plan" } }]);
  const rpc = t.mock.method(db, "rpc", () => { throw new Error("Should not mutate a conflicting retry"); });
  await assert.rejects(service.rescheduleDay("owner", "owned-day", { requestId: "request", expectedRevision: 0, date: "2026-11-09" }), (e: any) => e.status === 409);
  assert.equal(rpc.mock.callCount(), 0);
});
test("stale prescriptions and foreign sessions cannot be adapted", async t => {
  mockQueries(t, [{ data: null }, { data: plan }, { data: [] }, { data: [day] }]);
  const rpc = t.mock.method(db, "rpc", () => { throw new Error("Should not mutate stale state"); });
  await assert.rejects(service.adaptDay("owner", "owned-day", { requestId: "request", expectedRevision: 1, minutes: 15 }), (e: any) => e.status === 409 && /changed/.test(e.message));
  assert.equal(rpc.mock.callCount(), 0);
});
test("coaching start uses the account from authentication and hydrates the existing normal workout API shape", async t => {
  const session = { id: "workout", user_id: "owner", status: "active", workout_session_exercises: [] };
  const q = mockQueries(t, [{ data: session }, { data: session }]);
  const rpc = t.mock.method(db, "rpc", async (name: string, args: unknown) => { assert.equal(name, "start_fitsync_coaching_day"); assert.deepEqual(args, { p_user_id: "owner", p_day_id: "owned-day", p_request_id: "request" }); return { data: "workout", error: null }; });
  const result = await service.startDay("owner", "owned-day", "request");
  assert.equal(result.id, "workout"); assert.equal(rpc.mock.callCount(), 1);
  assert.ok(q.every(query => query.filters.user_id === "owner"));
});
test("missing deployment and database ownership errors remain clear API failures", () => {
  assert.throws(() => service.checked({ code: "PGRST202", message: "RPC missing" }, "test"), (e: any) => e.status === 503 && /migration/.test(e.message));
  assert.throws(() => service.checked({ code: "P0002", message: "Session not found." }, "test"), (e: any) => e.status === 404);
  assert.throws(() => service.checked({ code: "40001", message: "Plan changed" }, "test"), (e: any) => e.status === 409);
});
