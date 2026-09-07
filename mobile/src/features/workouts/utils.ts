import type {
  WorkoutExercise,
  WorkoutSession,
  WorkoutUpdateInput,
} from "./types";


export function randomLocalId():
  string {
  return (
    `${Date.now()}-` +
    `${Math.random()
      .toString(36)
      .slice(2)}`
  );
}


export function formatDuration(
  seconds: number,
): string {
  const hours =
    Math.floor(
      seconds / 3600
    );

  const minutes =
    Math.floor(
      (
        seconds % 3600
      ) / 60
    );

  const remaining =
    seconds % 60;

  if (hours > 0) {
    return (
      `${hours}:` +
      `${minutes
        .toString()
        .padStart(
          2,
          "0"
        )}:` +
      `${remaining
        .toString()
        .padStart(
          2,
          "0"
        )}`
    );
  }

  return (
    `${minutes}:` +
    `${remaining
      .toString()
      .padStart(
        2,
        "0"
      )}`
  );
}


export function sessionToUpdateInput(
  session: WorkoutSession,
): WorkoutUpdateInput {
  return {
    name:
      session.name,

    notes:
      session.notes,

    exercises:
      session.exercises.map(
        (
          exercise,
        ) => ({
          id:
            exercise.id,

          exercise_id:
            exercise.exercise_id,

          rest_seconds:
            exercise.rest_seconds,

          notes:
            exercise.notes,

          superset_group_id:
            exercise
              .superset_group_id,

          sets:
            exercise.sets.map(
              (
                workoutSet,
              ) => ({
                id:
                  workoutSet.id,

                type:
                  workoutSet.type,

                target_reps_min:
                  workoutSet
                    .target_reps_min,

                target_reps_max:
                  workoutSet
                    .target_reps_max,

                target_weight:
                  workoutSet
                    .target_weight,

                target_rpe:
                  workoutSet
                    .target_rpe,

                target_rir:
                  workoutSet
                    .target_rir,

                reps:
                  workoutSet.reps,

                weight:
                  workoutSet.weight,

                weight_unit:
                  workoutSet
                    .weight_unit,

                rpe:
                  workoutSet.rpe,

                rir:
                  workoutSet.rir,

                completed:
                  workoutSet.completed,
              }),
            ),
        }),
      ),
  };
}


export function reorderExercises(
  exercises: WorkoutExercise[],
): WorkoutExercise[] {
  return exercises.map(
    (
      exercise,
      index,
    ) => ({
      ...exercise,

      position:
        index,

      sets:
        exercise.sets.map(
          (
            workoutSet,
            setIndex,
          ) => ({
            ...workoutSet,

            position:
              setIndex,
          }),
        ),
    }),
  );
}