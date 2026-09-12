import type { Exercise } from "@/features/exercises/types";

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

  rpe: string;
}

export interface LocalTemplateExercise {
  localId: string;

  exerciseId: string;

  exerciseName: string;

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

    restSeconds: exercise.rest_seconds,

    notes: exercise.notes ?? "",

    sets: exercise.planned_sets.map((plannedSet) => ({
      id: plannedSet.id,

      type: plannedSet.type,

      repsMin: plannedSet.target_reps_min?.toString() ?? "",

      repsMax: plannedSet.target_reps_max?.toString() ?? "",

      weight: plannedSet.target_weight?.toString() ?? "",

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

        restSeconds: exercise.mechanic === "COMPOUND" ? 180 : 90,

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

        target_reps_min: set.repsMin ? Number(set.repsMin) : null,

        target_reps_max: set.repsMax ? Number(set.repsMax) : null,

        target_weight: set.weight ? Number(set.weight) : null,

        target_rpe: set.rpe ? Number(set.rpe) : null,

        target_rir: null,
      })),
    })),
  };
}
