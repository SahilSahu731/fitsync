import assert from "node:assert/strict";
import test from "node:test";
import { exerciseInputSchema, exerciseListSchema } from "../src/modules/exercises/exercise.schema.js";

test("exercise content never requires an animation field", () => {
  const parsed = exerciseInputSchema.parse({
    slug: "bodyweight-squat", name: "Bodyweight Squat", category: "strength",
    activityType: "weight-training", bodyRegion: "lower-body", difficulty: "beginner",
    trackingType: "reps", movementPattern: "squat", instructions: ["Stand tall, then bend your knees with control."], status: "draft"
  });
  assert.equal(parsed.status, "draft");
  assert.equal("animation" in parsed, false);
});

test("admin status filtering accepts supported states and rejects invalid ones", () => {
  for (const status of ["draft", "published", "archived"]) {
    assert.equal(exerciseListSchema.parse({ status, includeDrafts: "true" }).status, status);
  }
  assert.equal(exerciseListSchema.safeParse({ status: "deleted" }).success, false);
});
