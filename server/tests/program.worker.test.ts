import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
Object.assign(process.env, { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real", GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com", JWT_SECRET: "test-secret-".repeat(6), CLOUDINARY_CLOUD_NAME: "test", CLOUDINARY_API_KEY: "test", CLOUDINARY_API_SECRET: "test" });
const { db } = await import("../src/config/supabase.js");
const { runProgramReminders } = await import("../src/modules/program-follow/program.reminder-worker.js");
const { programDetail, resolveProgramSlot } = await import("../src/modules/program-follow/program.service.js");
const { followSchema, reminderSchema } = await import("../src/modules/program-follow/program.routes.js");

function setup(t: TestContext, options: { status?: string; consent?: boolean; auth?: boolean; enabled?: boolean; receipt?: string; ticketError?: string; networkError?: boolean; completed?: boolean } = {}) {
  const now = new Date(); const today = now.toISOString().slice(0,10);
  const enrollment = { id: "enrollment", user_id: "owner", status: options.status ?? "active", timezone: "UTC", reminder_enabled: true, reminder_hour: now.getUTCHours(), reminder_minute: now.getUTCMinutes(), start_date: today, duration_weeks: 1, weekly_plan: [{ day_number: 1, rest: false }] };
  const updates: { table: string; values: any; filters: Record<string, unknown> }[] = [];
  const queries: { table: string; filters: Record<string, unknown> }[] = [];
  let claims = 0;
  t.mock.method(db, "rpc", async (name: string) => ({ data: name === "queue_fitsync_program_reminders" ? 1 : claims++ === 0 && !options.receipt ? [{ id: "job", enrollment_id: "enrollment", device_id: "device", local_date: today }] : [], error: null }));
  t.mock.method(db, "from", (table: string) => {
    const filters: Record<string, unknown> = {}; let updating = false;
    queries.push({ table, filters });
    const result = () => ({ error: null, data: updating ? null : table === "program_enrollments" ? (filters.user_id && filters.user_id !== "owner" ? null : enrollment)
      : table === "program_push_devices" ? { id: "device", session_id: "auth", user_id: "owner", enabled: options.enabled ?? true, token: "ExpoPushToken[test]" }
      : table === "auth_sessions" ? (options.auth === false ? null : { id: "auth" })
      : table === "user_settings" ? { workout_reminders: options.consent ?? true }
      : table === "program_workout_slots" ? [{ id: "slot", template_id: "template", routine_name: "Full body", week_number: 1, day_number: 1, scheduled_date: today, workout_sessions: options.completed ? [{ id: "workout", status: "completed", finished_at: now.toISOString() }] : [] }]
      : table === "program_events" ? []
      : table === "program_reminder_jobs" ? (options.receipt ? [{ id: "receipt-job", device_id: "device", ticket_id: "ticket" }] : []) : [] });
    const builder: any = {
      select() { return builder; }, update(values: any) { updating = true; updates.push({ table, values, filters }); return builder; },
      eq(key: string, value: unknown) { filters[key] = value; return builder; },
      is(key: string, value: unknown) { filters[key] = value; return builder; },
      gt() { return builder; }, lt() { return builder; }, order() { return builder; }, limit() { return builder; },
      async maybeSingle() { return result(); }, then(resolve: any, reject: any) { return Promise.resolve(result()).then(resolve,reject); }
    }; return builder;
  });
  const pushes: any[] = [];
  t.mock.method(globalThis, "fetch", async (_url: any, init: any) => {
    const body = JSON.parse(init.body); pushes.push(body);
    if (options.networkError) throw new Error("network timeout");
    return { ok: true, json: async () => options.receipt
      ? { data: { ticket: options.receipt === "ok" ? { status: "ok" } : { status: "error", details: { error: options.receipt } } } }
      : { data: [options.ticketError ? { status: "error", details: { error: options.ticketError } } : { status: "ok", id: "ticket" }] } } as Response;
  });
  return { updates, queries, pushes };
}
test("worker records Expo acceptance and uses bundled sound plus the program deep link", async t => {
  const state = setup(t); const result = await runProgramReminders();
  assert.equal(result.attempted, 1); assert.equal(state.pushes.length, 1);
  const push = state.pushes[0][0];
  assert.equal(push.sound, "rest_complete.wav"); assert.equal(push.channelId, "program-reminders-v1");
  assert.deepEqual(push.data, { type: "program-reminder", enrollmentId: "enrollment" });
  assert.ok(state.updates.some(update => update.filters.id === "job" && update.values.status === "accepted"));
  assert.ok(!state.updates.some(update => update.values.status === "sent"));
});
test("worker rechecks consent, sign-out, program status, device, and completed workouts before sending", async t => {
  for (const options of [{ consent: false }, { auth: false }, { status: "switched" }, { enabled: false }, { completed: true }]) {
    await t.test(JSON.stringify(options), async child => {
      const state = setup(child, options); await runProgramReminders();
      assert.equal(state.pushes.length, 0);
      assert.ok(state.updates.some(update => update.filters.id === "job" && update.values.status === "cancelled"));
    });
  }
});
test("expired push tokens are disabled and ambiguous failures are not retried", async t => {
  await t.test("expired token", async child => {
    const state = setup(child, { ticketError: "DeviceNotRegistered" }); await runProgramReminders();
    assert.ok(state.updates.some(update => update.table === "program_push_devices" && update.values.enabled === false));
    assert.ok(state.updates.some(update => update.filters.id === "job" && update.values.status === "failed"));
  });
  await t.test("timeout", async child => {
    const state = setup(child, { networkError: true }); await runProgramReminders();
    assert.equal(state.pushes.length, 1);
    assert.ok(state.updates.some(update => update.filters.id === "job" && update.values.status === "failed"));
  });
});
test("receipts distinguish push-service handoff from invalid devices", async t => {
  for (const receipt of ["ok", "DeviceNotRegistered"]) await t.test(receipt, async child => {
    const state = setup(child, { receipt }); await runProgramReminders();
    assert.deepEqual(state.pushes[0], { ids: ["ticket"] });
    assert.ok(state.updates.some(update => update.filters.id === "receipt-job" && update.values.status === (receipt === "ok" ? "sent" : "failed")));
  });
});
test("program details and explicit slots are scoped to their owner", async t => {
  const state = setup(t);
  await assert.rejects(programDetail("stranger", "enrollment"), /not found/i);
  await assert.rejects(resolveProgramSlot("stranger", undefined, "slot"), /no longer following/);
  const slot = await resolveProgramSlot("owner", "template");
  assert.equal(slot?.id, "slot");
  assert.ok(state.queries.filter(query => query.table === "program_enrollments").every(query => !!query.filters.user_id));
  assert.equal(state.queries.find(query => query.table === "program_workout_slots")?.filters.enrollment_id, "enrollment");
});
test("follow and reminder inputs reject invalid dates, zones, and times", () => {
  const input = { startDate: "2026-10-26", timezone: "Asia/Kolkata", reminderEnabled: false, hour: 18, minute: 0 };
  assert.equal(followSchema.safeParse(input).success, true);
  for (const patch of [{ startDate: "2026-02-30" }, { timezone: "not/a/timezone" }, { hour: 24 }, { minute: -1 }, { expectedActiveId: "bad" }]) assert.equal(followSchema.safeParse({ ...input, ...patch }).success, false);
  assert.equal(reminderSchema.safeParse({ ...input, reminderEnabled: "true" }).success, false);
});
