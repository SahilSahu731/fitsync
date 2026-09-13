import type { SQLiteDatabase } from "expo-sqlite";

import { normalizeWorkoutSession } from "../normalization";

import type {
  PreviousExercisePerformance,
  PreviousSet,
  WorkoutSession,
} from "@/features/workouts/types";

interface WorkoutRow {
  payload_json: string;
}

function previousSetFromWorkoutSet(
  set: WorkoutSession["exercises"][number]["sets"][number],
): PreviousSet {
  return {
    type: set.type,

    weight: set.weight,

    weight_unit: set.weight_unit,

    reps: set.reps,

    duration_seconds: set.duration_seconds,

    distance_meters: set.distance_meters,

    rpe: set.rpe,
  };
}

export async function getLocalPreviousPerformance(
  database: SQLiteDatabase,

  userId: string,

  exerciseIds: string[],
): Promise<PreviousExercisePerformance[]> {
  if (exerciseIds.length === 0) {
    return [];
  }

  const wanted = new Set(exerciseIds);

  const results = new Map<string, PreviousExercisePerformance>();

  const rows = await database.getAllAsync<WorkoutRow>(
    `
        SELECT payload_json
        FROM local_workouts
        WHERE user_id = ?
          AND local_status = 'COMPLETED'
        ORDER BY updated_at DESC
        LIMIT 100
        `,
    userId,
  );

  for (const row of rows) {
    let workout: WorkoutSession;

    try {
      workout = normalizeWorkoutSession(
        JSON.parse(row.payload_json) as WorkoutSession,
      );
    } catch {
      continue;
    }

    if (!workout.completed_at) {
      continue;
    }

    for (const exercise of workout.exercises) {
      if (
        !wanted.has(exercise.exercise_id) ||
        results.has(exercise.exercise_id)
      ) {
        continue;
      }

      const completed = exercise.sets.filter((set) => set.completed);

      if (completed.length === 0) {
        continue;
      }

      results.set(
        exercise.exercise_id,

        {
          exercise_id: exercise.exercise_id,

          completed_at: workout.completed_at,

          sets: completed.map(previousSetFromWorkoutSet),
        },
      );
    }

    if (results.size === wanted.size) {
      break;
    }
  }

  return [...results.values()];
}
