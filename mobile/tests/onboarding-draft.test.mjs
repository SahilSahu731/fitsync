import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_DRAFT, restoreDraft } from "../src/components/onboarding/config.ts";

test("restores an existing onboarding draft without losing choices", () => {
  const saved = { ...DEFAULT_DRAFT, goal: "strength", heightCm: 183, weightKg: 82.5, trainingDays: 3, minutesPerWorkout: 60, gender: "female", bodyType: "medium", equipment: "dumbbells" };
  assert.deepEqual(restoreDraft(saved), saved);
});
test("invalid or outdated draft values cannot enter the setup form", () => {
  const restored = restoreDraft({ goal: "unknown", heightCm: 0, weightKg: Infinity, trainingDays: 99, minutesPerWorkout: 120, gender: "unknown", bodyType: "unknown", equipment: null });
  assert.deepEqual(restored, DEFAULT_DRAFT);
  assert.deepEqual(restoreDraft(null), DEFAULT_DRAFT);
  assert.deepEqual(restoreDraft("broken"), DEFAULT_DRAFT);
});
test("valid fields survive alongside malformed fields and fractional days are normalized", () => {
  const result = restoreDraft({ goal: "fitness", weightKg: 64.5, heightCm: "170", trainingDays: 3.4, bodyType: null });
  assert.equal(result.goal, "fitness");
  assert.equal(result.weightKg, 64.5);
  assert.equal(result.heightCm, DEFAULT_DRAFT.heightCm);
  assert.equal(result.trainingDays, 3);
  assert.equal(result.bodyType, null);
});
