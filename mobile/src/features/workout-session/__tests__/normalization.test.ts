/// <reference types="jest" />

import type { WorkoutSession } from "@/features/workouts/types";

import { normalizeWorkoutSession } from "../normalization";

describe("normalizeWorkoutSession", () => {
  it("adds Phase 2 defaults to a legacy workout payload", () => {
    const legacyWorkout = {
      id: "workout-1",
      template_id: null,
      name: "Legacy workout",
      status: "COMPLETED",
      started_at: "2026-01-01T10:00:00.000Z",
      completed_at: "2026-01-01T11:00:00.000Z",
      cancelled_at: null,
      duration_seconds: 3_600,
      notes: null,
      exercises: [
        {
          id: "workout-exercise-1",
          exercise_id: "exercise-1",
          exercise_name: "Bench Press",
          thumbnail_url: null,
          position: 0,
          rest_seconds: 180,
          notes: null,
          superset_group_id: null,
          sets: [
            {
              id: "set-1",
              position: 0,
              type: "NORMAL",
              target_reps_min: 8,
              target_reps_max: 10,
              target_weight: 80,
              target_rpe: null,
              target_rir: null,
              reps: 10,
              weight: 80,
              weight_unit: "KG",
              rpe: null,
              rir: null,
              completed: true,
              completed_at: "2026-01-01T10:30:00.000Z",
            },
          ],
        },
      ],
      completed_set_count: 1,
      total_set_count: 1,
      revision: 1,
    } as unknown as WorkoutSession;

    const normalized = normalizeWorkoutSession(legacyWorkout);

    expect(normalized.exercises[0].tracking_type).toBe("WEIGHT_REPS");

    expect(normalized.exercises[0].laterality).toBe("BILATERAL");

    expect(normalized.exercises[0].load_mode).toBe("TOTAL");

    expect(normalized.exercises[0].sets[0].target_duration_seconds).toBeNull();

    expect(normalized.exercises[0].sets[0].target_distance_meters).toBeNull();

    expect(normalized.exercises[0].sets[0].duration_seconds).toBeNull();

    expect(normalized.exercises[0].sets[0].distance_meters).toBeNull();
  });
});
