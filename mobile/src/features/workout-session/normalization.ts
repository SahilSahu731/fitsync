import type {
  TemplateExercise,
  TemplateSet,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
  WorkoutTemplate,
} from "@/features/workouts/types";

function normalizeWorkoutSet(set: WorkoutSet): WorkoutSet {
  return {
    ...set,

    target_duration_seconds: set.target_duration_seconds ?? null,

    target_distance_meters: set.target_distance_meters ?? null,

    duration_seconds: set.duration_seconds ?? null,

    distance_meters: set.distance_meters ?? null,
  };
}

function normalizeWorkoutExercise(exercise: WorkoutExercise): WorkoutExercise {
  return {
    ...exercise,

    tracking_type: exercise.tracking_type ?? "WEIGHT_REPS",

    laterality: exercise.laterality ?? "BILATERAL",

    load_mode: exercise.load_mode ?? "TOTAL",

    sets: exercise.sets.map(normalizeWorkoutSet),
  };
}

export function normalizeWorkoutSession(
  workout: WorkoutSession,
): WorkoutSession {
  return {
    ...workout,

    exercises: workout.exercises.map(normalizeWorkoutExercise),
  };
}

function normalizeTemplateSet(set: TemplateSet): TemplateSet {
  return {
    ...set,

    target_duration_seconds: set.target_duration_seconds ?? null,

    target_distance_meters: set.target_distance_meters ?? null,
  };
}

function normalizeTemplateExercise(
  exercise: TemplateExercise,
): TemplateExercise {
  return {
    ...exercise,

    tracking_type: exercise.tracking_type ?? "WEIGHT_REPS",

    laterality: exercise.laterality ?? "BILATERAL",

    load_mode: exercise.load_mode ?? "TOTAL",

    planned_sets: exercise.planned_sets.map(normalizeTemplateSet),
  };
}

export function normalizeWorkoutTemplate(
  template: WorkoutTemplate,
): WorkoutTemplate {
  return {
    ...template,

    exercises: template.exercises.map(normalizeTemplateExercise),
  };
}
