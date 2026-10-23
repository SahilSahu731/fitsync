import type { WorkoutSession, WorkoutSet, workoutApi } from "./api";
export function replaceSet(session: WorkoutSession, id: string, replacement: WorkoutSet): WorkoutSession {
  return { ...session, workout_session_exercises: session.workout_session_exercises.map(exercise => exercise.workout_logged_sets.some(set => set.id === id) ? { ...exercise, workout_logged_sets: exercise.workout_logged_sets.map(set => set.id === id ? replacement : set) } : exercise) };
}
export function optimisticSet(set: WorkoutSet, patch: Parameters<typeof workoutApi.updateSet>[2]): WorkoutSet {
  return { ...set, ...(patch.setType !== undefined ? { set_type: patch.setType } : {}), ...(patch.weightKg !== undefined ? { weight_kg: patch.weightKg } : {}), ...(patch.reps !== undefined ? { reps: patch.reps } : {}), ...(patch.durationSeconds !== undefined ? { duration_seconds: patch.durationSeconds } : {}), ...(patch.distanceMeters !== undefined ? { distance_meters: patch.distanceMeters } : {}), ...(patch.rpe !== undefined ? { rpe: patch.rpe } : {}), ...(patch.rir !== undefined ? { rir: patch.rir } : {}), ...(patch.notes !== undefined ? { notes: patch.notes } : {}), ...(patch.completed !== undefined ? { completed_at: patch.completed ? new Date().toISOString() : null } : {}) };
}
