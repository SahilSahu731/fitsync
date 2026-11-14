import type { SessionExercise } from "./api";

/** Continue the exercise being tracked, then move forward through the session. */
export function nextWorkoutSet(exercises: SessionExercise[], focusedId?: string) {
  const ordered = [...exercises].sort((a, b) => a.position - b.position);
  const focusedIndex = ordered.findIndex((exercise) => exercise.id === focusedId);
  const start = Math.max(0, focusedIndex);
  const queue = [...ordered.slice(start), ...ordered.slice(0, start)];
  for (const exercise of queue) {
    const sets = [...exercise.workout_logged_sets].sort((a, b) => a.position - b.position);
    const index = sets.findIndex((set) => !set.completed_at);
    if (index !== -1) return { exercise, set: sets[index], number: index + 1 };
  }
  return null;
}

export function workoutTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = String(safe % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${String(minutes).padStart(2, "0")}:${remainder}`;
}
