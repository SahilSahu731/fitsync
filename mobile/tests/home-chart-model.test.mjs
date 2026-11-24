import test from "node:test";
import assert from "node:assert/strict";
import { macroBreakdown, macroHistory, workoutCalendar } from "../src/features/home/chart-model.ts";
import { homeSnapshot } from "../src/features/home/model.ts";

const today = "2026-11-24";
const event = (metric, value, date = today) => ({
  id: `${metric}-${date}`,
  observedAt: `${date}T12:00:00Z`,
  kind: "metric",
  metric,
  date,
  value,
  source: "manual",
  notes: "",
});
const snapshot = (events = []) => homeSnapshot([], events, today);
const item = (breakdown, key) => breakdown.items.find((entry) => entry.key === key);

test("macro composition uses macro energy rather than grams or logged calories", () => {
  const result = macroBreakdown(
    snapshot([
      event("protein", 25),
      event("carbs", 50),
      event("fat", 20),
      event("caloriesIn", 2000),
    ]),
    today,
  );
  assert.equal(result.complete, true);
  assert.equal(result.recorded, 3);
  assert.equal(result.totalEnergy, 480);
  assert.equal(item(result, "protein").energy, 100);
  assert.equal(item(result, "carbs").fraction, 200 / 480);
  assert.equal(item(result, "fat").fraction, 180 / 480);
  assert.ok(Math.abs(result.items.reduce((sum, entry) => sum + entry.fraction, 0) - 1) < 1e-12);
});

test("missing and zero macros remain distinguishable, including partial breakdowns", () => {
  const empty = macroBreakdown(snapshot([event("caloriesIn", 500)]), today);
  assert.equal(empty.recorded, 0);
  assert.equal(empty.complete, false);
  assert.ok(empty.items.every((entry) => entry.grams === null && entry.energy === null));
  assert.ok(empty.items.every((entry) => entry.fraction === 0));

  const partial = macroBreakdown(snapshot([event("protein", 0), event("carbs", 10)]), today);
  assert.equal(partial.recorded, 2);
  assert.equal(partial.complete, false);
  assert.equal(item(partial, "protein").grams, 0);
  assert.equal(item(partial, "fat").grams, null);
  assert.equal(item(partial, "carbs").fraction, 1);

  const zero = macroBreakdown(
    snapshot([event("protein", 0), event("carbs", 0), event("fat", 0)]),
    today,
  );
  assert.equal(zero.complete, true);
  assert.equal(zero.totalEnergy, 0);
  assert.ok(zero.items.every((entry) => entry.fraction === 0));
});

test("invalid macro amounts are unknown and never produce misleading chart segments", () => {
  for (const invalid of [NaN, Infinity, -1, Number.MAX_VALUE]) {
    const result = macroBreakdown(snapshot([event("protein", invalid)]), today);
    assert.equal(item(result, "protein").grams, null);
    assert.equal(item(result, "protein").energy, null);
    assert.equal(item(result, "protein").fraction, 0);
    assert.equal(result.recorded, 0);
    assert.equal(result.totalEnergy, 0);
  }
});

test("macro history follows requested dates independently of calorie history values", () => {
  const state = snapshot([
    event("protein", 10, "2026-11-22"),
    event("protein", 20, "2026-11-23"),
    event("protein", 30),
    event("fat", 5),
  ]);
  const requested = [
    { date: "2026-11-22", value: null },
    { date: "2026-11-24", value: 0 },
    { date: "2026-11-21", value: 999 },
  ];
  const result = macroHistory(state, requested);
  assert.deepEqual(
    result.map((entry) => entry.date),
    requested.map((entry) => entry.date),
  );
  assert.deepEqual(
    result.map((entry) => entry.breakdown.totalEnergy),
    [40, 165, 0],
  );
  assert.equal(result[2].breakdown.recorded, 0);
});

test("workout calendar aligns Monday and pads only cells outside the selected range", () => {
  const points = Array.from({ length: 7 }, (_, index) => ({
    date: `2026-11-${String(18 + index).padStart(2, "0")}`,
    value: index % 2,
  }));
  const cells = workoutCalendar(points);
  assert.equal(cells.length, 14);
  assert.deepEqual(cells.slice(0, 2), [null, null]);
  assert.deepEqual(cells.slice(2, 9), points);
  assert.ok(cells.slice(9).every((cell) => cell === null));
  assert.equal(cells[2].value, 0);
  assert.deepEqual(points[0], { date: "2026-11-18", value: 0 });
});

test("30-day calendar preserves dates across month and daylight-saving boundaries", () => {
  const points = Array.from({ length: 30 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 9, 26 + index, 12)).toISOString().slice(0, 10),
    value: index % 3 === 0 ? 1 : 0,
  }));
  const cells = workoutCalendar(points);
  assert.equal(cells.length, 35);
  assert.deepEqual(cells.slice(0, 30), points);
  assert.equal(cells[6].date, "2026-11-01");
  assert.equal(cells[29].date, "2026-11-24");
  assert.ok(cells.slice(30).every((cell) => cell === null));
});

test("calendar preserves unknown in-range days without inventing workout counts", () => {
  const cells = workoutCalendar([
    { date: "2026-11-25", value: -1 },
    { date: "2026-11-23", value: 2 },
    { date: "not-a-date", value: 1 },
    { date: "2026-11-31", value: 1 },
    { date: "2026-11-26", value: Infinity },
  ]);
  assert.deepEqual(cells.slice(0, 4), [
    { date: "2026-11-23", value: 2 },
    { date: "2026-11-24", value: null },
    { date: "2026-11-25", value: null },
    { date: "2026-11-26", value: null },
  ]);
  assert.deepEqual(workoutCalendar([]), []);
  assert.deepEqual(workoutCalendar([{ date: "invalid", value: 1 }]), []);
});
