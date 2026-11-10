import type { ProgressWorkout } from "../progress/model";
import { addDays, localDate } from "../progress/model";
import type { ProgramSlot } from "../program-follow/api";
import type { CoachingDay } from "../coaching/api";

export function shiftMonth(month: string, direction: number) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, number - 1 + direction, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function monthGrid(month: string) {
  const first = `${month}-01`;
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  const start = addDays(first, -((weekday + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return { date, inMonth: date.startsWith(month), day: Number(date.slice(-2)) };
  });
}
export type AgendaItem = {
  id: string; date: string; name: string;
  status: "planned" | "active" | "completed" | "overdue";
  source: "workout" | "program" | "coach";
  workoutId: string | null; minutes: number | null;
};
export function buildAgenda(workouts: ProgressWorkout[], slots: ProgramSlot[], coaching: CoachingDay[]) {
  const items: AgendaItem[] = [];
  const seen = new Set<string>();
  for (const workout of workouts) {
    if (workout.status !== "completed" || seen.has(workout.id)) continue;
    const date = new Date(workout.started_at);
    if (!Number.isFinite(date.getTime())) continue;
    seen.add(workout.id);
    items.push({ id: `workout:${workout.id}`, date: localDate(date), name: workout.name, status: "completed", source: "workout", workoutId: workout.id, minutes: workout.elapsed_seconds === null ? null : Math.round(workout.elapsed_seconds / 60) });
  }
  for (const slot of slots) {
    if (slot.sessionId && seen.has(slot.sessionId)) continue;
    if (slot.sessionId) seen.add(slot.sessionId);
    items.push({ id: `program:${slot.id}`, date: slot.date, name: slot.routineName, status: slot.status, source: "program", workoutId: slot.sessionId, minutes: slot.status === "completed" ? Math.round(slot.durationSeconds / 60) : null });
  }
  for (const session of coaching) {
    if (session.workoutId && seen.has(session.workoutId)) continue;
    if (session.workoutId) seen.add(session.workoutId);
    items.push({ id: `coach:${session.id}`, date: session.date, name: session.name, status: session.status, source: "coach", workoutId: session.workoutId, minutes: session.prescription.minutes });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
export function calendarEvent(date: string, title: string, duration = 45) {
  const startDate = new Date(`${date}T18:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(startDate.getTime()) || localDate(startDate) !== date) throw new Error("Choose a valid calendar date.");
  const minutes = Number.isFinite(duration) && duration > 0 ? Math.min(duration, 1440) : 45;
  return { title, startDate, endDate: new Date(startDate.getTime() + minutes * 60_000), notes: "Training time with FitSync. Open FitSync to start your session. Adjust the time and reminders before saving." };
}
