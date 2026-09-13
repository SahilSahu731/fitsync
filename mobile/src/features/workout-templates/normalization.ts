import * as Crypto from "expo-crypto";
import { normalizeWorkoutTemplate } from "@/features/workout-session/normalization";
import type { WorkoutTemplate } from "@/features/workouts/types";

export function cleanRoutineSupersets(
  template: WorkoutTemplate,
): WorkoutTemplate {
  const counts = new Map<string, number>();
  for (const exercise of template.exercises) {
    const group = exercise.superset_group_id;
    if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return {
    ...template,
    exercises: template.exercises.map((exercise, exerciseIndex) => ({
      ...exercise,
      position: exerciseIndex,
      superset_group_id:
        exercise.superset_group_id &&
        (counts.get(exercise.superset_group_id) ?? 0) >= 2
          ? exercise.superset_group_id
          : null,
      planned_sets: exercise.planned_sets.map((set, setIndex) => ({
        ...set,
        position: setIndex,
      })),
    })),
  };
}

export function normalizeRoutine(raw: WorkoutTemplate): WorkoutTemplate {
  const normalized = normalizeWorkoutTemplate(raw);
  const exercises = normalized.exercises.map((exercise) => ({
    ...exercise,
    id: exercise.id || Crypto.randomUUID(),
    primary_muscles: exercise.primary_muscles ?? [],
  }));
  return cleanRoutineSupersets({
    ...normalized,
    client_template_id: normalized.client_template_id ?? normalized.id,
    folder_client_id: normalized.folder_client_id ?? null,
    is_favorite: normalized.is_favorite ?? false,
    position: normalized.position ?? 0,
    archived: normalized.archived ?? false,
    exercise_count: exercises.length,
    set_count: exercises.reduce(
      (total, exercise) => total + exercise.planned_sets.length,
      0,
    ),
    muscle_groups: normalized.muscle_groups ?? [],
    revision: normalized.revision ?? 1,
    times_performed: normalized.times_performed ?? 0,
    last_performed_at: normalized.last_performed_at ?? null,
    exercises,
  });
}
