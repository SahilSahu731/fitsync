import {
  addDays,
  latestMetrics,
  localDate,
  type ProgressEvent,
  type ProgressWorkout,
} from "../progress/model";

/** A small dashboard projection; strength analytics stay on the Progress screen. */
export function homeSnapshot(workouts: ProgressWorkout[], events: ProgressEvent[], today: string) {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const weekStart = addDays(today, -((weekday + 6) % 7));
  const completed = workouts
    .filter(
      (workout) =>
        workout.status === "completed" &&
        workout.finished_at &&
        Number.isFinite(Date.parse(workout.finished_at)) &&
        localDate(new Date(workout.finished_at)) <= today,
    )
    .sort((a, b) => Date.parse(b.finished_at!) - Date.parse(a.finished_at!));
  const weekly = completed.filter(
    (workout) => localDate(new Date(workout.finished_at!)) >= weekStart,
  );
  const metrics = latestMetrics(events).filter((entry) => entry.date <= today);
  return {
    completed,
    recent: completed.slice(0, 3),
    weeklyCount: weekly.length,
    weeklyMinutes: Math.round(
      weekly.reduce(
        (sum, workout) =>
          sum +
          (Number.isFinite(workout.elapsed_seconds)
            ? Math.max(0, workout.elapsed_seconds ?? 0)
            : 0),
        0,
      ) / 60,
    ),
    days: Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      return {
        date,
        count: weekly.filter((workout) => localDate(new Date(workout.finished_at!)) === date)
          .length,
      };
    }),
    metrics,
    daily: metrics.filter((entry) => entry.date === today),
    weight: metrics.filter((entry) => entry.metric === "weight").at(-1) ?? null,
  };
}

export type HomeSnapshot = ReturnType<typeof homeSnapshot>;
