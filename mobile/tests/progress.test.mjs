import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, dependencies = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, Date, Intl, require: name => { if (!(name in dependencies)) throw Error(name); return dependencies[name]; } });
  return exports;
}
const model = load("../src/features/progress/model.ts");
const analytics = load("../src/features/progress/analytics.ts", { "./model": model });
const event = (id, metric, date, value, observedAt = "2026-11-04T12:00:00Z") => ({ id, kind: "metric", metric, date, value, observedAt, notes: "", source: "manual" });
const set = (extra = {}) => ({ id: "set", set_type: "normal", weight_kg: 60, reps: 10, duration_seconds: null, distance_meters: null, rpe: null, rir: null, completed_at: "2026-11-04T10:00:00Z", ...extra });
const workout = (id, date, sets = [set()], extra = {}) => ({ id, name: "Training", status: "completed", started_at: `${date}T09:00:00Z`, finished_at: `${date}T10:00:00Z`, elapsed_seconds: 600, workout_session_exercises: [{ id: "row", exercise_id: "bench", exercise_name: "Bench press", tracking_type: "reps_weight", position: 0, workout_logged_sets: sets }], ...extra });

test("empty progress contains no demo records, estimates, or invented percentages", () => {
  const result = analytics.buildProgress([], [], 30, "2026-11-04", 3);
  assert.equal(result.current.workouts, 0); assert.equal(result.exercises.length, 0); assert.equal(result.current.averageRpe, null); assert.equal(result.streak, 0);
  assert.equal(analytics.average([]), null); assert.equal(analytics.change(10, 0), null); assert.equal(model.latestMetrics([]).length, 0);
});
test("daily corrections, explicit zero, tombstones and duplicate uploads do not double-count", () => {
  const first = event("a", "steps", "2026-11-03", 5000);
  const revised = event("b", "steps", "2026-11-03", 6000, "2026-11-04T13:00:00Z");
  const zero = event("c", "caloriesActive", "2026-11-03", 0);
  assert.equal(model.latestMetrics(model.mergeEvents([first, revised, zero], [first])).length, 2);
  assert.equal(model.latestMetrics([revised, first])[0].value, 6000);
  assert.equal(model.latestMetrics([zero])[0].value, 0);
  assert.equal(model.latestMetrics([first, revised, event("d", "steps", "2026-11-03", null, "2026-11-04T14:00:00Z")]).length, 0);
  assert.equal(model.mergeEvents([first], [first]).length, 1);
});
test("only completed workouts and completed working sets contribute to strength workload", () => {
  const good = workout("good", "2026-11-04", [set(), set({ set_type: "warmup", weight_kg: 1000 }), set({ completed_at: null, weight_kg: 1000 })]);
  const result = analytics.buildProgress([good, workout("active", "2026-11-04", [set()], { status: "active" }), workout("discarded", "2026-11-04", [set()], { status: "discarded" }), workout("future", "2026-11-05")], [], 7, "2026-11-04", 3);
  assert.equal(result.current.workouts, 1); assert.equal(result.current.sets, 1); assert.equal(result.current.warmups, 1); assert.equal(result.current.volume, 600); assert.equal(result.current.minutes, 10);
  assert.equal(result.exercises[0].bestEstimate.e1rm, 80);
});
test("1RM accepts a single rep and rejects unsupported repetitions and tracking types", () => {
  assert.equal(analytics.estimatedMax(set({ reps: 1 }), "reps_weight"), 60);
  for (const reps of [0, 13, 1.5]) assert.equal(analytics.estimatedMax(set({ reps }), "reps_weight"), null);
  assert.equal(analytics.estimatedMax(set(), "reps"), null); assert.equal(analytics.setVolume(set(), "reps"), 0);
});
test("records and trends separate exercise identity and tracking type", () => {
  const a = workout("a", "2026-11-03"); const b = workout("b", "2026-11-04");
  b.workout_session_exercises[0].tracking_type = "reps";
  const result = analytics.buildProgress([a, b], [], 7, "2026-11-04", 2);
  assert.equal(result.exercises.length, 2); assert.equal(result.current.volume, 600); assert.equal(result.current.sets, 2);
});
test("period boundaries include exactly the selected local dates and compare equal prior windows", () => {
  const result = analytics.buildProgress([workout("today", "2026-11-04"), workout("start", "2026-10-29"), workout("previous", "2026-10-28"), workout("old", "2026-10-21")], [], 7, "2026-11-04", 1);
  assert.equal(result.start, "2026-10-29"); assert.equal(result.current.workouts, 2); assert.equal(result.previous.workouts, 1); assert.equal(result.allTime.workouts, 4);
});
test("weekly streaks survive recovery days and an incomplete current week, beyond 13 weeks", () => {
  const currentMonday = "2026-11-02";
  const history = Array.from({ length: 16 }, (_, index) => workout(`w${index}`, model.addDays(currentMonday, -(index + 1) * 7)));
  const result = analytics.buildProgress(history, [], 7, "2026-11-04", 1);
  assert.equal(result.streak, 16); assert.equal(result.weeks.at(-1).workouts, 0); assert.equal(result.calendar.length, 91);
  const missingWeek = analytics.buildProgress(history.filter(w => w.id !== "w2"), [], 7, "2026-11-04", 1);
  assert.equal(missingWeek.streak, 2);
});
test("calendar retains older real activity even when chart range is seven days", () => {
  const result = analytics.buildProgress([workout("old", "2026-10-05")], [], 7, "2026-11-04", 1);
  assert.equal(result.current.workouts, 0); assert.equal(result.calendar.find(day => day.date === "2026-10-05").workouts, 1);
});
test("workout completion uses device-local date around midnight", () => {
  const previous = process.env.TZ; process.env.TZ = "Asia/Kolkata";
  try { assert.equal(analytics.workoutDate(workout("late", "2026-11-03", [set()], { finished_at: "2026-11-03T20:00:00Z" })), "2026-11-04"); }
  finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
test("metric series preserve missing days, unit conversions and calorie separation", () => {
  const logs = [event("a", "weight", "2026-11-01", 80), event("b", "weight", "2026-11-03", 79), event("c", "caloriesIn", "2026-11-03", 2100), event("d", "caloriesActive", "2026-11-03", 400)];
  const series = analytics.metricSeries(logs, "weight", "2026-11-01", "2026-11-04");
  assert.equal(series.length, 2); assert.equal(analytics.average(series.map(row => row.value)), 79.5);
  assert.equal(model.weightKg(model.weightValue(80, "lb"), "lb"), 80);
  assert.equal(analytics.metricSeries(logs, "caloriesIn", "2026-11-01", "2026-11-04")[0].value, 2100);
  assert.equal(model.validMetric("steps", 2.5), false); assert.equal(model.validMetric("weight", 0), false);
});

function journalFixture(api) {
  const data = new Map(); const storage = { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } };
  const journal = load("../src/features/progress/journal.ts", { "@react-native-async-storage/async-storage": storage, "@/src/services/api": { apiRequest: api }, "./model": model });
  return { journal, data, storage };
}
test("local journal is account-scoped and failed uploads preserve pending entries", async () => {
  const { journal } = journalFixture(async () => { throw new Error("offline"); });
  await journal.appendEvent("alice", event("a", "steps", "2026-11-04", 500));
  assert.equal((await journal.readJournal("bob")).events.length, 0);
  await assert.rejects(journal.syncJournal("alice", () => true), /offline/);
  assert.equal((await journal.readJournal("alice")).pending.length, 1);
});
test("serialized increments preserve concurrent water taps and don't lose uploads appended during sync", async () => {
  let j; let added = false;
  const fixture = journalFixture(async (_path, options) => {
    if (options?.method === "POST") {
      if (!added) { added = true; await j.saveMetric("alice", "water", "2026-11-04", 250, "", "manual", true); }
      return { accepted: options.json.events.map(e => e.id) };
    }
    return { events: [], next: null };
  }); j = fixture.journal;
  await Promise.all([j.saveMetric("alice", "water", "2026-11-04", 250, "", "manual", true), j.saveMetric("alice", "water", "2026-11-04", 250, "", "manual", true)]);
  assert.equal(model.latestMetrics((await j.readJournal("alice")).events)[0].value, 500);
  await j.syncJournal("alice", () => true);
  const saved = await j.readJournal("alice");
  assert.equal(saved.pending.length, 1); assert.equal(model.latestMetrics(saved.events)[0].value, 750);
});
test("workout pagination loads complete history and failures preserve last successful cache", async () => {
  let calls = 0;
  const { journal } = journalFixture(async () => ++calls === 1 ? { workouts: [workout("a", "2026-11-03")], next: { before: "2026-11-03T10:00:00Z", beforeId: "a" } } : { workouts: [workout("b", "2026-11-02")], next: null });
  const saved = await journal.syncWorkouts("alice", () => true);
  assert.equal(saved.workouts.length, 2); assert.ok(saved.workoutsUpdatedAt);
  await assert.rejects(journal.syncWorkouts("alice", () => false), /Account changed/);
  assert.equal((await journal.readJournal("alice")).workouts.length, 2);
});
test("corrupt storage and failed disk writes never silently replace saved progress", async () => {
  const { journal, data, storage } = journalFixture(async () => ({ events: [], next: null }));
  data.set("fitsync.progress.v1.alice", "broken");
  await assert.rejects(journal.readJournal("alice")); assert.equal(data.get("fitsync.progress.v1.alice"), "broken");
  storage.setItem = async () => { throw new Error("disk full"); };
  await assert.rejects(journal.appendEvent("bob", event("a", "steps", "2026-11-04", 100)), /disk full/);
  assert.equal((await journal.readJournal("bob")).events.length, 0);
});

test("every health metric has exactly one category and matching range validation", () => {
  const listed = Object.values(model.METRIC_GROUPS).flatMap(group => [...group.metrics]);
  assert.equal(listed.length, Object.keys(model.METRICS).length);
  assert.equal(new Set(listed).size, listed.length);
  for (const [metric, spec] of Object.entries(model.METRICS)) {
    assert.ok(listed.includes(metric), metric);
    assert.ok(model.validMetric(metric, spec.min), `${metric} lower bound`);
    assert.ok(model.validMetric(metric, spec.max), `${metric} upper bound`);
    assert.equal(model.validMetric(metric, spec.min - 1), false, metric);
    assert.equal(model.validMetric(metric, spec.max + 1), false, metric);
    assert.equal(model.validMetric(metric, NaN), false, metric);
    assert.ok(model.validMetric(metric, null), `${metric} cleared`);
    if (spec.integer) assert.equal(model.validMetric(metric, spec.min + 0.5), false, metric);
  }
});

test("personal ratings and body readings never become misleading period totals", () => {
  for (const metric of [...model.METRIC_GROUPS.body.metrics, "hrv", "restingHeartRate", ...Object.keys(model.RATING_LABELS)]) assert.equal(model.isTotalMetric(metric), false, metric);
  for (const metric of ["steps", "distance", "activeMinutes", "caloriesIn", "protein", "water", "sleep"]) assert.equal(model.isTotalMetric(metric), true, metric);
});

test("older goals retain chosen targets while new optional targets remain unset", () => {
  const old = { steps: 8000, caloriesIn: null, caloriesActive: null, weight: null, water: 2000, sleep: 8, weeklyWorkouts: 4 };
  const goals = model.currentGoals([{ id: "goals", observedAt: "2026-11-04T10:00:00Z", kind: "goals", goals: old }]);
  assert.equal(goals.steps, 8000); assert.equal(goals.weeklyWorkouts, 4);
  for (const metric of ["protein", "carbs", "fat", "activeMinutes"]) assert.equal(goals[metric], null);
});

test("the current week is identified correctly with more than thirteen weeks of history", () => {
  const result = analytics.buildProgress([workout("old", "2026-02-02")], [], 30, "2026-11-04", 3);
  assert.equal(result.weeks.filter(week => week.current).length, 1);
  assert.equal(result.weeks.at(-1).current, true);
});
