import type { WorkoutSession } from "@/features/workouts/types";
import { workoutToRoutineInput } from "../workout-to-routine";

const workout = {
  id: "local",
  name: "Push Day",
  status: "COMPLETED",
  started_at: "2026-09-13T10:00:00Z",
  completed_at: "2026-09-13T11:00:00Z",
  cancelled_at: null,
  duration_seconds: 3600,
  notes: null,
  revision: 1,
  completed_set_count: 1,
  total_set_count: 1,
  template_id: null,
  template_client_id: null,
  template_name_snapshot: null,
  exercises: [
    {
      id: "we",
      exercise_id: "bench",
      exercise_name: "Bench Press",
      thumbnail_url: null,
      tracking_type: "WEIGHT_REPS",
      laterality: "BILATERAL",
      load_mode: "TOTAL",
      position: 0,
      rest_seconds: 180,
      notes: null,
      superset_group_id: null,
      sets: [
        {
          id: "set",
          position: 0,
          type: "NORMAL",
          target_reps_min: null,
          target_reps_max: null,
          target_weight: null,
          target_duration_seconds: null,
          target_distance_meters: null,
          target_rpe: null,
          target_rir: null,
          reps: 8,
          weight: 80,
          weight_unit: "KG",
          duration_seconds: null,
          distance_meters: null,
          rpe: 8,
          rir: null,
          completed: true,
          completed_at: "2026-09-13T10:10:00Z",
        },
      ],
    },
  ],
} satisfies WorkoutSession;

describe("workoutToRoutineInput", () => {
  it("creates structure only", () => {
    const set = workoutToRoutineInput(workout, "STRUCTURE_ONLY").exercises[0]
      .planned_sets[0];
    expect(set.target_weight).toBeNull();
    expect(set.target_reps_min).toBeNull();
  });
  it("uses logged values as targets", () => {
    const set = workoutToRoutineInput(workout, "USE_LOGGED_VALUES").exercises[0]
      .planned_sets[0];
    expect(set.target_weight).toBe(80);
    expect(set.target_reps_min).toBe(8);
    expect(set.target_reps_max).toBe(8);
    expect(set.target_rpe).toBe(8);
  });
});
