import { METRICS, validMetric, weightKg, weightValue, type Goals } from "./model";
export function goalsToDraft(goals: Goals, unit: "kg" | "lb"): Record<keyof Goals, string> {
  return Object.fromEntries(
    Object.entries(goals).map(([key, value]) => [
      key,
      value == null
        ? ""
        : String(key === "weight" ? Math.round(weightValue(value, unit) * 100) / 100 : value),
    ]),
  ) as Record<keyof Goals, string>;
}
export function parseGoalsDraft(values: Record<keyof Goals, string>, unit: "kg" | "lb"): Goals {
  const result = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      value.trim() ? (key === "weight" ? weightKg(Number(value), unit) : Number(value)) : null,
    ]),
  ) as Goals;
  for (const key of Object.keys(result) as (keyof Goals)[]) {
    const n = result[key];
    if (
      key === "weeklyWorkouts"
        ? n == null || !Number.isInteger(n) || n < 1 || n > 14
        : n !== null &&
          (!Number.isFinite(n) ||
            n <= 0 ||
            !validMetric(key, n) ||
            (["steps", "water", "caloriesIn", "caloriesActive"].includes(key) &&
              !Number.isInteger(n)) ||
            (key === "sleep" && n < 1) ||
            (key === "steps" && n > 100000))
    ) {
      throw new Error(
        key === "weeklyWorkouts"
          ? "Choose between 1 and 14 workouts per week."
          : `Check your ${METRICS[key as Exclude<keyof Goals, "weeklyWorkouts">].label.toLowerCase()} target.`,
      );
    }
  }
  return result;
}
