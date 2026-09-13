/// <reference types="jest" />

import type { WorkoutSession } from "@/features/workouts/types";

import {
  findActiveWorkoutPosition,
  nextExerciseAfter,
} from "../domain/active-set";

const workout = {
  exercises: [
    {
      id: "exercise-1",
      sets: [{ id: "set-1", completed: true }],
    },
    {
      id: "exercise-2",
      sets: [{ id: "set-2", completed: false }],
    },
  ],
} as unknown as WorkoutSession;

describe("active workout position", () => {
  it("finds the first incomplete set", () => {
    expect(findActiveWorkoutPosition(workout)).toEqual({
      exerciseId: "exercise-2",
      setId: "set-2",
    });
  });

  it("finds the next exercise with incomplete work", () => {
    expect(nextExerciseAfter(workout, "exercise-1")?.id).toBe("exercise-2");
  });
});
