import test from "node:test";
import assert from "node:assert/strict";
import { focusPreview, type FocusConfig } from "../src/modules/coaching/coaching.focus.js";
import type { Exercise, Prescription } from "../src/modules/coaching/coaching.engine.js";
const catalog: Exercise[] = [
  { id: "press", name: "Press", tracking_type: "reps_weight", movement_pattern: "push", difficulty: "beginner", primary_muscles: ["chest"], equipment: ["barbell"] },
  { id: "row", name: "Row", tracking_type: "reps_weight", movement_pattern: "pull", difficulty: "beginner", primary_muscles: ["upper-back"], equipment: ["barbell"] },
];
const config: FocusConfig = { muscle: "chest", startsOn: "2026-11-14", weeks: 4, additionalSetsPerWeek: 2 };
const prescription = (sets = 3): Prescription => ({ minutes: 30, effort: "normal", explanation: ["Original explanation"], exercises: catalog.map((e) => ({ exerciseId: e.id, name: e.name, pattern: e.movement_pattern, trackingType: e.tracking_type, sets, repsMin: 8, repsMax: 12, weightKg: null, durationSeconds: null, restSeconds: 90, reason: "Original reason" })) });
const day = (date: string, changes: Record<string, unknown> = {}) => ({ date, status: "planned", prescription: prescription(), ...changes });
test("focus adds bounded sets on existing primary movements and preserves schedule and other work", () => {
  const input = [day("2026-11-14", { id: "one" }), day("2026-11-16", { id: "two" }), day("2026-11-18", { id: "three" }), day("2026-11-21", { id: "four" })];
  const before = structuredClone(input);
  const result = focusPreview(input, catalog, config, "focus");
  assert.deepEqual(input, before);
  assert.equal(result.changes.length, 3);
  assert.deepEqual(result.days.map((d) => d.date), input.map((d) => d.date));
  assert.equal(result.days[0].prescription.exercises[0].sets, 4);
  assert.equal(result.days[1].prescription.exercises[0].sets, 4);
  assert.equal(result.days[2].prescription.exercises[0].sets, 3);
  for (const d of result.days) assert.deepEqual(d.prescription.exercises[1], before[0].prescription.exercises[1]);
  assert.equal(result.days[0].prescription.focusId, "focus");
  assert.equal(result.days[2].prescription.focusId, undefined);
});
test("generated sessions without database IDs get focus markers by date and never double apply", () => {
  const generated = [day("2026-11-14"), day("2026-11-15"), day("2026-11-16")];
  const result = focusPreview(generated, catalog, config, "focus_active");
  assert.equal(result.days[0].prescription.focusId, "focus_active");
  assert.equal(result.days[1].prescription.focusId, "focus_active");
  assert.equal(result.days[2].prescription.focusId, undefined);
  const repeated = focusPreview(result.days, catalog, { ...config, additionalSetsPerWeek: 1 }, "again");
  assert.equal(repeated.days[0].prescription.exercises[0].sets, 4);
  assert.equal(repeated.days[0].prescription.focusId, "focus_active");
});
test("focus excludes active/completed/out-of-window/max-dose/timed sessions and respects 90 minutes", () => {
  const timed = prescription(); timed.exercises[0].trackingType = "duration";
  const oversized = prescription(); oversized.exercises.forEach((e) => { e.durationSeconds = 2400; });
  const input = [day("2026-11-13"), day("2026-11-14", { status: "active" }), day("2026-11-15", { status: "completed" }), day("2026-11-16", { prescription: prescription(5) }), day("2026-11-17", { prescription: timed }), day("2026-11-18", { prescription: oversized }), day("2026-12-12")];
  const result = focusPreview(input, catalog, config, "focus");
  assert.equal(result.changes.length, 0);
  assert.deepEqual(result.days, input);
});
test("no matching muscle makes an honest empty preview with no invented movement", () => {
  const result = focusPreview([day("2026-11-14")], catalog, { ...config, muscle: "calves" }, "focus");
  assert.equal(result.changes.length, 0);
  assert.match(result.explanation.join(" "), /No eligible/);
});
