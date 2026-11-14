import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
Object.assign(process.env, {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
  GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com",
  JWT_SECRET: "test-secret-".repeat(6),
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test",
});
const { db } = await import("../src/config/supabase.js");
const { saveRecordSchema, shareSchema, reportSchema } =
  await import("../src/modules/companion/companion.schema.js");
const { saveRecord, deleteRecord, sharedPlan, readShare, createShare, exerciseUsage } =
  await import("../src/modules/companion/companion.service.js");
const { buildMonthlyReport } = await import("../src/modules/companion/companion.reports.js");
const { sanitizePhoto, deletePhoto } = await import("../src/modules/companion/companion.photos.js");
const owner = "00000000-0000-4000-8000-000000000001";

test("companion schemas reject invalid check-ins, hidden fields, duplicate choices and reversed experiments", () => {
  assert.equal(
    saveRecordSchema.safeParse({
      kind: "readiness",
      date: "2026-11-14",
      expectedRevision: 0,
      data: { energy: 3, soreness: [{ muscle: "chest", level: 2 }] },
    }).success,
    true,
  );
  for (const data of [
    { energy: 6 },
    {},
    { pro: true },
    {
      soreness: [
        { muscle: "chest", level: 1 },
        { muscle: "chest", level: 2 },
      ],
    },
  ])
    assert.equal(
      saveRecordSchema.safeParse({
        kind: "readiness",
        date: "2026-11-14",
        expectedRevision: 0,
        data,
      }).success,
      false,
    );
  assert.equal(
    saveRecordSchema.safeParse({
      kind: "goal",
      expectedRevision: 0,
      data: { type: "strength", title: "Press", target: 100, unit: "kg" },
    }).success,
    false,
  );
  assert.equal(
    saveRecordSchema.safeParse({
      kind: "experiment",
      expectedRevision: 0,
      data: {
        title: "Rest",
        hypothesis: "Longer rests",
        startDate: "2026-11-14",
        endDate: "2026-11-13",
        metric: "strength",
      },
    }).success,
    false,
  );
  assert.equal(
    shareSchema.safeParse({ label: "Coach", fields: ["workouts", "photos"], expiresInDays: 7 })
      .success,
    false,
  );
  assert.equal(
    shareSchema.safeParse({ label: "Coach", fields: ["plan", "plan"], expiresInDays: 7 }).success,
    false,
  );
  assert.equal(reportSchema.safeParse({ month: "2026-13", timezone: "UTC" }).success, false);
  assert.equal(
    reportSchema.safeParse({ month: "2026-11", timezone: "Unknown/City" }).success,
    false,
  );
});
test("record writes and deletes use authenticated ownership and revision through atomic RPC", async (t) => {
  const calls: any[] = [];
  t.mock.method(db, "rpc", async (name: string, args: any) => {
    calls.push({ name, args });
    return {
      data: {
        id: args.p_id,
        kind: args.p_kind,
        data: args.p_data,
        date: args.p_date,
        revision: 4,
        updated_at: "2026-11-14T10:00:00Z",
      },
      error: null,
    };
  });
  await saveRecord(owner, "readiness_2026-11-14", {
    kind: "readiness",
    date: "2026-11-14",
    expectedRevision: 3,
    data: { energy: 3 },
  });
  await deleteRecord(owner, "readiness_2026-11-14", 4);
  assert.ok(
    calls.every(
      (call) => call.name === "save_fitsync_companion_record" && call.args.p_user_id === owner,
    ),
  );
  assert.equal(calls[0].args.p_expected_revision, 3);
  assert.equal(calls[1].args.p_expected_revision, 4);
  assert.equal(calls[1].args.p_delete, true);
});
test("record revision conflicts become refreshable 409 errors", async (t) => {
  t.mock.method(db, "rpc", async () => ({
    data: null,
    error: { code: "40001", message: "changed" },
  }));
  await assert.rejects(
    saveRecord(owner, "checkin", {
      kind: "readiness",
      date: "2026-11-14",
      expectedRevision: 1,
      data: { energy: 3 },
    }),
    { status: 409 },
  );
});
test("the active muscle-focus record can only be created through the validated plan preview flow", async (t) => {
  const rpc = t.mock.method(db, "rpc", () => {
    throw new Error("Generic writes cannot override the focus plan");
  });
  await assert.rejects(
    saveRecord(owner, "focus_active", {
      kind: "readiness",
      date: "2026-11-14",
      expectedRevision: 0,
      data: { energy: 3 },
    }),
    { status: 400, message: "Use the muscle-focus preview to save this block." },
  );
  assert.equal(rpc.mock.callCount(), 0);
});
test("exercise replacement history is owner-scoped, paginated and strips all unrelated command fields", async (t) => {
  const scopes: [string, unknown][] = [];
  let pages = 0;
  t.mock.method(db, "from", (table: string) => {
    assert.equal(table, "coaching_commands");
    const query: any = {
      select(columns: string) {
        assert.equal(columns, "request_id,request_data,created_at");
        return query;
      },
      eq(key: string, value: unknown) {
        scopes.push([key, value]);
        return query;
      },
      not() {
        return query;
      },
      order() {
        return query;
      },
      range(start: number) {
        pages++;
        assert.equal(start, (pages - 1) * 500);
        return Promise.resolve({
          data:
            pages === 1
              ? Array.from({ length: 500 }, (_, index) => ({
                  request_id: `request-${index}`,
                  created_at: "2026-11-14T10:00:00Z",
                  request_data: { swapExerciseId: owner, notes: "secret" },
                }))
              : [
                  {
                    request_id: "invalid",
                    created_at: "2026-11-14T10:00:00Z",
                    request_data: { swapExerciseId: "invalid" },
                  },
                ],
          error: null,
        });
      },
    };
    return query;
  });
  const result = await exerciseUsage(owner);
  assert.equal(pages, 2);
  assert.equal(result.replacements.length, 500);
  assert.deepEqual(Object.keys(result.replacements[0]).sort(), ["date", "exerciseId", "requestId"]);
  assert.ok(scopes.some(([key, value]) => key === "user_id" && value === owner));
  assert.ok(scopes.some(([key, value]) => key === "action" && value === "adapt"));
  assert.doesNotMatch(JSON.stringify(result), /secret|notes/);
});
test("private photos strip metadata, crop before resizing and reject animated/invalid images", async () => {
  const source = await sharp({ create: { width: 100, height: 80, channels: 3, background: "red" } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const clean = await sanitizePhoto(source, { left: 0, top: 0, width: 30, height: 40 });
  const metadata = await sharp(clean.data).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 30);
  assert.equal(metadata.height, 40);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.orientation, undefined);
  await assert.rejects(sanitizePhoto(source, { left: 1000, top: 0, width: 10, height: 10 }), {
    status: 400,
  });
  await assert.rejects(sanitizePhoto(Buffer.from("not an image")), { status: 400 });
  const gif = await sharp({ create: { width: 4, height: 4, channels: 3, background: "blue" } })
    .gif()
    .toBuffer();
  await assert.rejects(sanitizePhoto(gif), { status: 400 });
});
test("deleting a foreign photo never touches storage", async (t) => {
  const scopes: any[] = [];
  t.mock.method(db, "from", () => {
    const query: any = {
      select() {
        return query;
      },
      eq(key: string, value: unknown) {
        scopes.push([key, value]);
        return query;
      },
      maybeSingle: async () => ({ data: null, error: null }),
    };
    return query;
  });
  const storage = t.mock.method(db.storage, "from", () => {
    throw new Error("No owned photo exists");
  });
  assert.deepEqual(await deletePhoto(owner, "00000000-0000-4000-8000-000000000099"), {
    deleted: true,
  });
  assert.ok(scopes.some(([key, value]) => key === "user_id" && value === owner));
  assert.equal(storage.mock.callCount(), 0);
});
test("share creation stores only a hash; raw tokens appear only in the creation response", async (t) => {
  let stored: any;
  t.mock.method(db, "from", () => {
    const query: any = {
      insert(value: any) {
        stored = value;
        return query;
      },
      select() {
        return query;
      },
      single: async () => ({ data: { id: "share", ...stored }, error: null }),
    };
    return query;
  });
  const result = await createShare(owner, { label: "Coach", fields: ["plan"], expiresInDays: 7 });
  assert.equal(result.token.length, 43);
  assert.equal(stored.token_hash.length, 64);
  assert.notEqual(stored.token_hash, result.token);
  assert.equal(stored.token, undefined);
  assert.equal((result.share as any).token_hash, undefined);
});
test("unavailable share tokens return no account or health data", async (t) => {
  const calls: string[] = [];
  t.mock.method(db, "from", (table: string) => {
    calls.push(table);
    const query: any = {
      select() {
        return query;
      },
      eq() {
        return query;
      },
      is() {
        return query;
      },
      gt() {
        return query;
      },
      maybeSingle: async () => ({ data: null, error: null }),
    };
    return query;
  });
  await assert.rejects(readShare("x".repeat(43)), { status: 404 });
  assert.deepEqual(calls, ["companion_shares"]);
});
test("shared plans serialize only the consent allowlist, excluding health profile and arbitrary notes", () => {
  const result = sharedPlan({
    name: "Plan",
    weight: 80,
    explanation: ["secret"],
    sessions: [
      {
        date: "2026-11-14",
        name: "Day",
        status: "planned",
        secret: "hidden",
        prescription: {
          exercises: [
            {
              exerciseId: "press",
              name: "Press",
              sets: 3,
              repsMin: 8,
              repsMax: 12,
              reason: "private note",
            },
          ],
        },
      },
    ],
  });
  const text = JSON.stringify(result);
  assert.doesNotMatch(text, /secret|private note|weight.*80/);
  assert.match(text, /repsMin/);
});
test("monthly reports use local calendar days, exclude warmup/assistance volume, collapse corrections and deletions", () => {
  const set = (id: string, type: string, weight: number, reps: number) => ({
    id,
    set_type: type,
    weight_kg: weight,
    reps,
    completed_at: "2026-10-31T20:00:00Z",
    rpe: null,
  });
  const workouts = [
    {
      id: "one",
      name: "Workout",
      status: "completed",
      finished_at: "2026-10-31T20:00:00Z",
      elapsed_seconds: 90,
      workout_session_exercises: [
        {
          exercise_id: "press",
          exercise_name: "Press",
          tracking_type: "reps_weight",
          workout_logged_sets: [set("a", "normal", 20, 10), set("b", "warmup", 10, 10)],
        },
        {
          exercise_id: "pull",
          exercise_name: "Assisted pull",
          tracking_type: "reps_assisted",
          workout_logged_sets: [set("c", "normal", 30, 5)],
        },
      ],
    },
  ];
  const event = (id: string, observed: string, value: number | null) => ({
    id,
    observed_at: observed,
    payload: { kind: "metric", date: "2026-11-01", metric: "weight", value, source: "manual" },
  });
  const report = buildMonthlyReport(
    "2026-11",
    "Asia/Kolkata",
    [...workouts, ...workouts],
    [event("a", "2026-11-01T10:00:00Z", 80), event("b", "2026-11-02T10:00:00Z", null)],
    new Date("2026-11-14T10:00:00Z"),
  );
  assert.equal(report.summary.workouts, 1);
  assert.equal(report.summary.workingSets, 2);
  assert.equal(report.summary.warmupSets, 1);
  assert.equal(report.summary.volumeKg, 200);
  assert.equal(report.summary.averageRpe, null);
  assert.deepEqual(report.measurements, []);
  assert.equal(
    buildMonthlyReport("2026-11", "UTC", workouts, [], new Date("2026-11-14T10:00:00Z")).summary
      .workouts,
    0,
  );
  assert.match(report.text, /not verified all-time personal records/);
});
