import test from "node:test";
import assert from "node:assert/strict";
import { eventSchema, batchSchema, goalsSchema } from "../src/modules/progress/progress.schema.js";
const event = {
  id: "progress-event-0000000001",
  observedAt: "2026-11-04T10:00:00Z",
  kind: "metric",
  metric: "steps",
  date: "2026-11-04",
  value: 8000,
  source: "manual",
  notes: "",
};
const goals = {
  steps: null,
  caloriesIn: null,
  caloriesActive: null,
  weight: null,
  water: null,
  sleep: null,
  weeklyWorkouts: 3,
};
test("health journal validates real dates, finite ranges, sources and corrections", () => {
  assert.ok(eventSchema.safeParse(event).success);
  assert.ok(eventSchema.safeParse({ ...event, value: null }).success);
  assert.ok(eventSchema.safeParse({ ...event, value: 0 }).success);
  for (const value of [-1, 1.5, Infinity, 200001])
    assert.equal(eventSchema.safeParse({ ...event, value }).success, false);
  assert.equal(eventSchema.safeParse({ ...event, date: "2026-02-30" }).success, false);
  assert.equal(
    eventSchema.safeParse({ ...event, metric: "weight", value: 80, source: "pedometer" }).success,
    false,
  );
  assert.equal(eventSchema.safeParse({ ...event, user_id: "someone-else" }).success, false);
});
test("food and active calories are independent metrics and optional targets stay optional", () => {
  for (const metric of ["caloriesIn", "caloriesActive"])
    assert.ok(eventSchema.safeParse({ ...event, metric, value: 500 }).success);
  assert.ok(goalsSchema.safeParse(goals).success);
  assert.equal(goalsSchema.safeParse({ ...goals, caloriesIn: 0 }).success, false);
  assert.equal(goalsSchema.safeParse({ ...goals, weeklyWorkouts: 0 }).success, false);
  assert.ok(
    eventSchema.safeParse({ id: event.id, observedAt: event.observedAt, kind: "goals", goals })
      .success,
  );
});
test("sync batches require owner identity and unique stable IDs", () => {
  const batch = { ownerId: "550e8400-e29b-41d4-a716-446655440000", events: [event] };
  assert.ok(batchSchema.safeParse(batch).success);
  assert.equal(batchSchema.safeParse({ ...batch, events: [event, event] }).success, false);
  assert.equal(batchSchema.safeParse({ events: [event] }).success, false);
});

test("step breakdowns preserve automatic and manual contributions through sync", () => {
  for (const source of ["healthconnect", "healthkit", "pedometer"]) {
    const stepEvent = {
      ...event,
      stepBreakdown: { automatic: 6500, manual: 1500, source },
    };
    const batch = {
      ownerId: "550e8400-e29b-41d4-a716-446655440000",
      events: [stepEvent],
    };
    assert.deepEqual(batchSchema.parse(JSON.parse(JSON.stringify(batch))), batch);
  }
  assert.deepEqual(eventSchema.parse(event), event);
  const manualOnly = {
    ...event,
    value: 300,
    stepBreakdown: { automatic: null, manual: 300, source: null },
  };
  assert.deepEqual(eventSchema.parse(manualOnly), manualOnly);
  for (const [automatic, manual] of [
    [0, 0],
    [200000, 0],
    [0, 200000],
  ])
    assert.ok(
      eventSchema.safeParse({
        ...event,
        value: automatic + manual,
        stepBreakdown: { automatic, manual, source: "pedometer" },
      }).success,
    );
});

test("step breakdowns reject mismatched totals, non-step events and invalid contributions", () => {
  const stepEvent = {
    ...event,
    stepBreakdown: { automatic: 6500, manual: 1500, source: "healthconnect" },
  };
  for (const invalid of [
    { ...stepEvent, value: 7999 },
    { ...stepEvent, value: null },
    { ...stepEvent, metric: "caloriesActive" },
    {
      ...stepEvent,
      value: 200001,
      stepBreakdown: { automatic: 200000, manual: 1, source: "pedometer" },
    },
    { ...stepEvent, stepBreakdown: null },
  ])
    assert.equal(eventSchema.safeParse(invalid).success, false);
  for (const invalid of [
    { automatic: -1, manual: 8001, source: "pedometer" },
    { automatic: 6500, manual: -1, source: "pedometer" },
    { automatic: 6500.5, manual: 1499.5, source: "pedometer" },
    { automatic: 200001, manual: 0, source: "pedometer" },
    { automatic: 0, manual: 200001, source: "pedometer" },
    { automatic: 6500, manual: 1500, source: "manual" },
    { automatic: 6500, manual: 1500 },
    { automatic: 6500, source: "pedometer" },
    { automatic: "6500", manual: 1500, source: "pedometer" },
    { automatic: null, manual: 8000, source: "pedometer" },
    { automatic: 6500, manual: 1500, source: null },
    { automatic: null, manual: 7999, source: null },
    { automatic: 6500, manual: 1500, source: "pedometer", other: 1 },
  ])
    assert.equal(eventSchema.safeParse({ ...stepEvent, stepBreakdown: invalid }).success, false);
  assert.equal(
    eventSchema.safeParse({
      id: event.id,
      observedAt: event.observedAt,
      kind: "goals",
      goals,
      stepBreakdown: stepEvent.stepBreakdown,
    }).success,
    false,
  );
});

test("extended health metrics validate their ranges and only accept whole ratings", () => {
  const values = {
    distance: 5.4,
    activeMinutes: 40,
    floors: 12,
    fiber: 30,
    sugar: 22,
    sodium: 1700,
    caffeine: 80,
    chest: 95,
    hips: 90,
    upperArm: 32,
    thigh: 55,
    calf: 34,
    neck: 37,
    sleepQuality: 4,
    energy: 3,
    mood: 5,
    stress: 2,
    soreness: 1,
    hrv: 45,
  };
  for (const [metric, value] of Object.entries(values)) {
    assert.ok(eventSchema.safeParse({ ...event, metric, value }).success, metric);
    assert.equal(eventSchema.safeParse({ ...event, metric, value: -1 }).success, false, metric);
    assert.equal(
      eventSchema.safeParse({ ...event, metric, source: "pedometer", value }).success,
      false,
      metric,
    );
  }
  for (const metric of ["floors", "sleepQuality", "energy", "mood", "stress", "soreness"])
    assert.equal(eventSchema.safeParse({ ...event, metric, value: 2.5 }).success, false, metric);
  assert.equal(
    eventSchema.safeParse({ ...event, metric: "sleepQuality", value: 6 }).success,
    false,
  );
  assert.ok(
    goalsSchema.safeParse({ ...goals, protein: 120, carbs: 250, fat: 60, activeMinutes: 30 })
      .success,
  );
  assert.equal(goalsSchema.safeParse({ ...goals, protein: 0 }).success, false);
});
