import { completedSets, setVolume, workoutDate, type ProgressAnalytics } from "./analytics";
import { weightValue, type ProgressWorkout } from "./model";

export type ActivityMetric = "workouts" | "minutes" | "volume";
export type CumulativePoint = { date: string; value: number };
export type SessionPoint = {
  id: string;
  date: string;
  name: string;
  minutes: number;
  sets: number;
};
export type DurationDistribution = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
};
export type SessionProfile = {
  points: SessionPoint[];
  duration: DurationDistribution | null;
  totalSessions: number;
  missingDurationCount: number;
};

function selectedSessions(data: ProgressAnalytics) {
  return data.selected.filter((workout) => {
    if (workout.status !== "completed" || !workout.finished_at) return false;
    const date = workoutDate(workout);
    return date >= data.start && date <= data.today;
  });
}

function recordedSeconds(workout: ProgressWorkout) {
  const seconds = workout.elapsed_seconds;
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

/** A running total over the selected dates; missing duration contributes no time. */
export function cumulativeActivity(
  data: ProgressAnalytics,
  metric: ActivityMetric,
  unit: "kg" | "lb",
): CumulativePoint[] {
  const byDate = new Map<string, number>();
  for (const workout of selectedSessions(data)) {
    const date = workoutDate(workout);
    const value =
      metric === "workouts"
        ? 1
        : metric === "minutes"
          ? (recordedSeconds(workout) ?? 0)
          : completedSets(workout).reduce((sum, set) => sum + setVolume(set, set.trackingType), 0);
    byDate.set(date, (byDate.get(date) ?? 0) + value);
  }
  let total = 0;
  return data.activity.map(({ date }) => {
    total += byDate.get(date) ?? 0;
    return {
      date,
      value:
        metric === "minutes"
          ? Math.round(total / 60)
          : metric === "volume"
            ? weightValue(total, unit)
            : total,
    };
  });
}

// Linear interpolation between adjacent sorted values (the R-7 convention).
function quantile(sorted: number[], fraction: number) {
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/** Duration versus completed working sets, with a five-number duration summary. */
export function sessionProfile(data: ProgressAnalytics): SessionProfile {
  const selected = selectedSessions(data);
  const points = [...selected]
    .sort((a, b) => a.finished_at!.localeCompare(b.finished_at!) || a.id.localeCompare(b.id))
    .flatMap((workout): SessionPoint[] => {
      const seconds = recordedSeconds(workout);
      if (seconds === null) return [];
      return [
        {
          id: workout.id,
          date: workoutDate(workout),
          name: workout.name,
          minutes: seconds / 60,
          sets: completedSets(workout).length,
        },
      ];
    });
  const minutes = points.map((point) => point.minutes).sort((a, b) => a - b);
  const duration = minutes.length
    ? {
        min: minutes[0],
        q1: quantile(minutes, 0.25),
        median: quantile(minutes, 0.5),
        q3: quantile(minutes, 0.75),
        max: minutes[minutes.length - 1],
        count: minutes.length,
      }
    : null;
  return {
    points,
    duration,
    totalSessions: selected.length,
    missingDurationCount: selected.length - points.length,
  };
}
