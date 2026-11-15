import { addDays, type ProgressEvent, type ProgressWorkout } from "./model";
import { workoutDate } from "./analytics";

export const FREE_PROGRESS_DAYS = 90;
export const PROGRESS_PERIODS = [7, 30, 90, 365] as const;
export function progressDays(requested: number, isPro: boolean) {
  return isPro ? requested : Math.min(requested, FREE_PROGRESS_DAYS);
}
export function progressSources(
  workouts: ProgressWorkout[],
  events: ProgressEvent[],
  today: string,
  isPro: boolean,
) {
  const earliest = addDays(today, 1 - FREE_PROGRESS_DAYS);
  return {
    earliest: isPro ? null : earliest,
    workouts: isPro ? workouts : workouts.filter((workout) => workoutDate(workout) >= earliest),
    events: isPro
      ? events
      : events.filter((event) => event.kind !== "metric" || event.date >= earliest),
  };
}
export function canCompareProgress(start: string, days: number, earliest: string | null) {
  return !earliest || addDays(start, -days) >= earliest;
}
