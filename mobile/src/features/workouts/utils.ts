import type {
  WeightUnit,
  WorkoutExercise,
  WorkoutSession,
  WorkoutUpdateInput,
} from "./types";

export function randomLocalId(): string {
  return `${Date.now()}-` + Math.random().toString(36).slice(2);
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);

  const minutes = Math.floor((seconds % 3600) / 60);

  const remaining = seconds % 60;

  if (hours > 0) {
    return (
      `${hours}:` +
      `${minutes.toString().padStart(2, "0")}:` +
      `${remaining.toString().padStart(2, "0")}`
    );
  }

  return `${minutes}:` + `${remaining.toString().padStart(2, "0")}`;
}

export function formatCompactDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);

  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export function convertWeight(
  weight: number,
  from: WeightUnit,
  to: WeightUnit,
): number {
  if (from === to) {
    return weight;
  }

  if (from === "LB" && to === "KG") {
    return weight * 0.45359237;
  }

  return weight / 0.45359237;
}

export function workoutVolume(
  session: WorkoutSession,
  displayUnit: WeightUnit,
): number {
  return session.exercises.reduce((total, exercise) => {
    if (exercise.tracking_type !== "WEIGHT_REPS") {
      return total;
    }

    return (
      total +
      exercise.sets.reduce((setTotal, workoutSet) => {
        if (
          !workoutSet.completed ||
          workoutSet.weight === null ||
          workoutSet.reps === null
        ) {
          return setTotal;
        }

        return (
          setTotal +
          convertWeight(
            workoutSet.weight,
            workoutSet.weight_unit,
            displayUnit,
          ) *
            workoutSet.reps
        );
      }, 0)
    );
  }, 0);
}

export function formatVolume(value: number): string {
  if (value >= 1000) {
    const thousands = value / 1000;

    return `${thousands.toFixed(thousands >= 10 ? 0 : 1)}k`;
  }

  return Math.round(value).toLocaleString();
}

export function sessionToUpdateInput(
  session: WorkoutSession,
  expectedRevision = session.revision,
): WorkoutUpdateInput {
  return {
    revision: expectedRevision,

    name: session.name,

    notes: session.notes,

    exercises: session.exercises.map((exercise) => ({
      id: exercise.id,

      exercise_id: exercise.exercise_id,

      tracking_type: exercise.tracking_type,

      laterality: exercise.laterality,

      load_mode: exercise.load_mode,

      rest_seconds: exercise.rest_seconds,

      notes: exercise.notes,

      superset_group_id: exercise.superset_group_id,

      sets: exercise.sets.map((workoutSet) => ({
        id: workoutSet.id,

        type: workoutSet.type,

        target_reps_min: workoutSet.target_reps_min,

        target_reps_max: workoutSet.target_reps_max,

        target_weight: workoutSet.target_weight,

        target_duration_seconds: workoutSet.target_duration_seconds,

        target_distance_meters: workoutSet.target_distance_meters,

        target_rpe: workoutSet.target_rpe,

        target_rir: workoutSet.target_rir,

        reps: workoutSet.reps,

        weight: workoutSet.weight,

        weight_unit: workoutSet.weight_unit,

        duration_seconds: workoutSet.duration_seconds,

        distance_meters: workoutSet.distance_meters,

        rpe: workoutSet.rpe,

        rir: workoutSet.rir,

        completed: workoutSet.completed,
      })),
    })),
  };
}

export function reorderExercises(
  exercises: WorkoutExercise[],
): WorkoutExercise[] {
  return exercises.map((exercise, index) => ({
    ...exercise,

    position: index,

    sets: exercise.sets.map((workoutSet, setIndex) => ({
      ...workoutSet,

      position: setIndex,
    })),
  }));
}
