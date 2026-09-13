import type { MuscleGroup } from "@/features/exercises/types";
import type { WorkoutTemplate } from "@/features/workouts/types";
import type { RoutineEditorState } from "./model";
export function editorToRoutine(
  state: RoutineEditorState,
  identity: {
    localId: string;
    clientTemplateId: string;
    serverId: string | null;
    revision: number;
    createdAt: string;
    timesPerformed?: number;
    lastPerformedAt?: string | null;
  },
): WorkoutTemplate {
  const muscles: MuscleGroup[] = [];
  for (const exercise of state.exercises)
    for (const raw of exercise.primaryMuscles) {
      const muscle = raw as MuscleGroup;
      if (!muscles.includes(muscle)) muscles.push(muscle);
    }
  return {
    id: identity.localId,
    client_template_id: identity.clientTemplateId,
    server_id: identity.serverId,
    name: state.name.trim(),
    description: state.description.trim() || null,
    folder_client_id: state.folderClientId,
    is_favorite: state.favorite,
    position: state.position,
    archived: state.archived,
    exercise_count: state.exercises.length,
    set_count: state.exercises.reduce((n, e) => n + e.sets.length, 0),
    muscle_groups: muscles.slice(0, 4),
    exercises: state.exercises.map((exercise, position) => ({
      id: exercise.id,
      exercise_id: exercise.exerciseId,
      exercise_name: exercise.exerciseName,
      thumbnail_url: exercise.thumbnailUrl,
      tracking_type: exercise.trackingType,
      laterality: exercise.laterality,
      load_mode: exercise.loadMode,
      primary_muscles: exercise.primaryMuscles as MuscleGroup[],
      position,
      rest_seconds: exercise.restSeconds,
      notes: exercise.notes.trim() || null,
      superset_group_id: exercise.supersetGroupId,
      planned_sets: exercise.sets.map((set, setPosition) => ({
        ...set,
        position: setPosition,
      })),
    })),
    revision: identity.revision,
    times_performed: identity.timesPerformed ?? 0,
    last_performed_at: identity.lastPerformedAt ?? null,
    created_at: identity.createdAt,
    updated_at: new Date().toISOString(),
  };
}
