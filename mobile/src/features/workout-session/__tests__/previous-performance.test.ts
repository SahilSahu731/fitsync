import { matchPreviousSet } from "../domain/previous-performance";

import type { PreviousSet, WorkoutSet } from "@/features/workouts/types";

function current(
  id: string,

  type: WorkoutSet["type"],
): WorkoutSet {
  return {
    id,

    position: 0,

    type,

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
  };
}

function previous(
  type: PreviousSet["type"],

  weight: number,
): PreviousSet {
  return {
    type,

    weight,

    weight_unit: "KG",

    reps: 8,

    duration_seconds: null,

    distance_meters: null,

    rpe: null,
  };
}

describe("matchPreviousSet", () => {
  it("matches warmups to warmups", () => {
    const currentSets = [current("1", "WARMUP"), current("2", "NORMAL")];

    const previousSets = [previous("WARMUP", 40), previous("NORMAL", 80)];

    expect(matchPreviousSet(currentSets, previousSets, 1)?.weight).toBe(80);
  });

  it("falls back to final previous set for extra sets", () => {
    const currentSets = [
      current("1", "NORMAL"),

      current("2", "NORMAL"),

      current("3", "NORMAL"),
    ];

    const previousSets = [previous("NORMAL", 80), previous("NORMAL", 82.5)];

    expect(matchPreviousSet(currentSets, previousSets, 2)?.weight).toBe(82.5);
  });
});
