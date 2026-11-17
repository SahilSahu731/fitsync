/** Personal reminders use dates in the user's selected IANA timezone. */
export type HabitReminderKind = "meals" | "hydration" | "sleep";
export type ReminderKind = "training" | HabitReminderKind;
export type HabitReminder = { enabled: boolean; time: string };
export const HABIT_REMINDERS: {
  kind: HabitReminderKind;
  label: string;
  time: string;
  body: string;
}[] = [
  {
    kind: "meals",
    label: "Meal planning",
    time: "12:00",
    body: "Take a moment for your meals and the week ahead.",
  },
  {
    kind: "hydration",
    label: "Hydration check-in",
    time: "15:00",
    body: "A moment to check in with your hydration and log what you drank.",
  },
  {
    kind: "sleep",
    label: "Wind down",
    time: "21:00",
    body: "Make a little space to wind down for the night.",
  },
];
export type ReminderPreferences = {
  enabled: boolean;
  time: string;
  days: number[];
  quietStart: string;
  quietEnd: string;
  snoozeMinutes: number;
  timezone: string;
  /** Absent on older records. Each habit is opt-in and runs daily, including rest days. */
  habits?: Partial<Record<HabitReminderKind, HabitReminder>>;
};
export type ReminderSession = { id: string; date: string; title: string; completed?: boolean };
export type PlannedReminder = {
  kind: ReminderKind;
  date: string;
  sessionId: string | null;
  title: string;
  at: number;
};
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
      typeof prefs.enabled === "boolean" &&
      TIME.test(prefs.time) &&
      TIME.test(prefs.quietStart) &&
      TIME.test(prefs.quietEnd) &&
      prefs.days.every((day) => Number.isInteger(day) && day >= 1 && day <= 7) &&
      new Set(prefs.days).size === prefs.days.length &&
      (!prefs.enabled || prefs.days.length > 0) &&
      Object.entries(prefs.habits ?? {}).every(
        ([kind, value]) =>
          HABIT_REMINDERS.some((habit) => habit.kind === kind) &&
          value &&
          typeof value.enabled === "boolean" &&
          TIME.test(value.time),
      ) &&
      Number.isInteger(prefs.snoozeMinutes) &&
      prefs.snoozeMinutes >= 5 &&
      prefs.snoozeMinutes <= 180
    );
  } catch {
    return false;
  }
}
export function reminderKindEnabled(prefs: ReminderPreferences, kind: ReminderKind) {
  return kind === "training" ? prefs.enabled : prefs.habits?.[kind]?.enabled === true;
}
export function anyReminderEnabled(prefs: ReminderPreferences) {
  return prefs.enabled || HABIT_REMINDERS.some((habit) => reminderKindEnabled(prefs, habit.kind));
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
  if (!anyReminderEnabled(prefs) || !validReminderPreferences(prefs))
    return { planned, suppressedByQuietHours };
  const today = reminderDate(now, prefs.timezone);
  const midnight = Date.parse(`${today}T00:00:00Z`);
  const completed = new Set(completedDates);
  // One-off reminders can be cancelled as sessions complete. Never create a
  // repeating notification that keeps firing after a completed workout.
  for (let offset = 0; offset < 14; offset++) {
    const day = new Date(midnight + offset * 86_400_000);
    const date = day.toISOString().slice(0, 10);
    const add = (kind: ReminderKind, time: string, title: string, sessionId: string | null) => {
      const at = reminderWallTime(date, time, prefs.timezone);
      if (at === null || at <= now) return;
      if (inReminderQuietHours(at, prefs)) {
        suppressedByQuietHours++;
        return;
      }
      planned.push({ kind, date, sessionId, title, at });
    };
    for (const habit of HABIT_REMINDERS) {
      const setting = prefs.habits?.[habit.kind];
      if (setting?.enabled) add(habit.kind, setting.time, habit.body, null);
    }
    if (!prefs.enabled || !prefs.days.includes(day.getUTCDay() || 7) || completed.has(date))
      continue;
    const session = sessions.find((item) => item.date === date && !item.completed);
    // Training respects planned rest days; daily habits do not depend on workouts.
    if (sessions.length && !session) continue;
    add("training", prefs.time, session?.title ?? "Your training time", session?.id ?? null);
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
