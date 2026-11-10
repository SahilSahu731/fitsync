import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, Date, Intl, Math, require: name => { if (!(name in dependencies)) throw new Error(name); return dependencies[name]; } });
  return exports;
}
const model = load("../src/features/coaching/model.ts");
const day = (id, date, status = "planned") => ({ id, date, status, week: 1, day: 1 });
test("resume wins over new sessions and missed sessions stay visible", () => {
  const entries = [day("later", "2026-11-10"), day("missed", "2026-11-01", "overdue"), day("done", "2026-10-30", "completed")];
  assert.equal(model.nextSession({ sessions: entries }).id, "missed");
  assert.equal(model.nextSession({ sessions: [...entries, day("active", "2026-11-11", "active")] }).id, "active");
  assert.equal(entries[0].id, "later");
  assert.equal(model.nextSession({ sessions: [day("done", "2026-10-30", "completed")] }), null);
});
test("calendar date arithmetic preserves local days over a month boundary", () => {
  assert.equal(model.shiftDate("2026-10-31", 1), "2026-11-01");
  assert.equal(model.shiftDate("2026-12-31", 1), "2027-01-01");
});
test("exercise targets preserve duration and unknown load rather than inventing it", () => {
  const exercise = { sets: 3, repsMin: 8, repsMax: 12, weightKg: null, durationSeconds: null };
  assert.equal(model.exerciseTarget(exercise), "3 × 8–12 reps");
  assert.equal(model.exerciseTarget({ ...exercise, durationSeconds: 300, sets: 1 }), "1 × 300s");
  assert.equal(model.exerciseTarget({ ...exercise, weightKg: 20 }, "lb"), "3 × 8–12 reps · 44.1 lb");
});
test("retry IDs are valid UUIDs and independent operations receive different keys", () => {
  const ids = new Set(Array.from({ length: 500 }, () => model.mutationId()));
  assert.equal(ids.size, 500);
  for (const id of ids) assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});
test("adaptation carries revision and preview explicitly, while starting remains a real workout call", async () => {
  const calls = [];
  const { coachingApi } = load("../src/features/coaching/api.ts", { "@/src/services/api": { apiRequest: async (path, options) => { calls.push({ path, ...options }); return {}; } } });
  await coachingApi.adapt({ id: "session", revision: 3 }, "retry-id", { minutes: 15, preview: true });
  await coachingApi.start("session", "same-request");
  assert.equal(calls[0].path, "/coaching/sessions/session/adapt");
  assert.equal(calls[0].json.expectedRevision, 3);
  assert.equal(calls[0].json.preview, true);
  assert.equal(calls[1].path, "/coaching/sessions/session/start");
  assert.equal(calls[1].json.requestId, "same-request");
});

test("every coaching API request stays bound to its captured account", async () => {
  const calls = [];
  const { coachingForOwner } = load("../src/features/coaching/api.ts", { "@/src/services/api": { apiRequest: async (path, options) => { calls.push({ path, ...options }); return {}; } } });
  const api = coachingForOwner("alice");
  await api.get(); await api.create({ requestId: "create", startDate: "2026-11-07", timezone: "Asia/Kolkata" });
  await api.start("session", "start"); await api.progression({ id: "session", revision: 2 }, "progress", true); await api.review();
  for (const request of calls) assert.equal(request.expectedOwnerId, "alice");
  assert.equal(calls[3].json.preview, true);
});
