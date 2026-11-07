import { addDays, latestMetrics, localDate, type Metric, type ProgressEvent, type ProgressWorkout, type LoggedSet } from "./model";

const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
export function workoutDate(workout: ProgressWorkout) { return localDate(new Date(workout.finished_at ?? workout.started_at)); }
export function completedSets(workout: ProgressWorkout, includeWarmups = false) {
  return workout.workout_session_exercises.flatMap(exercise => exercise.workout_logged_sets.filter(set => set.completed_at && (includeWarmups || set.set_type !== "warmup")).map(set => ({ ...set, exerciseId: exercise.exercise_id, exerciseName: exercise.exercise_name, trackingType: exercise.tracking_type })));
}
export function setVolume(set: LoggedSet, trackingType: string) {
  // Added load and assistance are not comparable with external-load volume.
  return trackingType === "reps_weight" ? number(set.weight_kg) * number(set.reps) : 0;
}
export function estimatedMax(set: LoggedSet, trackingType: string) {
  const weight = number(set.weight_kg); const reps = number(set.reps);
  return trackingType === "reps_weight" && weight > 0 && Number.isInteger(reps) && reps >= 1 && reps <= 12 ? reps === 1 ? weight : weight * (1 + reps / 30) : null;
}
export function summary(workouts: ProgressWorkout[]) {
  const sets = workouts.flatMap(workout => completedSets(workout));
  const all = workouts.flatMap(workout => completedSets(workout, true));
  return { workouts: workouts.length, sets: sets.length, warmups: all.length - sets.length,
    volume: sets.reduce((total, set) => total + setVolume(set, set.trackingType), 0),
    minutes: Math.round(workouts.reduce((total, workout) => total + Math.max(0, number(workout.elapsed_seconds)), 0) / 60),
    reps: sets.reduce((total, set) => total + number(set.reps), 0),
    distance: sets.reduce((total, set) => total + number(set.distance_meters), 0),
    timedSeconds: sets.reduce((total, set) => total + number(set.duration_seconds), 0),
    averageRpe: sets.filter(set => set.rpe != null).length ? sets.filter(set => set.rpe != null).reduce((total, set) => total + number(set.rpe), 0) / sets.filter(set => set.rpe != null).length : null,
  };
}
export function buildProgress(workouts: ProgressWorkout[], events: ProgressEvent[], days: number, today: string, weeklyTarget: number) {
  const done = workouts.filter(workout => workout.status === "completed" && workout.finished_at && workoutDate(workout) <= today);
  const start = addDays(today, 1 - days); const previousStart = addDays(start, -days);
  const selected = done.filter(workout => workoutDate(workout) >= start);
  const previous = done.filter(workout => workoutDate(workout) >= previousStart && workoutDate(workout) < start);
  const metrics = latestMetrics(events).filter(entry => entry.date <= today);
  const byDate = new Map<string, ProgressWorkout[]>();
  for (const workout of done) { const date = workoutDate(workout); byDate.set(date, [...(byDate.get(date) ?? []), workout]); }
  const activity = Array.from({ length: days }, (_, index) => { const date = addDays(start, index); return { date, ...summary(byDate.get(date) ?? []) }; });
  const dayOfWeek = new Date(`${today}T12:00:00Z`).getUTCDay();
  const weekStart = addDays(today, -((dayOfWeek + 6) % 7));
  const firstDate = done.map(workoutDate).sort()[0] ?? today;
  const totalWeeks = Math.max(13, Math.ceil((Date.parse(`${weekStart}T12:00:00Z`) - Date.parse(`${firstDate}T12:00:00Z`)) / 604800000) + 1);
  const weeks = Array.from({ length: totalWeeks }, (_, index) => {
    const date = addDays(weekStart, (index - totalWeeks + 1) * 7);
    const sessions = done.filter(workout => workoutDate(workout) >= date && workoutDate(workout) <= addDays(date, 6));
    return { date, ...summary(sessions), targetMet: sessions.length >= weeklyTarget, current: index === totalWeeks - 1 };
  });
  const calendar = Array.from({ length: 91 }, (_, index) => { const date = addDays(weekStart, index - 84); return { date, workouts: byDate.get(date)?.length ?? 0, future: date > today }; });
  // An incomplete current week does not break an already earned weekly run.
  let streak = 0;
  for (const week of [...weeks].reverse().slice(weeks.at(-1)!.targetMet ? 0 : 1)) { if (!week.targetMet) break; streak++; }
  const exerciseIds = new Map(done.flatMap(workout => workout.workout_session_exercises.map(exercise => [`${exercise.exercise_id}:${exercise.tracking_type}`, { exerciseId: exercise.exercise_id, trackingType: exercise.tracking_type }] as const)));
  const exercises = [...exerciseIds].map(([id, { exerciseId, trackingType }]) => {
    const sessions = done.flatMap(workout => {
      const sets = completedSets(workout).filter(set => set.exerciseId === exerciseId && set.trackingType === trackingType);
      if (!sets.length) return [];
      const estimates = sets.map(set => estimatedMax(set, set.trackingType)).filter((value): value is number => value !== null);
      return [{ sessionId: workout.id, timestamp: workout.finished_at!, date: workoutDate(workout), name: sets[0].exerciseName, type: sets[0].trackingType,
        load: Math.max(...sets.map(set => number(set.weight_kg))), reps: Math.max(...sets.map(set => number(set.reps))),
        e1rm: estimates.length ? Math.max(...estimates) : null, volume: sets.reduce((total, set) => total + setVolume(set, set.trackingType), 0),
        duration: Math.max(...sets.map(set => number(set.duration_seconds))), distance: Math.max(...sets.map(set => number(set.distance_meters))),
        sets: sets.length, bestSet: [...sets].sort((a, b) => number(b.weight_kg) - number(a.weight_kg) || number(b.reps) - number(a.reps))[0] }];
    }).sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.sessionId.localeCompare(b.sessionId));
    if (!sessions.length) return null;
    const max = (key: "load" | "reps" | "e1rm" | "volume" | "duration" | "distance") => [...sessions].filter(s => s[key] !== null).sort((a, b) => number(b[key]) - number(a[key]) || b.date.localeCompare(a.date))[0] ?? null;
    return { id, name: sessions.at(-1)!.name, type: sessions.at(-1)!.type, sessions, bestLoad: max("load"), bestReps: max("reps"), bestEstimate: max("e1rm"), bestVolume: max("volume"), bestDuration: max("duration"), bestDistance: max("distance") };
  }).filter((value): value is NonNullable<typeof value> => value !== null).sort((a, b) => a.name.localeCompare(b.name));
  return { start, today, selected, current: summary(selected), previous: summary(previous), allTime: summary(done), activity, calendar, weeks, streak, exercises, metrics };
}
export type ProgressAnalytics = ReturnType<typeof buildProgress>;
export function metricSeries(events: ProgressEvent[], metric: Metric, start: string, end: string) { return latestMetrics(events).filter(event => event.metric === metric && event.date >= start && event.date <= end); }
export function average(values: number[]) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; }
export function change(current: number, previous: number) { return previous > 0 ? (current - previous) / previous * 100 : null; }
