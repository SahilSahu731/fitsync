import type {
  WorkoutExercise,
  WorkoutSession,
} from "@/features/workouts/types";

import { reorderExercises } from "../domain/calculations";

export function replaceWorkoutExercise(
  workout: WorkoutSession,
  updated: WorkoutExercise,
): WorkoutSession {
  return {
    ...workout,

    exercises: workout.exercises.map((exercise) =>
      exercise.id === updated.id ? updated : exercise,
    ),
  };
}

export function moveWorkoutExercise(
  workout: WorkoutSession,
  index: number,
  direction: -1 | 1,
): WorkoutSession {
  const target = index + direction;

  if (target < 0 || target >= workout.exercises.length) {
    return workout;
  }

  const copy = [...workout.exercises];

  const [moved] = copy.splice(index, 1);

  copy.splice(target, 0, moved);

  return {
    ...workout,

    exercises: reorderExercises(copy),
  };
}

export function removeWorkoutExercise(
  workout: WorkoutSession,
  index: number,
): WorkoutSession {
  return {
    ...workout,

    exercises: reorderExercises(
      workout.exercises.filter((_, currentIndex) => currentIndex !== index),
    ),
  };
}

export function createWorkoutSuperset(
  workout: WorkoutSession,
  index: number,
): WorkoutSession {
  if (index >= workout.exercises.length - 1) {
    return workout;
  }

  const groupId = `superset-${Date.now()}`;

  return {
    ...workout,

    exercises: workout.exercises.map((exercise, currentIndex) =>
      currentIndex === index || currentIndex === index + 1
        ? {
            ...exercise,

            superset_group_id: groupId,
          }
        : exercise,
    ),
  };
}

export function removeWorkoutSuperset(
  workout: WorkoutSession,
  groupId: string,
): WorkoutSession {
  return {
    ...workout,

    exercises: workout.exercises.map((exercise) =>
      exercise.superset_group_id === groupId
        ? {
            ...exercise,

            superset_group_id: null,
          }
        : exercise,
    ),
  };
}
