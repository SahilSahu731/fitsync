import type { HistoryItem, WorkoutSession, WorkoutSet } from "./api";

export function workingSetVolume(
  set: Pick<WorkoutSet, "weight_kg" | "reps" | "set_type" | "completed_at">,
  trackingType: string,
) {
  return set.completed_at && set.set_type !== "warmup" && trackingType === "reps_weight"
    ? (set.weight_kg ?? 0) * (set.reps ?? 0)
    : 0;
}

export function workoutSummary(session: WorkoutSession | null) {
  const exercises = session?.workout_session_exercises ?? [];
  const completed = exercises.flatMap((exercise) =>
    exercise.workout_logged_sets.filter((set) => !!set.completed_at),
  );
  return {
    exercises: exercises.length,
    completedExercises: exercises.filter((exercise) =>
      exercise.workout_logged_sets.some((set) => !!set.completed_at),
    ).length,
    completedSets: completed.length,
    totalSets: exercises.reduce((sum, exercise) => sum + exercise.workout_logged_sets.length, 0),
    volume: exercises.reduce(
      (sum, exercise) =>
        sum +
        exercise.workout_logged_sets.reduce(
          (total, set) => total + workingSetVolume(set, exercise.tracking_type),
          0,
        ),
      0,
    ),
  };
}

export function completedWorkout(session: WorkoutSession, elapsedSeconds: number): WorkoutSession {
  return {
    ...session,
    status: "completed",
    elapsed_seconds: elapsedSeconds,
    finished_at: new Date(Date.parse(session.started_at) + elapsedSeconds * 1000).toISOString(),
  };
}

export function trainingWeek(history: HistoryItem[], now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const rows = history.filter((item) => {
    const time = Date.parse(item.finished_at ?? item.started_at);
    return time >= start.getTime() && time <= now.getTime();
  });
  return {
    workouts: rows.length,
    minutes: Math.round(rows.reduce((sum, item) => sum + (item.elapsed_seconds ?? 0), 0) / 60),
    days: new Set(rows.map((item) => new Date(item.finished_at ?? item.started_at).toDateString()))
      .size,
  };
}
