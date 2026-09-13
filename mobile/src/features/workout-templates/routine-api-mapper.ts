import type {
  LocalRoutineRecord,
  RoutineCreateInput,
  RoutineUpdateInput,
} from "./types";
function exerciseInput(record: LocalRoutineRecord) {
  return record.template.exercises.map((exercise) => ({
    exercise_id: exercise.exercise_id,
    rest_seconds: exercise.rest_seconds,
    notes: exercise.notes,
    superset_group_id: exercise.superset_group_id,
    planned_sets: exercise.planned_sets.map((set) => ({
      type: set.type,
      target_reps_min: set.target_reps_min,
      target_reps_max: set.target_reps_max,
      target_weight: set.target_weight,
      target_duration_seconds: set.target_duration_seconds,
      target_distance_meters: set.target_distance_meters,
      target_rpe: set.target_rpe,
      target_rir: set.target_rir,
    })),
  }));
}
export function routineCreateInput(
  record: LocalRoutineRecord,
): RoutineCreateInput {
  return {
    client_template_id: record.clientTemplateId,
    name: record.template.name,
    description: record.template.description,
    folder_client_id: record.template.folder_client_id,
    is_favorite: record.template.is_favorite,
    position: record.template.position,
    archived: record.archived,
    exercises: exerciseInput(record),
  };
}
export function routineUpdateInput(
  record: LocalRoutineRecord,
  revision: number,
): RoutineUpdateInput {
  return { ...routineCreateInput(record), revision };
}
