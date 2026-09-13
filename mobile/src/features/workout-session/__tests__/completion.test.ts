import { canCompleteSet } from "../domain/completion";

import type { WorkoutSet } from "@/features/workouts/types";

function makeSet(patch: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: "set-1",

    position: 0,

    type: "NORMAL",

    target_reps_min: null,

    target_reps_max: null,

    target_weight: null,

    target_duration_seconds: null,

    target_distance_meters: null,

    target_rpe: null,

    target_rir: null,

    reps: null,

    weight: null,

    weight_unit: "KG",

    duration_seconds: null,

    distance_meters: null,

    rpe: null,

    rir: null,

    completed: false,

    completed_at: null,

    ...patch,
  };
}

describe("canCompleteSet", () => {
  it("requires weight and reps for strength", () => {
    expect(
      canCompleteSet(
        "WEIGHT_REPS",

        makeSet({
          weight: 80,

          reps: 8,
        }),
      ),
    ).toBe(true);
  });

  it("allows pure bodyweight without added load", () => {
    expect(
      canCompleteSet(
        "BODYWEIGHT_REPS",

        makeSet({
          reps: 12,
        }),
      ),
    ).toBe(true);
  });

  it("requires assistance for assisted reps", () => {
    expect(
      canCompleteSet(
        "ASSISTED_REPS",

        makeSet({
          reps: 10,
        }),
      ),
    ).toBe(false);
  });

  it("requires time for duration", () => {
    expect(
      canCompleteSet(
        "DURATION",

        makeSet({
          duration_seconds: 90,
        }),
      ),
    ).toBe(true);
  });

  it("requires distance and duration for cardio", () => {
    expect(
      canCompleteSet(
        "DISTANCE_DURATION",

        makeSet({
          distance_meters: 1000,

          duration_seconds: 300,
        }),
      ),
    ).toBe(true);
  });
});
