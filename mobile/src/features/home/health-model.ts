import { addDays, localDate, weightValue, type Goals, type Metric } from "../progress/model";
import type { HomeSnapshot } from "./model";

export type HealthKind = "water" | "steps" | "workouts" | "nutrition" | "weight";
export type HealthPoint = { date: string; value: number | null };
export const HEALTH = {
  water: {
    title: "Water",
    subtitle: "A little hydration, throughout your day.",
    color: "#80CBFF",
    icon: "water-outline",
    unit: "L",
    metric: "water",
  },
  steps: {
    title: "Steps",
    subtitle: "Every little bit of movement adds up.",
    color: "#FFB184",
    icon: "shoe-print",
    unit: "steps",
    metric: "steps",
  },
  workouts: {
    title: "Workouts",
    subtitle: "Your time, effort and consistency.",
    color: "#C1A9FF",
    icon: "dumbbell",
    unit: "sessions",
    metric: null,
  },
  nutrition: {
    title: "Nutrition",
    subtitle: "A clearer picture of how you fuel your day.",
    color: "#C5F460",
    icon: "silverware-fork-knife",
    unit: "kcal",
    metric: "caloriesIn",
  },
  weight: {
    title: "Body weight",
    subtitle: "Follow the bigger picture, one check-in at a time.",
    color: "#B6D5E5",
    icon: "scale-bathroom",
    unit: "kg",
    metric: "weight",
  },
} as const;
export const healthFormat = (value: number, fraction = 1) =>
  value.toLocaleString(undefined, { maximumFractionDigits: fraction });
export function healthValue(value: number, kind: HealthKind, unit: "kg" | "lb") {
  return kind === "water" ? value / 1000 : kind === "weight" ? weightValue(value, unit) : value;
}
export function healthGoal(kind: HealthKind, goals: Goals, unit: "kg" | "lb") {
  const metric = HEALTH[kind].metric;
  const goal = metric ? goals[metric] : null;
  return goal != null && goal > 0 ? healthValue(goal, kind, unit) : null;
}
export function healthHistory(
  snapshot: HomeSnapshot,
  kind: HealthKind,
  today: string,
  days: number,
  unit: "kg" | "lb",
): HealthPoint[] {
  const metric = HEALTH[kind].metric;
  const values = new Map(
    snapshot.metrics
      .filter((entry) => entry.metric === metric)
      .map((entry) => [entry.date, entry.value]),
  );
  const workouts = new Map<string, number>();
  if (kind === "workouts")
    for (const workout of snapshot.completed) {
      const date = localDate(new Date(workout.finished_at!));
      workouts.set(date, (workouts.get(date) ?? 0) + 1);
    }
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(today, index - days + 1);
    const stored = values.get(date);
    return {
      date,
      value:
        kind === "workouts"
          ? (workouts.get(date) ?? 0)
          : stored != null && Number.isFinite(stored)
            ? healthValue(stored, kind, unit)
            : null,
    };
  });
}
export function healthSummary(points: HealthPoint[]) {
  const recorded = points.filter(
    (point): point is HealthPoint & { value: number } => point.value != null,
  );
  const values = recorded.map((point) => point.value);
  return {
    recorded: recorded.length,
    average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    total: values.length ? values.reduce((sum, value) => sum + value, 0) : null,
    change: values.length > 1 ? values.at(-1)! - values[0] : null,
  };
}
export function metricToday(snapshot: HomeSnapshot, metric: Metric) {
  const value = snapshot.daily.find((entry) => entry.metric === metric)?.value;
  return value != null && Number.isFinite(value) ? value : null;
}
/** Paths break at unlogged dates; no interpolated measurements are implied. */
export function healthChartGeometry(
  points: HealthPoint[],
  kind: HealthKind,
  goal: number | null = null,
) {
  const values = points.flatMap((point) => (point.value == null ? [] : [point.value]));
  const high = Math.max(1, goal != null && Number.isFinite(goal) ? goal : 0, ...values);
  const low =
    kind === "weight" && values.length
      ? Math.max(0, Math.min(...values) - Math.max(0.5, (high - Math.min(...values)) * 0.25))
      : 0;
  const top = high + Math.max(kind === "weight" ? 0.5 : 0.1, (high - low) * 0.15);
  const x = (index: number) => 14 + (index / Math.max(1, points.length - 1)) * 292;
  const y = (value: number) => 146 - ((value - low) / (top - low)) * 122;
  const segments: string[] = [];
  let segment = "";
  points.forEach((point, index) => {
    if (point.value == null) {
      if (segment) segments.push(segment);
      segment = "";
    } else segment += `${segment ? " L" : "M"}${x(index)},${y(point.value)}`;
  });
  if (segment) segments.push(segment);
  return { x, y, segments, low, high: top };
}
