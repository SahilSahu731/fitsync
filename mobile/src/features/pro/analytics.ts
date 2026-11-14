import {
  addDays,
  latestMetrics,
  METRICS,
  type Metric,
  type ProgressEvent,
  type ProgressWorkout,
} from "../progress/model";
import {
  estimatedMax,
  setVolume,
  summary as baseSummary,
  workoutDate,
} from "../progress/analytics";

const summary = (workouts: ProgressWorkout[]) => ({
  ...baseSummary(workouts),
  minutes:
    workouts.reduce(
      (n, w) => n + (Number.isFinite(w.elapsed_seconds) ? Math.max(0, w.elapsed_seconds ?? 0) : 0),
      0,
    ) / 60,
});

export const MUSCLES = [
  "chest",
  "lats",
  "upper-back",
  "lower-back",
  "front-delts",
  "side-delts",
  "rear-delts",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "hip-flexors",
  "traps",
  "adductors",
  "abductors",
] as const;
export type MuscleMetadata = {
  id: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  movementPattern?: string;
};
export type ProPeriod = 7 | 30 | 90 | 365 | "all";
export type RecordMode = "load" | "reps" | "e1rm" | "volume" | "duration" | "distance";
export type ExerciseSession = {
  id: string;
  date: string;
  name: string;
  sets: number;
  reps: number;
  load: number;
  volume: number;
  e1rm: number | null;
  duration: number;
  distance: number;
  rpe: number | null;
};
export type ProExercise = {
  id: string;
  exerciseId: string;
  name: string;
  type: string;
  sessions: ExerciseSession[];
  best: Partial<Record<RecordMode, ExerciseSession>>;
};
export type PersonalRecord = {
  id: string;
  exerciseId: string;
  name: string;
  mode: RecordMode;
  value: number;
  previous: number;
  date: string;
  sessionId: string;
};
const daysBetween = (a: string, b: string) =>
  Math.max(
    1,
    Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000) + 1,
  );
const nonnegative = (value: number | null) =>
  value !== null && Number.isFinite(value) ? Math.max(0, value) : 0;
export function modesFor(type: string): RecordMode[] {
  return type === "reps_weight"
    ? ["load", "e1rm", "volume", "reps"]
    : type === "duration"
      ? ["duration"]
      : type === "distance_duration"
        ? ["distance", "duration"]
        : ["reps"];
}
export function buildProAnalytics(
  workouts: ProgressWorkout[],
  metadata: MuscleMetadata[],
  events: ProgressEvent[],
  period: ProPeriod,
  today: string,
) {
  const done = [
    ...new Map(
      workouts
        .filter((w) => w.status === "completed" && w.finished_at && workoutDate(w) <= today)
        .map((w) => [w.id, w]),
    ).values(),
  ].sort((a, b) => a.finished_at!.localeCompare(b.finished_at!) || a.id.localeCompare(b.id));
  const metrics = latestMetrics(events).filter((e) => e.date <= today);
  const firstDate = [...done.map(workoutDate), ...metrics.map((m) => m.date), today].sort()[0];
  const start = period === "all" ? firstDate : addDays(today, 1 - period);
  const days = daysBetween(start, today);
  const selected = done.filter((w) => workoutDate(w) >= start);
  const previousStart = addDays(start, -days);
  const previous =
    period === "all"
      ? []
      : done.filter((w) => workoutDate(w) >= previousStart && workoutDate(w) < start);
  const meta = new Map(metadata.map((e) => [e.id, e]));
  const muscleMap = new Map<
    string,
    {
      code: string;
      primary: number;
      secondary: number;
      volume: number;
      dates: Set<string>;
      exerciseIds: Set<string>;
      lastDate: string | null;
    }
  >();
  for (const code of [
    ...new Set([
      ...MUSCLES,
      ...metadata.flatMap((e) => [...e.primaryMuscles, ...e.secondaryMuscles]),
    ]),
  ])
    muscleMap.set(code, {
      code,
      primary: 0,
      secondary: 0,
      volume: 0,
      dates: new Set(),
      exerciseIds: new Set(),
      lastDate: null,
    });
  let mappedSets = 0,
    unknownSets = 0;
  const exerciseMap = new Map<string, ProExercise>();
  const records: PersonalRecord[] = [];
  for (const workout of done) {
    const date = workoutDate(workout);
    const merged = new Map<string, ProgressWorkout["workout_session_exercises"][number]>();
    for (const row of workout.workout_session_exercises) {
      const key = `${row.exercise_id}:${row.tracking_type}`,
        previous = merged.get(key);
      merged.set(
        key,
        previous
          ? {
              ...previous,
              workout_logged_sets: [...previous.workout_logged_sets, ...row.workout_logged_sets],
            }
          : { ...row },
      );
    }
    for (const exercise of merged.values()) {
      const sets = exercise.workout_logged_sets.filter(
        (s) => s.completed_at && s.set_type !== "warmup",
      );
      if (!sets.length) continue;
      const key = `${exercise.exercise_id}:${exercise.tracking_type}`;
      let item = exerciseMap.get(key);
      if (!item) {
        item = {
          id: key,
          exerciseId: exercise.exercise_id,
          name: exercise.exercise_name,
          type: exercise.tracking_type,
          sessions: [],
          best: {},
        };
        exerciseMap.set(key, item);
      }
      item.name = exercise.exercise_name;
      const estimates = sets
        .map((s) => estimatedMax(s, exercise.tracking_type))
        .filter((v): v is number => v !== null);
      const efforts = sets
        .map((s) => s.rpe)
        .filter((v): v is number => v !== null && Number.isFinite(v));
      const session: ExerciseSession = {
        id: workout.id,
        date,
        name: workout.name,
        sets: sets.length,
        reps: Math.max(...sets.map((s) => nonnegative(s.reps))),
        load: Math.max(...sets.map((s) => nonnegative(s.weight_kg))),
        volume: sets.reduce((n, s) => n + setVolume(s, exercise.tracking_type), 0),
        e1rm: estimates.length ? Math.max(...estimates) : null,
        duration: Math.max(...sets.map((s) => nonnegative(s.duration_seconds))),
        distance: Math.max(...sets.map((s) => nonnegative(s.distance_meters))),
        rpe: efforts.length ? efforts.reduce((a, b) => a + b, 0) / efforts.length : null,
      };
      item.sessions.push(session);
      for (const mode of modesFor(item.type)) {
        const value = session[mode];
        if (value === null || value <= 0) continue;
        const best = item.best[mode];
        if (!best || value > best[mode]!) {
          if (best)
            records.push({
              id: `${key}:${workout.id}:${mode}`,
              exerciseId: key,
              name: item.name,
              mode,
              value,
              previous: best[mode]!,
              date,
              sessionId: workout.id,
            });
          item.best[mode] = session;
        }
      }
      if (date < start) continue;
      // Metadata comes from the catalog, never guessed from an exercise name.
      const snapshot = exercise.exercises?.exercise_muscles;
      const muscles = snapshot?.length
        ? {
            primaryMuscles: snapshot
              .filter((m) => m.role === "primary" && m.exercise_muscle_groups?.code)
              .map((m) => m.exercise_muscle_groups!.code),
            secondaryMuscles: snapshot
              .filter((m) => m.role === "secondary" && m.exercise_muscle_groups?.code)
              .map((m) => m.exercise_muscle_groups!.code),
          }
        : meta.get(exercise.exercise_id);
      for (const code of [...(muscles?.primaryMuscles ?? []), ...(muscles?.secondaryMuscles ?? [])])
        if (!muscleMap.has(code))
          muscleMap.set(code, {
            code,
            primary: 0,
            secondary: 0,
            volume: 0,
            dates: new Set(),
            exerciseIds: new Set(),
            lastDate: null,
          });
      const primary = [...new Set(muscles?.primaryMuscles ?? [])];
      const secondary = [...new Set(muscles?.secondaryMuscles ?? [])].filter(
        (code) => !primary.includes(code),
      );
      if (primary.length) mappedSets += sets.length;
      else unknownSets += sets.length;
      for (const [role, codes] of [
        ["primary", primary],
        ["secondary", secondary],
      ] as const)
        for (const code of codes) {
          const muscle = muscleMap.get(code)!;
          muscle[role] += sets.length;
          if (role === "primary") muscle.volume += session.volume;
          muscle.dates.add(date);
          muscle.exerciseIds.add(key);
          muscle.lastDate = date;
        }
    }
  }
  // All history is retained. Long ranges aggregate into weeks/months for a bounded chart.
  const bucket: "day" | "week" | "month" = days <= 90 ? "day" : days <= 730 ? "week" : "month";
  const bucketDate = (date: string) =>
    bucket === "day"
      ? date
      : bucket === "month"
        ? `${date.slice(0, 7)}-01`
        : addDays(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7));
  const buckets = new Map<string, ProgressWorkout[]>();
  // Include zero-activity buckets so training gaps remain visible.
  for (let date = bucketDate(start); date <= today;) {
    const key = bucketDate(date);
    if (!buckets.has(key)) buckets.set(key, []);
    if (bucket === "month") {
      const next = new Date(`${key}T12:00:00Z`);
      next.setUTCMonth(next.getUTCMonth() + 1);
      date = next.toISOString().slice(0, 10);
    } else date = addDays(date, bucket === "week" ? 7 : 1);
  }
  for (const w of selected) {
    const key = bucketDate(workoutDate(w));
    buckets.set(key, [...(buckets.get(key) ?? []), w]);
  }
  const activity = [...buckets]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({ date, ...summary(items) }));
  const activeDays = new Set(selected.map(workoutDate)).size;
  const totals = summary(selected);
  const measurementStats = (Object.keys(METRICS) as Metric[]).map((metric) => {
    const rows = metrics.filter((m) => m.metric === metric && m.date >= start);
    const values = rows.map((m) => m.value!);
    return {
      metric,
      rows,
      count: rows.length,
      latest: rows.at(-1) ?? null,
      first: rows[0] ?? null,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    };
  });
  return {
    start,
    today,
    days,
    bucket,
    selected,
    totals,
    previous: period === "all" ? null : summary(previous),
    allTime: summary(done),
    activity,
    activeDays,
    averageMinutes: totals.workouts ? totals.minutes / totals.workouts : null,
    mappedSets,
    unknownSets,
    muscles: [...muscleMap.values()].map((m) => ({
      ...m,
      dates: [...m.dates],
      exerciseIds: [...m.exerciseIds],
      weeklySets: m.primary / Math.max(1, days / 7),
    })),
    exercises: [...exerciseMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    records: records.filter((r) => r.date >= start).reverse(),
    metrics,
    measurementStats,
  };
}
export type ProAnalytics = ReturnType<typeof buildProAnalytics>;
