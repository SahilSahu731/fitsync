import type {
  WorkoutSession,
  WorkoutTemplate,
} from "@/features/workouts/types";
import { compareWorkoutToTemplate } from "../compare-workout-template";

function fixtures() {
  const workout = {
    id: "w",
    name: "R",
    status: "COMPLETED",
    started_at: "x",
    completed_at: "x",
    cancelled_at: null,
    duration_seconds: 1,
    notes: null,
    revision: 1,
    completed_set_count: 1,
    total_set_count: 1,
    template_id: "t",
    template_client_id: "c",
    template_name_snapshot: "R",
    exercises: [
      {
        id: "a",
        exercise_id: "a",
        exercise_name: "A",
        thumbnail_url: null,
        tracking_type: "WEIGHT_REPS",
        laterality: "BILATERAL",
        load_mode: "TOTAL",
        position: 0,
        rest_seconds: 60,
        notes: null,
        superset_group_id: null,
        sets: [
          {
            id: "s",
            position: 0,
            type: "NORMAL",
            target_reps_min: 8,
            target_reps_max: 8,
            target_weight: 80,
            target_duration_seconds: null,
            target_distance_meters: null,
            target_rpe: null,
            target_rir: null,
            reps: 9,
            weight: 82.5,
            weight_unit: "KG",
            duration_seconds: null,
            distance_meters: null,
            rpe: 8,
            rir: null,
            completed: true,
            completed_at: "x",
          },
        ],
      },
    ],
  } satisfies WorkoutSession;
  const template = {
    id: "t",
    client_template_id: "c",
    name: "R",
    description: null,
    folder_client_id: null,
    is_favorite: false,
    position: 0,
    archived: false,
    exercise_count: 1,
    set_count: 1,
    muscle_groups: [],
    revision: 1,
    times_performed: 0,
    last_performed_at: null,
    created_at: "x",
    updated_at: "x",
    exercises: [
      {
        id: "a",
        exercise_id: "a",
        exercise_name: "A",
        thumbnail_url: null,
        tracking_type: "WEIGHT_REPS",
        laterality: "BILATERAL",
        load_mode: "TOTAL",
        primary_muscles: [],
        position: 0,
        rest_seconds: 60,
        notes: null,
        superset_group_id: null,
        planned_sets: [
          {
            id: "s",
            position: 0,
            type: "NORMAL",
            target_reps_min: 8,
            target_reps_max: 8,
            target_weight: 80,
            target_duration_seconds: null,
            target_distance_meters: null,
            target_rpe: null,
            target_rir: null,
          },
        ],
      },
    ],
  } satisfies WorkoutTemplate;
  return { workout, template };
}
describe("compareWorkoutToTemplate", () => {
  it("ignores actual logged metrics", () => {
    const { workout, template } = fixtures();
    expect(compareWorkoutToTemplate(workout, template).changed).toBe(false);
  });
  it("detects set count changes", () => {
    const { workout, template } = fixtures();
    workout.exercises[0].sets.push({
      ...workout.exercises[0].sets[0],
      id: "s2",
    });
    expect(
      compareWorkoutToTemplate(workout, template).setChanges,
    ).toBeGreaterThan(0);
  });
  it("detects added exercises", () => {
    const { workout, template } = fixtures();
    workout.exercises.push({
      ...workout.exercises[0],
      id: "b",
      exercise_id: "b",
    });
    expect(compareWorkoutToTemplate(workout, template).addedExercises).toBe(1);
  });
});
