/** Personal reminders use dates in the user's selected IANA timezone. */
export type ReminderPreferences = {
  enabled: boolean;
  time: string;
  days: number[];
  quietStart: string;
  quietEnd: string;
  snoozeMinutes: number;
  timezone: string;
};
export type ReminderSession = { id: string; date: string; title: string; completed?: boolean };
export type PlannedReminder = { date: string; sessionId: string | null; title: string; at: number };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parts(at: number, timezone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}
export function reminderDate(at: number, timezone: string) {
  return parts(at, timezone).date;
}
export function validReminderPreferences(prefs: ReminderPreferences) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: prefs.timezone }).format();
    return (
      TIME.test(prefs.time) &&
      TIME.test(prefs.quietStart) &&
      TIME.test(prefs.quietEnd) &&
      prefs.days.every((day) => Number.isInteger(day) && day >= 1 && day <= 7) &&
      Number.isInteger(prefs.snoozeMinutes) &&
      prefs.snoozeMinutes >= 5 &&
      prefs.snoozeMinutes <= 180
    );
  } catch {
    return false;
  }
}
function minutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}
export function inReminderQuietHours(at: number, prefs: ReminderPreferences) {
  const time = minutes(parts(at, prefs.timezone).time);
  const start = minutes(prefs.quietStart),
    end = minutes(prefs.quietEnd);
  if (start === end) return false;
  return start < end ? time >= start && time < end : time >= start || time < end;
}
/** Resolves wall time across offsets. Nonexistent DST wall times are skipped. */
export function reminderWallTime(date: string, time: string, timezone: string): number | null {
  if (!DATE.test(date) || !TIME.test(time)) return null;
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(wall)) return null;
  let candidate = wall;
  for (let count = 0; count < 4; count++) {
    const formatted = parts(candidate, timezone);
    const represented = Date.parse(`${formatted.date}T${formatted.time}:00Z`);
    const difference = wall - represented;
    if (!difference) return candidate;
    candidate += difference;
  }
  return null;
}
export function planCompanionReminders(input: {
  prefs: ReminderPreferences;
  sessions: ReminderSession[];
  completedDates: string[];
  now?: number;
}) {
  const { prefs, sessions, completedDates, now = Date.now() } = input;
  const planned: PlannedReminder[] = [];
  let suppressedByQuietHours = 0;
  if (!prefs.enabled || !validReminderPreferences(prefs))
    return { planned, suppressedByQuietHours };
  const today = reminderDate(now, prefs.timezone);
  const midnight = Date.parse(`${today}T00:00:00Z`);
  const completed = new Set(completedDates);
  // One-off reminders can be cancelled as sessions complete. Never create a
  // repeating notification that keeps firing after a completed workout.
  for (let offset = 0; offset < 14; offset++) {
    const day = new Date(midnight + offset * 86_400_000);
    const date = day.toISOString().slice(0, 10);
    if (!prefs.days.includes(day.getUTCDay() || 7) || completed.has(date)) continue;
    const allToday = sessions.filter((session) => session.date === date);
    const session = allToday.find((item) => !item.completed);
    // A supplied plan's rest days remain rest days. With no plan, selected
    // weekdays are user-directed workout reminders.
    if (sessions.length && !session) continue;
    const at = reminderWallTime(date, prefs.time, prefs.timezone);
    if (at === null || at <= now) continue;
    if (inReminderQuietHours(at, prefs)) {
      suppressedByQuietHours++;
      continue;
    }
    planned.push({
      date,
      sessionId: session?.id ?? null,
      title: session?.title ?? "Your training time",
      at,
    });
  }
  return { planned, suppressedByQuietHours };
}
export function reminderSnoozeAt(now: number, prefs: ReminderPreferences): number | null {
  if (!validReminderPreferences(prefs)) return null;
  let at = now + prefs.snoozeMinutes * 60_000;
  // Snooze respects quiet hours too, including windows spanning midnight.
  for (let count = 0; count < 1440; count++, at += 60_000)
    if (!inReminderQuietHours(at, prefs)) return at;
  return null;
}
