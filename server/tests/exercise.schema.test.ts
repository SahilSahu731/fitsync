import assert from "node:assert/strict";
import test from "node:test";

import {
  exerciseInputSchema,
  exercisePatchSchema,
  exerciseListSchema,
  mediaMetadataSchema,
} from "../src/modules/exercises/exercise.schema.js";

const validExercise = {
  slug: "incline-dumbbell-press",
  name: "Incline Dumbbell Press",
  description: "Incline pressing movement.",

  category: "strength",
  activityType: "weight-training",
  bodyRegion: "upper-body",

  difficulty: "beginner",
  trackingType: "reps_weight",
  movementPattern: "push",

  primaryMuscles: ["chest"],
  secondaryMuscles: ["triceps"],
  equipment: ["dumbbell", "bench"],

  instructions: ["Sit on an incline bench.", "Press the dumbbells upward under control."],

  tips: [],
  mistakes: [],
  safetyNotes: [],
  breathingTip: "",

  status: "draft",
};

test("accepts a draft exercise without animation metadata", () => {
  const result = exerciseInputSchema.safeParse(validExercise);

  assert.equal(result.success, true);
});

test("rejects missing names, unsafe slugs, overlapping muscles and duplicate equipment", () => {
  for (const [reason, patch] of [
    ["missing name", { name: "" }],
    ["unsafe slug", { slug: "Incline Dumbbell Press!" }],
    ["overlapping muscles", { secondaryMuscles: ["chest"] }],
    ["duplicate equipment", { equipment: ["dumbbell", "dumbbell"] }],
  ] as const)
    assert.equal(
      exerciseInputSchema.safeParse({ ...validExercise, ...patch }).success,
      false,
      reason,
    );
});

test("supports partial exercise updates", () => {
  const result = exercisePatchSchema.safeParse({
    name: "Updated Exercise Name",
  });

  assert.equal(result.success, true);
});

test("exercise listing validates pagination and publication status", () => {
  const result = exerciseListSchema.safeParse({
    page: "1",
    pageSize: "1000",
  });

  assert.equal(result.success, false);
  for (const status of ["draft", "published", "archived"])
    assert.equal(exerciseListSchema.parse({ status, includeDrafts: "true" }).status, status);
  assert.equal(exerciseListSchema.safeParse({ status: "deleted" }).success, false);
});

test("requires usage rights on media uploads", () => {
  const result = mediaMetadataSchema.safeParse({
    license: "",
  });

  assert.equal(result.success, false);
});
