export const METRICS = {
  steps: { label: "Steps", unit: "steps", color: "#FFFFFF", min: 0, max: 200000, integer: true },
  caloriesIn: { label: "Food calories", unit: "kcal", color: "#FFFFFF", min: 0, max: 20000 },
  caloriesActive: { label: "Active calories", unit: "kcal", color: "#FFFFFF", min: 0, max: 20000 },
  weight: { label: "Body weight", unit: "kg", color: "#FFFFFF", min: 25, max: 350 },
  water: { label: "Water", unit: "ml", color: "#FFFFFF", min: 0, max: 15000 },
  sleep: { label: "Sleep", unit: "hours", color: "#FFFFFF", min: 0, max: 24 },
  protein: { label: "Protein", unit: "g", color: "#FFFFFF", min: 0, max: 1000 },
  carbs: { label: "Carbs", unit: "g", color: "#FFFFFF", min: 0, max: 2000 },
  fat: { label: "Fat", unit: "g", color: "#FFFFFF", min: 0, max: 1000 },
  waist: { label: "Waist", unit: "cm", color: "#FFFFFF", min: 30, max: 250 },
  bodyFat: { label: "Body fat", unit: "%", color: "#FFFFFF", min: 2, max: 75 },
  restingHeartRate: {
    label: "Resting heart rate",
    unit: "bpm",
    color: "#FFFFFF",
    min: 25,
    max: 250,
  },
  distance: { label: "Walking / running distance", unit: "km", color: "#FFFFFF", min: 0, max: 500 },
  activeMinutes: { label: "Active minutes", unit: "min", color: "#FFFFFF", min: 0, max: 1440 },
  floors: {
    label: "Floors climbed",
    unit: "floors",
    color: "#FFFFFF",
    min: 0,
    max: 2000,
    integer: true,
  },
  fiber: { label: "Fiber", unit: "g", color: "#FFFFFF", min: 0, max: 300 },
  sugar: { label: "Sugar", unit: "g", color: "#FFFFFF", min: 0, max: 1000 },
  sodium: { label: "Sodium", unit: "mg", color: "#FFFFFF", min: 0, max: 30000 },
  caffeine: { label: "Caffeine", unit: "mg", color: "#FFFFFF", min: 0, max: 3000 },
  chest: { label: "Chest", unit: "cm", color: "#FFFFFF", min: 30, max: 250 },
  hips: { label: "Hips", unit: "cm", color: "#FFFFFF", min: 30, max: 250 },
  upperArm: { label: "Upper arm", unit: "cm", color: "#FFFFFF", min: 10, max: 100 },
  thigh: { label: "Thigh", unit: "cm", color: "#FFFFFF", min: 15, max: 150 },
  calf: { label: "Calf", unit: "cm", color: "#FFFFFF", min: 10, max: 100 },
  neck: { label: "Neck", unit: "cm", color: "#FFFFFF", min: 15, max: 100 },
  sleepQuality: {
    label: "Sleep quality",
    unit: "/ 5",
    color: "#FFFFFF",
    min: 1,
    max: 5,
    integer: true,
  },
  energy: { label: "Energy level", unit: "/ 5", color: "#FFFFFF", min: 1, max: 5, integer: true },
  mood: { label: "Mood", unit: "/ 5", color: "#FFFFFF", min: 1, max: 5, integer: true },
  stress: { label: "Stress", unit: "/ 5", color: "#FFFFFF", min: 1, max: 5, integer: true },
  soreness: {
    label: "Muscle soreness",
    unit: "/ 5",
    color: "#FFFFFF",
    min: 1,
    max: 5,
    integer: true,
  },
  hrv: { label: "Heart rate variability", unit: "ms", color: "#FFFFFF", min: 1, max: 500 },
} as const;
export type Metric = keyof typeof METRICS;
export const METRIC_GROUPS = {
  activity: {
    label: "Activity",
    icon: "shoe-print",
    color: "#FFFFFF",
    metrics: ["steps", "caloriesActive", "distance", "activeMinutes", "floors"],
  },
  nutrition: {
    label: "Nutrition",
    icon: "silverware-fork-knife",
    color: "#FFFFFF",
    metrics: [
      "caloriesIn",
      "protein",
      "carbs",
      "fat",
      "water",
      "fiber",
      "sugar",
      "sodium",
      "caffeine",
    ],
  },
  body: {
    label: "Body",
    icon: "human",
    color: "#FFFFFF",
    metrics: ["weight", "waist", "bodyFat", "chest", "hips", "upperArm", "thigh", "calf", "neck"],
  },
  recovery: {
    label: "Recovery",
    icon: "moon-waning-crescent",
    color: "#FFFFFF",
    metrics: [
      "sleep",
      "sleepQuality",
      "restingHeartRate",
      "hrv",
      "energy",
      "mood",
      "stress",
      "soreness",
    ],
  },
} as const satisfies Record<
  string,
  { label: string; icon: string; color: string; metrics: readonly Metric[] }
>;
export type MetricGroup = keyof typeof METRIC_GROUPS;
export const RATING_LABELS: Partial<Record<Metric, readonly string[]>> = {
  sleepQuality: ["Very poor", "Poor", "Okay", "Good", "Excellent"],
  energy: ["Drained", "Low", "Steady", "Energized", "Very energized"],
  mood: ["Very low", "Low", "Okay", "Good", "Great"],
  stress: ["Very low", "Low", "Moderate", "High", "Very high"],
  soreness: ["None", "Mild", "Moderate", "High", "Very high"],
};
export function isTotalMetric(metric: Metric) {
  return ![
    ...METRIC_GROUPS.body.metrics,
    "restingHeartRate",
    "hrv",
    ...Object.keys(RATING_LABELS),
  ].includes(metric);
}
export type Goals = {
  steps: number | null;
  caloriesIn: number | null;
  caloriesActive: number | null;
  weight: number | null;
  water: number | null;
  sleep: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  activeMinutes: number | null;
  weeklyWorkouts: number;
};
export type MetricEvent = {
  id: string;
  observedAt: string;
  kind: "metric";
  metric: Metric;
  date: string;
  value: number | null;
  source: "manual" | "pedometer" | "healthkit" | "healthconnect";
  notes: string;
};
export type ProgressEvent =
  MetricEvent | { id: string; observedAt: string; kind: "goals"; goals: Goals };
export type LoggedSet = {
  id: string;
  set_type: string;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  rpe: number | null;
  rir: number | null;
  completed_at: string | null;
};
export type ProgressWorkout = {
  id: string;
  name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  elapsed_seconds: number | null;
  workout_session_exercises: {
    id: string;
    exercise_id: string;
    exercise_name: string;
    tracking_type: string;
    position: number;
    workout_logged_sets: LoggedSet[];
  }[];
};
export type Journal = {
  version: 1;
  events: ProgressEvent[];
  pending: string[];
  workouts: ProgressWorkout[];
  workoutsUpdatedAt: string | null;
};
export const emptyJournal = (): Journal => ({
  version: 1,
  events: [],
  pending: [],
  workouts: [],
  workoutsUpdatedAt: null,
});
export function defaultGoals(trainingDays = 3): Goals {
  return {
    steps: null,
    caloriesIn: null,
    caloriesActive: null,
    weight: null,
    water: null,
    sleep: null,
    protein: null,
    carbs: null,
    fat: null,
    activeMinutes: null,
    weeklyWorkouts: trainingDays,
  };
}
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function dateLabel(
  date: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, options);
}
export function orderedEvents(events: ProgressEvent[]) {
  return [...events].sort(
    (a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt) || a.id.localeCompare(b.id),
  );
}
export function mergeEvents(local: ProgressEvent[], remote: ProgressEvent[]) {
  return orderedEvents([
    ...new Map([...local, ...remote].map((event) => [event.id, event])).values(),
  ]);
}
export function latestMetrics(events: ProgressEvent[]) {
  const result = new Map<string, MetricEvent>();
  for (const event of orderedEvents(events))
    if (event.kind === "metric") result.set(`${event.date}:${event.metric}`, event);
  return [...result.values()]
    .filter((event) => event.value !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function currentGoals(events: ProgressEvent[], trainingDays = 3): Goals {
  return {
    ...defaultGoals(trainingDays),
    ...orderedEvents(events)
      .filter((event) => event.kind === "goals")
      .at(-1)?.goals,
  };
}
export function validMetric(metric: Metric, value: number | null) {
  if (value === null) return true;
  const spec = METRICS[metric];
  return (
    Number.isFinite(value) &&
    value >= spec.min &&
    value <= spec.max &&
    (!("integer" in spec && spec.integer) || Number.isInteger(value))
  );
}
export function createEventBase(events: ProgressEvent[]) {
  const observedAt = new Date(
    events.reduce(
      (latest, event) => Math.max(latest, Date.parse(event.observedAt) + 1),
      Date.now(),
    ),
  ).toISOString();
  return {
    id: `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 13).padEnd(11, "0")}_${Math.random().toString(36).slice(2, 13).padEnd(11, "0")}`,
    observedAt,
  };
}
export function weightValue(kg: number, unit: "kg" | "lb") {
  return unit === "lb" ? kg / 0.45359237 : kg;
}
export function weightKg(value: number, unit: "kg" | "lb") {
  return unit === "lb" ? value * 0.45359237 : value;
}
