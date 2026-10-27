import type { FollowedProgram, ProgramSlot } from "./api";
import { addProgramDays } from "./program-view";

export function dateInProgramZone(timestamp: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(timestamp));
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function percentChange(previous: number, current: number) {
  return previous > 0 ? Math.round((current - previous) / previous * 100) : null;
}
const sum = (slots: ProgramSlot[], field: "completedSets" | "volumeKg" | "durationSeconds") => slots.reduce((total, slot) => total + slot[field], 0);
export function basicProgress(detail: FollowedProgram) {
  const done = detail.slots.filter(slot => slot.status === "completed");
  const milestone = [1, 5, 10, 20, 30, 50, 75, 100].find(value => value > done.length && value < detail.analytics.planned) ?? detail.analytics.planned;
  return {
    done,
    milestone,
    toMilestone: Math.max(0, milestone - done.length),
    averageMinutes: done.length ? Math.round(sum(done, "durationSeconds") / done.length / 60) : null,
    recent: [...done].sort((a, b) => (b.completedAt ?? b.date).localeCompare(a.completedAt ?? a.date)).slice(0, 3),
  };
}
export function buildProgramInsights(detail: FollowedProgram) {
  const { enrollment: e } = detail;
  const asOf = e.status !== "active" && e.ended_at ? dateInProgramZone(e.ended_at, e.timezone) : detail.today;
  const done = detail.slots.filter(slot => slot.status === "completed");
  const weeks = Array.from({ length: e.duration_weeks }, (_, index) => {
    const slots = detail.slots.filter(slot => slot.week === index + 1);
    const logged = slots.filter(slot => slot.status === "completed");
    const startDate = addProgramDays(e.start_date, index * 7);
    const endDate = addProgramDays(startDate, 6);
    return { week: index + 1, startDate, endDate, completePeriod: endDate < asOf,
      planned: slots.length, workouts: logged.length, sets: sum(logged, "completedSets"), volumeKg: sum(logged, "volumeKg"), minutes: Math.round(sum(logged, "durationSeconds") / 60) };
  });
  const fullWeeks = weeks.filter(week => week.completePeriod);
  const latest = fullWeeks.at(-1);
  const previous = fullWeeks.at(-2);
  const comparison = latest && previous ? {
    latest, previous,
    volumeChange: percentChange(previous.volumeKg, latest.volumeKg),
    setsChange: percentChange(previous.sets, latest.sets),
    minutesChange: percentChange(previous.minutes, latest.minutes),
    workoutDifference: latest.workouts - previous.workouts,
  } : null;
  const due = detail.slots.filter(slot => slot.date <= asOf).sort((a, b) => a.date.localeCompare(b.date));
  const loggedDue = due.filter(slot => slot.status === "completed");
  // Convert each completion once, not once for every calendar cell.
  const completionDates = new Map(done.filter(slot => slot.completedAt).map(slot => [slot.id, dateInProgramZone(slot.completedAt!, e.timezone)]));
  const workoutsByDate = new Map<string, number>();
  for (const date of completionDates.values()) workoutsByDate.set(date, (workoutsByDate.get(date) ?? 0) + 1);
  const onTime = loggedDue.filter(slot => { const date = completionDates.get(slot.id); return date !== undefined && date <= slot.date; });
  let run = 0; let bestRun = 0;
  for (const slot of due) { run = slot.status === "completed" ? run + 1 : 0; bestRun = Math.max(bestRun, run); }
  const activity = Array.from({ length: 28 }, (_, index) => {
    const date = addProgramDays(asOf, index - 27);
    const workouts = workoutsByDate.get(date) ?? 0;
    return { date, workouts, beforeStart: date < e.start_date };
  });
  const routines = new Map<string, ProgramSlot[]>();
  for (const slot of done) {
    // Do not merge deleted templates solely because they have the same name.
    const key = slot.templateId ?? slot.id;
    routines.set(key, [...(routines.get(key) ?? []), slot]);
  }
  const routineTrends = [...routines.entries()].map(([id, sessions]) => {
    const ordered = [...sessions].sort((a, b) => (a.completedAt ?? a.date).localeCompare(b.completedAt ?? b.date));
    const first = ordered[0]; const last = ordered[ordered.length - 1];
    return { id, name: last.routineName, sessions: ordered.length, first, last,
      volumeChange: ordered.length > 1 ? percentChange(first.volumeKg, last.volumeKg) : null,
      averageMinutes: Math.round(sum(ordered, "durationSeconds") / ordered.length / 60),
      totalSets: sum(ordered, "completedSets"), totalVolumeKg: sum(ordered, "volumeKg") };
  }).sort((a, b) => b.sessions - a.sessions);
  return {
    asOf, weeks, comparison, due: due.length, loggedDue: loggedDue.length,
    adherence: due.length ? Math.round(loggedDue.length / due.length * 100) : null,
    onTime: onTime.length, onTimePercent: loggedDue.length ? Math.round(onTime.length / loggedDue.length * 100) : null,
    bestRun, activity, activeDays: activity.filter(day => day.workouts > 0).length,
    routineTrends,
  };
}
