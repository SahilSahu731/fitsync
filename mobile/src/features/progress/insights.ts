import { addDays, type Metric, type ProgressWorkout } from "./model";
import { completedSets, setVolume, workoutDate, type ProgressAnalytics } from "./analytics";
import { sessionProfile } from "./report";

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const change = (first: number, last: number) => (first > 0 ? ((last - first) / first) * 100 : null);
const dayDistance = (first: string, last: string) =>
  Math.round((Date.parse(`${last}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) / 86400000);
export function metricInsight(data: ProgressAnalytics, metric: Metric) {
  const entries = data.metrics
    .filter(
      (entry) =>
        entry.metric === metric &&
        entry.date >= data.start &&
        entry.date <= data.today &&
        entry.value !== null &&
        Number.isFinite(entry.value),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const first = entries[0],
    last = entries.at(-1);
  const span = first && last ? dayDistance(first.date, last.date) : 0;
  return {
    entries,
    count: entries.length,
    average: mean(entries.map((entry) => entry.value!)),
    minimum: entries.length ? Math.min(...entries.map((entry) => entry.value!)) : null,
    maximum: entries.length ? Math.max(...entries.map((entry) => entry.value!)) : null,
    change: entries.length > 1 ? last!.value! - first.value! : null,
    perWeek: entries.length > 1 && span > 0 ? ((last!.value! - first.value!) / span) * 7 : null,
  };
}

export function trainingInsight(data: ProgressAnalytics) {
  const selected = [
    ...new Map(
      data.selected
        .filter(
          (workout) =>
            workout.status === "completed" &&
            workout.finished_at &&
            Number.isFinite(Date.parse(workout.finished_at)) &&
            workoutDate(workout) >= data.start &&
            workoutDate(workout) <= data.today,
        )
        .map((workout) => [workout.id, workout]),
    ).values(),
  ];
  const profile = sessionProfile({ ...data, selected });
  const dates = [...new Set(selected.map(workoutDate))].sort();
  const gaps = dates.slice(1).map((date, index) => dayDistance(dates[index], date));
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, index) => ({
    label,
    count: selected.filter(
      (workout) => (new Date(`${workoutDate(workout)}T12:00:00Z`).getUTCDay() + 6) % 7 === index,
    ).length,
  }));
  const sets = selected.flatMap((workout) => completedSets(workout));
  return {
    selected,
    profile,
    activeDays: dates.length,
    averageDuration: mean(profile.points.map((point) => point.minutes)),
    medianDuration: profile.duration?.median ?? null,
    averageGap: mean(gaps),
    weekdays,
    workingSets: sets.length,
    averageSets: selected.length ? sets.length / selected.length : null,
    averageVolume: selected.length
      ? selected.reduce(
          (sum, workout) =>
            sum +
            completedSets(workout).reduce(
              (volume, set) => volume + setVolume(set, set.trackingType),
              0,
            ),
          0,
        ) / selected.length
      : null,
  };
}

/** Read recorded set fields directly so an absent measurement never becomes a zero. */
export function exerciseTrend(workouts: ProgressWorkout[], exerciseId: string) {
  return workouts
    .flatMap((workout) => {
      const sets = completedSets(workout).filter(
        (set) => `${set.exerciseId}:${set.trackingType}` === exerciseId,
      );
      const values = sets.flatMap((set) => {
        const value =
          set.trackingType === "reps_weight"
            ? set.weight_kg
            : set.trackingType === "duration"
              ? set.duration_seconds
              : set.trackingType === "distance_duration"
                ? set.distance_meters
                : set.reps;
        if (value === null || !Number.isFinite(value) || value < 0) return [];
        if (set.trackingType === "reps" && (!Number.isInteger(value) || value === 0)) return [];
        return [value];
      });
      return values.length
        ? [
            {
              date: workoutDate(workout),
              timestamp: workout.finished_at!,
              value: Math.max(...values),
            },
          ]
        : [];
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((point, index) => ({
      date: point.date,
      value: point.value,
      label: `Session ${index + 1}`,
    }));
}

/** Invoked only in the verified-Pro component; never used to fill a locked preview. */
export function deepProgressInsight(data: ProgressAnalytics) {
  const base = trainingInsight(data);
  const sets = base.selected.flatMap((workout) => completedSets(workout));
  const validReps = sets.filter(
    (set) =>
      (set.trackingType === "reps_weight" || set.trackingType === "reps") &&
      set.reps !== null &&
      Number.isInteger(set.reps) &&
      set.reps > 0,
  );
  const weighted = validReps.filter(
    (set) =>
      set.trackingType === "reps_weight" &&
      set.weight_kg !== null &&
      Number.isFinite(set.weight_kg) &&
      set.weight_kg >= 0,
  );
  const weightedReps = weighted.reduce((sum, set) => sum + set.reps!, 0);
  const weightedVolume = weighted.reduce((sum, set) => sum + set.weight_kg! * set.reps!, 0);
  const rated = sets.filter(
    (set) => set.rpe !== null && Number.isFinite(set.rpe) && set.rpe >= 1 && set.rpe <= 10,
  );
  const ranges = [
    { label: "1–5", min: 1, max: 5 },
    { label: "6–12", min: 6, max: 12 },
    { label: "13+", min: 13, max: Infinity },
  ];
  const repRanges = ranges.map((range) => ({
    label: range.label,
    weighted: weighted.filter((set) => set.reps! >= range.min && set.reps! <= range.max).length,
    other: validReps.filter(
      (set) =>
        set.trackingType !== "reps_weight" && set.reps! >= range.min && set.reps! <= range.max,
    ).length,
  }));
  const effort = [
    { label: "RPE 1–6", min: 0, max: 6 },
    { label: "RPE >6–8", min: 6, max: 8 },
    { label: "RPE >8–10", min: 8, max: 10 },
  ].map((range) => ({
    label: range.label,
    count: rated.filter((set) => set.rpe! > range.min && set.rpe! <= range.max).length,
  }));
  const firstWeekday = (new Date(`${data.start}T12:00:00Z`).getUTCDay() + 6) % 7;
  const firstWeek = addDays(data.start, -firstWeekday);
  const currentWeek = addDays(
    data.today,
    -((new Date(`${data.today}T12:00:00Z`).getUTCDay() + 6) % 7),
  );
  const weeks = Array.from(
    { length: Math.floor(dayDistance(firstWeek, data.today) / 7) + 1 },
    (_, index) => {
      const date = addDays(firstWeek, index * 7),
        end = addDays(date, 6);
      const workouts = base.selected.filter(
        (workout) => workoutDate(workout) >= date && workoutDate(workout) <= end,
      );
      const working = workouts.flatMap((workout) => completedSets(workout));
      return {
        date,
        complete: date >= data.start && date < currentWeek,
        sessions: workouts.length,
        sets: working.length,
        volume: working.reduce((sum, set) => sum + setVolume(set, set.trackingType), 0),
      };
    },
  );
  const complete = weeks.filter((week) => week.complete);
  const latest = complete.at(-1),
    previous = complete.at(-2);
  const contributions = data.exercises
    .map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      volume: exercise.sessions
        .filter((session) => session.date >= data.start && session.date <= data.today)
        .reduce((sum, session) => sum + session.volume, 0),
    }))
    .filter((exercise) => exercise.volume > 0)
    .sort((a, b) => b.volume - a.volume);
  const performance = data.exercises
    .flatMap((exercise) => {
      const mode =
        exercise.type === "reps_weight"
          ? "e1rm"
          : exercise.type === "duration"
            ? "duration"
            : exercise.type === "distance_duration"
              ? "distance"
              : "reps";
      const sessions = [
        ...new Map(
          exercise.sessions
            .filter(
              (session) =>
                session.date >= data.start &&
                session.date <= data.today &&
                session[mode] !== null &&
                Number.isFinite(session[mode]) &&
                session[mode]! > 0,
            )
            .map((session) => [session.sessionId, session]),
        ).values(),
      ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      if (sessions.length < 2) return [];
      const first = sessions[0][mode]!,
        last = sessions.at(-1)![mode]!;
      return [
        {
          id: exercise.id,
          name: exercise.name,
          mode,
          first,
          last,
          firstDate: sessions[0].date,
          lastDate: sessions.at(-1)!.date,
          percent: change(first, last),
          samples: sessions.length,
        },
      ];
    })
    .sort((a, b) => (b.percent ?? -Infinity) - (a.percent ?? -Infinity));
  const muscleMap = new Map<string, { name: string; primary: number; secondary: number }>();
  let mappedSets = 0;
  for (const workout of base.selected)
    for (const exercise of workout.workout_session_exercises) {
      const count = exercise.workout_logged_sets.filter(
        (set) => set.completed_at && set.set_type !== "warmup",
      ).length;
      if (count === 0) continue;
      const metadata = exercise.exercises?.exercise_muscles ?? [];
      const primary = [
        ...new Set(
          metadata
            .filter((item) => item.role === "primary")
            .flatMap((item) =>
              item.exercise_muscle_groups?.code ? [item.exercise_muscle_groups.code] : [],
            ),
        ),
      ];
      const secondary = [
        ...new Set(
          metadata
            .filter((item) => item.role === "secondary")
            .flatMap((item) =>
              item.exercise_muscle_groups?.code ? [item.exercise_muscle_groups.code] : [],
            ),
        ),
      ].filter((name) => !primary.includes(name));
      if (primary.length || secondary.length) mappedSets += count;
      for (const name of [...primary, ...secondary]) {
        const current = muscleMap.get(name) ?? { name, primary: 0, secondary: 0 };
        current[primary.includes(name) ? "primary" : "secondary"] += count;
        muscleMap.set(name, current);
      }
    }
  const timed = base.selected.filter(
    (workout) =>
      workout.elapsed_seconds !== null &&
      Number.isFinite(workout.elapsed_seconds) &&
      workout.elapsed_seconds > 0,
  );
  const timedVolume = timed.reduce(
    (sum, workout) =>
      sum +
      completedSets(workout).reduce((volume, set) => volume + setVolume(set, set.trackingType), 0),
    0,
  );
  const timedMinutes = timed.reduce((sum, workout) => sum + workout.elapsed_seconds! / 60, 0);
  return {
    ...base,
    repRanges,
    effort,
    ratedSets: rated.length,
    averageRpe: mean(rated.map((set) => set.rpe!)),
    weightedReps,
    weightedVolume,
    averageLoad: weightedReps > 0 ? weightedVolume / weightedReps : null,
    volumePerMinute: timedMinutes > 0 ? timedVolume / timedMinutes : null,
    timedSessions: timed.length,
    weeks,
    completeWeeks: complete.length,
    weeklyChange: latest && previous ? change(previous.volume, latest.volume) : null,
    contributions,
    performance,
    mappedSets,
    muscles: [...muscleMap.values()].sort(
      (a, b) => b.primary - a.primary || b.secondary - a.secondary,
    ),
  };
}
