import type {
  Exercise,
  ExerciseTrackingType,
  ExerciseLaterality,
  ExerciseLoadMode,
} from "@/features/exercises/types";

import type {
  WorkoutSetType,
  WorkoutTemplate,
  WorkoutTemplateInput,
} from "@/features/workouts/types";

export interface LocalTemplateSet {
  id: string;

  type: WorkoutSetType;

  repsMin: string;

  repsMax: string;

  weight: string;

  duration: string;

  distance: string;

  rpe: string;
}

export interface LocalTemplateExercise {
  localId: string;

  exerciseId: string;

  exerciseName: string;

  trackingType: ExerciseTrackingType;

  laterality: ExerciseLaterality;

  loadMode: ExerciseLoadMode;

  restSeconds: number;

  notes: string;

  sets: LocalTemplateSet[];
}

export function templateEditorId(): string {
  return `${Date.now()}-` + Math.random().toString(36).slice(2);
}

export function makeTemplateSet(): LocalTemplateSet {
  return {
    id: templateEditorId(),

    type: "NORMAL",

    repsMin: "",

    repsMax: "",

    weight: "",

    duration: "",

    distance: "",

    rpe: "",
  };
}

export function templateToLocalExercises(
  template: WorkoutTemplate,
): LocalTemplateExercise[] {
  return template.exercises.map((exercise) => ({
    localId: exercise.id,

    exerciseId: exercise.exercise_id,

    exerciseName: exercise.exercise_name,

    trackingType: exercise.tracking_type,

    laterality: exercise.laterality,

    loadMode: exercise.load_mode,

    restSeconds: exercise.rest_seconds,

    notes: exercise.notes ?? "",

    sets: exercise.planned_sets.map((plannedSet) => ({
      id: plannedSet.id,

      type: plannedSet.type,

      repsMin: plannedSet.target_reps_min?.toString() ?? "",

      repsMax: plannedSet.target_reps_max?.toString() ?? "",

      weight: plannedSet.target_weight?.toString() ?? "",

      duration: plannedSet.target_duration_seconds?.toString() ?? "",

      distance: plannedSet.target_distance_meters?.toString() ?? "",

      rpe: plannedSet.target_rpe?.toString() ?? "",
    })),
  }));
}

export function addSelectedExercises(
  current: LocalTemplateExercise[],

  selected: Exercise[],
): LocalTemplateExercise[] {
  const existing = new Set(current.map((item) => item.exerciseId));

  return [
    ...current,

    ...selected
      .filter((exercise) => !existing.has(exercise.id))
      .map((exercise) => ({
        localId: templateEditorId(),

        exerciseId: exercise.id,

        exerciseName: exercise.name,

        trackingType: exercise.tracking_type,

        laterality: exercise.laterality,

        loadMode: exercise.load_mode,

        restSeconds: exercise.default_rest_seconds,

        notes: "",

        sets: [makeTemplateSet(), makeTemplateSet(), makeTemplateSet()],
      })),
  ];
}

export function moveLocalExercise(
  exercises: LocalTemplateExercise[],

  index: number,

  direction: -1 | 1,
): LocalTemplateExercise[] {
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= exercises.length) {
    return exercises;
  }

  const copy = [...exercises];

  const [moved] = copy.splice(index, 1);

  copy.splice(nextIndex, 0, moved);

  return copy;
}

function numericOrNull(value: string): number | null {
  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  const numeric = Number(cleaned);

  return Number.isFinite(numeric) ? numeric : null;
}

export function buildTemplateInput(
  name: string,

  description: string,

  exercises: LocalTemplateExercise[],
): WorkoutTemplateInput {
  return {
    name: name.trim(),

    description: description.trim() || null,

    exercises: exercises.map((exercise) => ({
      exercise_id: exercise.exerciseId,

      rest_seconds: exercise.restSeconds,

      notes: exercise.notes.trim() || null,

      superset_group_id: null,

      planned_sets: exercise.sets.map((set) => ({
        type: set.type,

        target_reps_min: numericOrNull(set.repsMin),

        target_reps_max: numericOrNull(set.repsMax),

        target_weight: numericOrNull(set.weight),

        target_duration_seconds: numericOrNull(set.duration),

        target_distance_meters: numericOrNull(set.distance),

        target_rpe: numericOrNull(set.rpe),

        target_rir: null,
      })),
    })),
  };
}
