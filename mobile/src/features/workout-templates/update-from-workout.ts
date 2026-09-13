import type {
  WorkoutSession,
  WorkoutTemplate,
  WorkoutTemplateInput,
} from "@/features/workouts/types";
export function structureFromWorkout(
  workout: WorkoutSession,
  template: WorkoutTemplate,
): WorkoutTemplateInput {
  return {
    name: template.name,
    description: template.description,
    exercises: workout.exercises.map((exercise) => {
      const old = template.exercises.find(
        (item) => item.exercise_id === exercise.exercise_id,
      );
      return {
        exercise_id: exercise.exercise_id,
        rest_seconds: exercise.rest_seconds,
        notes: exercise.notes,
        superset_group_id: exercise.superset_group_id,
        planned_sets: exercise.sets.map((set, index) => ({
          type: set.type,
          target_reps_min: old?.planned_sets[index]?.target_reps_min ?? null,
          target_reps_max: old?.planned_sets[index]?.target_reps_max ?? null,
          target_weight: old?.planned_sets[index]?.target_weight ?? null,
          target_duration_seconds:
            old?.planned_sets[index]?.target_duration_seconds ?? null,
          target_distance_meters:
            old?.planned_sets[index]?.target_distance_meters ?? null,
          target_rpe: old?.planned_sets[index]?.target_rpe ?? null,
          target_rir: old?.planned_sets[index]?.target_rir ?? null,
        })),
      };
    }),
  };
}
