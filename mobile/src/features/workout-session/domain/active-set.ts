import type {
  WorkoutExercise,
  WorkoutSession,
} from "@/features/workouts/types";

export interface ActiveWorkoutPosition {
  exerciseId: string;

  setId: string;
}

export function findActiveWorkoutPosition(
  workout: WorkoutSession,
): ActiveWorkoutPosition | null {
  for (const exercise of workout.exercises) {
    const set = exercise.sets.find((item) => !item.completed);

    if (set) {
      return {
        exerciseId: exercise.id,

        setId: set.id,
      };
    }
  }

  return null;
}

export function firstIncompleteSetId(exercise: WorkoutExercise): string | null {
  return exercise.sets.find((set) => !set.completed)?.id ?? null;
}

export function nextExerciseAfter(
  workout: WorkoutSession,

  exerciseId: string,
): WorkoutExercise | null {
  const index = workout.exercises.findIndex((item) => item.id === exerciseId);

  if (index < 0) {
    return null;
  }

  for (let next = index + 1; next < workout.exercises.length; next += 1) {
    const exercise = workout.exercises[next];

    if (exercise.sets.some((set) => !set.completed)) {
      return exercise;
    }
  }

  return null;
}
