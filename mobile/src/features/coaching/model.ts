import type { CoachingDay, CoachingPlan, PrescriptionExercise } from "./api";

export const GOAL_LABELS = { muscle: "Build muscle", strength: "Get stronger", fat_loss: "Manage weight", fitness: "Move more & get fitter" } as const;
export const EQUIPMENT_LABELS = { gym: "Full gym", dumbbells: "Dumbbells", bodyweight: "No equipment" } as const;
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
export function shiftDate(date: string, days: number) { const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + days); return localDate(value); }
export function displayDate(date: string) { return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }
export function nextSession(plan: CoachingPlan | null) {
  if (!plan) return null;
  const sorted = [...plan.sessions].sort((a, b) => a.date.localeCompare(b.date) || a.week - b.week || a.day - b.day);
  return sorted.find(day => day.status === "active") ?? sorted.find(day => day.status !== "completed") ?? null;
}
export function exerciseTarget(exercise: PrescriptionExercise, weightUnit: "kg" | "lb" = "kg") {
  const reps = exercise.repsMin === null || exercise.repsMax === null ? "reps not set" : exercise.repsMin === exercise.repsMax ? `${exercise.repsMin} reps` : `${exercise.repsMin}–${exercise.repsMax} reps`;
  const effort = exercise.durationSeconds ? `${exercise.durationSeconds}s` : reps;
  const weight = exercise.weightKg === null ? "" : ` · ${Math.round(exercise.weightKg * (weightUnit === "lb" ? 2.2046226218 : 1) * 10) / 10} ${weightUnit}`;
  return `${exercise.sets} × ${effort}${weight}`;
}
export function changedExerciseNames(before: CoachingDay, after: CoachingDay) {
  return after.prescription.exercises.filter((item, index) => {
    const previous = before.prescription.exercises[index];
    return !previous || previous.exerciseId !== item.exerciseId || previous.sets !== item.sets || previous.repsMin !== item.repsMin || previous.repsMax !== item.repsMax || previous.weightKg !== item.weightKg || previous.durationSeconds !== item.durationSeconds;
  }).map(item => item.name);
}
// Mutation IDs survive network retries within the screen. They identify an
// operation, never an account or a security credential.
export function mutationId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, letter => {
    const value = Math.floor(Math.random() * 16);
    return (letter === "x" ? value : (value & 3) | 8).toString(16);
  });
}
