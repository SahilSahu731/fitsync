import { addDays, localDate } from "../progress/model";
import type { HomeSnapshot } from "./model";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekInsight(snapshot: HomeSnapshot, today: string, target: number | null) {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const weekStart = addDays(today, -((weekday + 6) % 7));
  const previousStart = addDays(weekStart, -7);
  const previousEnd = addDays(today, -7);
  let current = 0;
  let previous = 0;

  for (const workout of snapshot.completed) {
    if (workout.status !== "completed" || !workout.finished_at) continue;
    const finished = new Date(workout.finished_at);
    if (!Number.isFinite(finished.valueOf())) continue;
    const date = localDate(finished);
    if (date >= weekStart && date <= today) current += 1;
    if (date >= previousStart && date <= previousEnd) previous += 1;
  }

  if (previous > 0) {
    const range = weekday === 1 ? "Monday" : `Mon–${WEEKDAYS[weekday]}`;
    const difference = current - previous;
    if (difference === 0) {
      return {
        icon: "minus" as const,
        text: `Same as ${range} last week: ${current} ${current === 1 ? "session" : "sessions"}.`,
      };
    }
    const amount = Math.abs(difference);
    return {
      icon: difference > 0 ? ("trending-up" as const) : ("trending-down" as const),
      text: `${amount} ${difference > 0 ? "more" : "fewer"} ${amount === 1 ? "session" : "sessions"} than ${range} last week.`,
    };
  }

  // No prior recordings do not establish a baseline for a growth claim.
  if (target != null && Number.isFinite(target) && target > 0) {
    const remaining = Math.max(0, target - current);
    return {
      icon: "bullseye-arrow" as const,
      text:
        remaining > 0
          ? `${remaining} ${remaining === 1 ? "session" : "sessions"} to your weekly goal.`
          : `Weekly goal met with ${current} recorded ${current === 1 ? "session" : "sessions"}.`,
    };
  }

  return {
    icon: "calendar-check-outline" as const,
    text:
      current > 0
        ? `${current} ${current === 1 ? "session" : "sessions"} recorded so far this week.`
        : "Log a session to build this week's rhythm.",
  };
}
