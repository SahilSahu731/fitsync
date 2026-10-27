import type { FollowedProgram, ProgramSlot } from "./api";

const DAY_MS = 86_400_000;
export function addProgramDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}
export function formatProgramDate(date: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { ...options, timeZone: "UTC" });
}
export type ScheduleDay = {
  date: string; week: number; day: number; label: string; rest: boolean;
  today: boolean; slot: ProgramSlot | null;
};
export function weekDays(detail: FollowedProgram, week: number): ScheduleDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = index + 1;
    const plan = detail.enrollment.weekly_plan.find(item => item.day_number === day);
    const date = addProgramDays(detail.enrollment.start_date, (week - 1) * 7 + index);
    const slot = detail.slots.find(item => item.week === week && item.day === day) ?? null;
    return { date, week, day, label: slot?.routineName ?? plan?.routine_name ?? plan?.label ?? "Recovery day", rest: !slot && (plan?.rest ?? true), today: date === detail.today, slot };
  });
}
export function defaultScheduleDay(detail: FollowedProgram) {
  const difference = Math.floor((Date.parse(detail.today) - Date.parse(detail.enrollment.start_date)) / DAY_MS);
  const offset = Math.max(0, Math.min(detail.enrollment.duration_weeks * 7 - 1, difference));
  if (detail.enrollment.status !== "active") return { week: detail.week, day: 1 };
  return { week: Math.floor(offset / 7) + 1, day: offset % 7 + 1 };
}
export type ProgramFocus = {
  kind: "workout" | "inProgress" | "rest" | "done" | "upcoming" | "catchup" | "completed" | "archived" | "unavailable";
  eyebrow: string; title: string; description: string; slot: ProgramSlot | null;
};
export function programFocus(detail: FollowedProgram): ProgramFocus {
  const { enrollment: e, slots, today } = detail;
  const sorted = [...slots].sort((a, b) => a.date.localeCompare(b.date));
  const pending = sorted.filter(slot => slot.status !== "completed");
  if (e.status === "completed") return { kind: "completed", eyebrow: "PROGRAM COMPLETE", title: "Look how far you’ve come.", description: "Every session is logged. Your progress and workouts are saved here.", slot: null };
  if (e.status !== "active") return { kind: "archived", eyebrow: "SAVED CHAPTER", title: "Your work stays with you.", description: "Browse the days you trained and revisit your workout logs.", slot: null };
  const active = sorted.find(slot => slot.status === "active");
  if (active) return { kind: "inProgress", eyebrow: "WORKOUT IN PROGRESS", title: active.routineName, description: `Week ${active.week} · Day ${active.day}. Pick up where you left off.`, slot: active };
  if (today < e.start_date) return { kind: "upcoming", eyebrow: `STARTS ${formatProgramDate(e.start_date).toUpperCase()}`, title: "Your next chapter is ready.", description: "Take a look at your first workout and get familiar with the week ahead.", slot: pending[0] ?? null };
  const todaySlot = sorted.find(slot => slot.date === today);
  if (todaySlot?.status === "completed") return { kind: "done", eyebrow: "TODAY · LOGGED", title: "Today’s session, done.", description: `${todaySlot.routineName} is in the books. Your progress is up to date.`, slot: todaySlot };
  if (todaySlot) return { kind: "workout", eyebrow: `TODAY · WEEK ${todaySlot.week} / DAY ${todaySlot.day}`, title: todaySlot.routineName, description: "Your plan for today. Start when you’re ready; we’ll take care of the log.", slot: todaySlot };
  const insideSchedule = today <= addProgramDays(e.start_date, e.duration_weeks * 7 - 1);
  if (insideSchedule) {
    const selection = defaultScheduleDay(detail);
    const day = weekDays(detail, selection.week)[selection.day - 1];
    if (!day.rest) return { kind: "unavailable", eyebrow: "TODAY’S PLAN", title: "This session is unavailable.", description: "Refresh your program to try loading the session again.", slot: null };
    const next = pending.find(slot => slot.date > today);
    return { kind: "rest", eyebrow: `TODAY · WEEK ${selection.week} / DAY ${selection.day}`, title: "Recovery is on the plan.", description: next ? `No workout scheduled today. Next up: ${next.routineName}, ${formatProgramDate(next.date)}.` : "No workout scheduled today. Your completed sessions are saved below.", slot: next ?? null };
  }
  return { kind: "catchup", eyebrow: "YOUR PLAN · STILL OPEN", title: "Pick up at your own pace.", description: `${pending.length} ${pending.length === 1 ? "session is" : "sessions are"} still available. Your logged progress stays right here.`, slot: pending[0] ?? null };
}
export function focusAction(focus: ProgramFocus) {
  if (!focus.slot) return null;
  if (focus.kind === "inProgress") return "Resume workout";
  if (focus.kind === "done") return "View workout log";
  if (focus.kind === "rest" || focus.kind === "upcoming") return "Preview next workout";
  return focus.kind === "catchup" ? "Continue your plan" : "Start today’s workout";
}
