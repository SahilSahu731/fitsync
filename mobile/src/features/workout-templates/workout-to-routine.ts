import type {
  WorkoutSession,
  WorkoutTemplateInput,
} from "@/features/workouts/types";
export type WorkoutToRoutineMode = "STRUCTURE_ONLY" | "USE_LOGGED_VALUES";
export function workoutToRoutineInput(
  workout: WorkoutSession,
  mode: WorkoutToRoutineMode,
  name = workout.name,
): WorkoutTemplateInput {
  return {
    name,
    description: null,
    exercises: workout.exercises.map((exercise) => ({
      exercise_id: exercise.exercise_id,
      rest_seconds: exercise.rest_seconds,
      notes: exercise.notes,
      superset_group_id: exercise.superset_group_id,
      planned_sets: exercise.sets.map((set) =>
        mode === "STRUCTURE_ONLY"
          ? {
              type: set.type,
              target_reps_min: null,
              target_reps_max: null,
              target_weight: null,
              target_duration_seconds: null,
              target_distance_meters: null,
              target_rpe: null,
              target_rir: null,
            }
          : {
              type: set.type,
              target_reps_min: set.reps,
              target_reps_max: set.reps,
              target_weight: set.weight,
              target_duration_seconds: set.duration_seconds,
              target_distance_meters: set.distance_meters,
              target_rpe: set.rpe,
              target_rir: set.rir,
            },
      ),
    })),
  };
}
