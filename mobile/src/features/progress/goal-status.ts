import {
  addDays,
  latestMetrics,
  localDate,
  weightValue,
  type Goals,
  type ProgressEvent,
  type ProgressWorkout,
} from "./model";
import type { IconName } from "./visuals";

export type GoalStatus = {
  key: keyof Goals;
  label: string;
  icon: IconName;
  color: string;
  target: number;
  value: number | null;
  unit: string;
  period: string;
  ratio: number | null;
  reached: boolean;
};
const labels: Record<keyof Goals, { label: string; icon: IconName; unit: string; color: string }> =
  {
    weeklyWorkouts: { label: "Workouts", icon: "dumbbell", unit: "workouts", color: "#C5F460" },
    weight: { label: "Body weight", icon: "scale-bathroom", unit: "kg", color: "#FFB38A" },
    water: { label: "Water", icon: "water-outline", unit: "ml", color: "#7DCFFF" },
    steps: { label: "Steps", icon: "shoe-print", unit: "steps", color: "#C5F460" },
    sleep: { label: "Sleep", icon: "moon-waning-crescent", unit: "hours", color: "#D4B5FF" },
    protein: { label: "Protein", icon: "food-steak", unit: "g", color: "#D4B5FF" },
    caloriesIn: {
      label: "Food energy",
      icon: "silverware-fork-knife",
      unit: "kcal",
      color: "#D4B5FF",
    },
    carbs: { label: "Carbohydrates", icon: "barley", unit: "g", color: "#D4B5FF" },
    fat: { label: "Fat", icon: "peanut-outline", unit: "g", color: "#D4B5FF" },
    activeMinutes: { label: "Active time", icon: "timer-outline", unit: "min", color: "#C5F460" },
    caloriesActive: { label: "Active energy", icon: "fire", unit: "kcal", color: "#FFB38A" },
  };
export function goalStatuses(
  goals: Goals,
  events: ProgressEvent[],
  workouts: ProgressWorkout[],
  unit: "kg" | "lb",
  today = localDate(),
): GoalStatus[] {
  const metrics = latestMetrics(events).filter((entry) => entry.date <= today);
  const dayOfWeek = new Date(`${today}T12:00:00Z`).getUTCDay();
  const weekStart = addDays(today, -((dayOfWeek + 6) % 7));
  const weeklyCount = workouts.filter((workout) => {
    if (workout.status !== "completed" || !workout.finished_at) return false;
    const date = localDate(new Date(workout.finished_at));
    return date >= weekStart && date <= today;
  }).length;
  const thresholdGoals: (keyof Goals)[] = [
    "weeklyWorkouts",
    "water",
    "steps",
    "activeMinutes",
    "sleep",
  ];
  return (Object.keys(labels) as (keyof Goals)[]).flatMap((key) => {
    const target = goals[key];
    if (target == null) return [];
    const entry =
      key === "weeklyWorkouts"
        ? undefined
        : key === "weight"
          ? metrics.filter((row) => row.metric === key).at(-1)
          : metrics.find((row) => row.metric === key && row.date === today);
    const raw = key === "weeklyWorkouts" ? weeklyCount : (entry?.value ?? null);
    const value = key === "weight" && raw !== null ? weightValue(raw, unit) : raw;
    const convertedTarget = key === "weight" ? weightValue(target, unit) : target;
    return [
      {
        key,
        ...labels[key],
        unit: key === "weight" ? unit : labels[key].unit,
        target: convertedTarget,
        value,
        period:
          key === "weeklyWorkouts" ? "This week" : key === "weight" ? "Latest check-in" : "Today",
        ratio:
          key === "weight" || value === null
            ? null
            : Math.min(1, Math.max(0, value / Math.max(convertedTarget, 1))),
        reached: thresholdGoals.includes(key) && value !== null && value >= convertedTarget,
      },
    ];
  });
}
