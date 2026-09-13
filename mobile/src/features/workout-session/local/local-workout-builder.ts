import * as Crypto from "expo-crypto";

import type {
  WeightUnit,
  WorkoutSession,
  WorkoutTemplate,
} from "@/features/workouts/types";

import type { NewLocalWorkout } from "./types";

interface BuildLocalWorkoutInput {
  userId: string;

  weightUnit: WeightUnit;

  name?: string | null;

  template?: WorkoutTemplate | null;
}

export function buildLocalWorkout({
  userId,
  weightUnit,
  name,
  template,
}: BuildLocalWorkoutInput): NewLocalWorkout {
  const now = new Date().toISOString();

  const localId = Crypto.randomUUID();

  const clientWorkoutId = Crypto.randomUUID();

  const exercises = template
    ? template.exercises.map((templateExercise, exerciseIndex) => ({
        id: Crypto.randomUUID(),

        exercise_id: templateExercise.exercise_id,

        exercise_name: templateExercise.exercise_name,

        thumbnail_url: templateExercise.thumbnail_url,

        position: exerciseIndex,

        rest_seconds: templateExercise.rest_seconds,

        notes: templateExercise.notes,

        superset_group_id: templateExercise.superset_group_id,

        sets: templateExercise.planned_sets.map((plannedSet, setIndex) => ({
          id: Crypto.randomUUID(),

          position: setIndex,

          type: plannedSet.type,

          target_reps_min: plannedSet.target_reps_min,

          target_reps_max: plannedSet.target_reps_max,

          target_weight: plannedSet.target_weight,

          target_rpe: plannedSet.target_rpe,

          target_rir: plannedSet.target_rir,

          reps: null,

          weight: null,

          weight_unit: weightUnit,

          rpe: null,

          rir: null,

          completed: false,

          completed_at: null,
        })),
      }))
    : [];

  const workout: WorkoutSession = {
    /*
     * Local workout ID intentionally occupies
     * WorkoutSession.id while working offline.
     *
     * server_id lives separately in SQLite.
     */
    id: localId,

    template_id: template?.id ?? null,

    name: name?.trim() || template?.name || "Workout",

    status: "IN_PROGRESS",

    started_at: now,

    completed_at: null,

    cancelled_at: null,

    duration_seconds: null,

    notes: null,

    exercises,

    completed_set_count: 0,

    total_set_count: exercises.reduce(
      (total, exercise) => total + exercise.sets.length,
      0,
    ),

    /*
     * Local workouts have no Mongo revision yet.
     *
     * Revision 1 is used as an in-memory placeholder.
     * The actual server revision is stored separately
     * in local_workouts.server_revision.
     */
    revision: 1,
  };

  return {
    localId,

    userId,

    clientWorkoutId,

    workout,

    createdAt: now,
  };
}
