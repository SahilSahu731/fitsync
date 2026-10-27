import test from "node:test";
import assert from "node:assert/strict";
import { dateInZone, dayDifference, summarizeProgram } from "../src/modules/program-follow/program.analytics.js";
import { canSendReminder, reminderCopy } from "../src/modules/program-follow/program.reminders.js";

const enrollment = { id: "enrollment", timezone: "Asia/Kolkata", start_date: "2026-10-26", duration_weeks: 2, status: "active", reminder_enabled: true, reminder_hour: 18, reminder_minute: 30, weekly_plan: [{ day_number: 1, rest: false }, { day_number: 2, rest: true }] };
const row = (id: string, date: string, sessions: any[] = []) => ({ id, scheduled_date: date, week_number: date === "2026-11-02" ? 2 : 1, day_number: 1, routine_name: "Full body", template_id: "routine", workout_sessions: sessions });
const session = { id: "workout", status: "completed", finished_at: "2026-10-26T13:30:00Z", elapsed_seconds: 600, workout_session_exercises: [{ workout_logged_sets: [{ weight_kg: "50", reps: 10, completed_at: "2026-10-26T13:29:00Z" }, { weight_kg: 100, reps: 10, completed_at: null }, { weight_kg: null, reps: 8, completed_at: "2026-10-26T13:29:30Z" }] }] };

test("program analytics count finished workouts and completed sets, preserving discarded retries", () => {
  const result = summarizeProgram(enrollment, [row("one", "2026-10-26", [{ ...session, status: "discarded" }, session]), row("two", "2026-11-02")], new Date("2026-10-27T00:00:00Z"));
  assert.equal(result.analytics.completed, 1);
  assert.equal(result.analytics.completedSets, 2);
  assert.equal(result.analytics.volumeKg, 500);
  assert.equal(result.analytics.minutes, 10);
  assert.equal(result.analytics.progressPercent, 50);
  assert.equal(result.analytics.adherencePercent, 100);
  assert.equal(result.analytics.weeks[1].completed, 0);
  assert.equal(result.nextSlot?.id, "two");
  assert.equal(result.todayPlan.rest, true);
});
test("future, active, and overdue sessions do not inflate analytics", () => {
  const future = summarizeProgram(enrollment, [row("one", "2026-10-26", [{ ...session, status: "active" }]), row("two", "2026-11-02")], new Date("2026-10-25T00:00:00Z"));
  assert.equal(future.startsInDays, 1);
  assert.equal(future.todayPlan, null);
  assert.equal(future.analytics.adherencePercent, null);
  assert.equal(future.analytics.completedSets, 0);
  assert.equal(future.analytics.volumeKg, 0);
  const overdue = summarizeProgram(enrollment, [row("one", "2026-10-26"), row("two", "2026-11-02", [{ ...session, status: "active" }])], new Date("2026-11-10T00:00:00Z"));
  assert.equal(overdue.week, 2);
  assert.equal(overdue.todayPlan, null);
  assert.equal(overdue.slots[0].status, "overdue");
  assert.equal(overdue.nextSlot?.id, "two");
});
test("date boundaries and schedule days respect the program timezone and DST", () => {
  assert.equal(dateInZone("Asia/Kolkata", new Date("2026-10-26T20:00:00Z")), "2026-10-27");
  assert.equal(dateInZone("America/Los_Angeles", new Date("2026-10-26T00:00:00Z")), "2026-10-25");
  assert.equal(dayDifference("2026-10-31", "2026-11-02"), 2);
  assert.equal(canSendReminder(enrollment, "2026-10-26", new Date("2026-10-26T12:59:00Z")), false);
  assert.equal(canSendReminder(enrollment, "2026-10-26", new Date("2026-10-26T13:00:00Z")), true);
  assert.equal(canSendReminder(enrollment, "2026-10-26", new Date("2026-10-26T19:01:00Z")), false);
  const dst = { ...enrollment, timezone: "America/New_York", start_date: "2026-10-01", reminder_hour: 1, reminder_minute: 30 };
  assert.equal(canSendReminder(dst, "2026-11-01", new Date("2026-11-01T05:30:00Z")), true);
  assert.equal(canSendReminder(dst, "2026-11-01", new Date("2026-11-01T06:30:00Z")), true); // SQL date uniqueness prevents a second send.
});
test("reminders distinguish workout, active logging, recovery, and missed sessions", () => {
  const today = new Date("2026-10-26T13:00:00Z");
  const scheduled = summarizeProgram(enrollment, [row("one", "2026-10-26")], today);
  assert.match(reminderCopy(scheduled, today)!.body, /Full body/);
  const active = summarizeProgram(enrollment, [row("one", "2026-10-26", [{ ...session, status: "active" }])], today);
  assert.match(reminderCopy(active, today)!.body, /Save your log/);
  const tomorrow = new Date("2026-10-27T13:00:00Z");
  const recovery = summarizeProgram(enrollment, [row("one", "2026-10-26", [session]), row("two", "2026-11-02")], tomorrow);
  assert.match(reminderCopy(recovery, tomorrow)!.body, /recovery|Recharge|breather/i);
  const missed = summarizeProgram(enrollment, [row("one", "2026-10-26")], tomorrow);
  assert.match(reminderCopy(missed, tomorrow)!.body, /unfinished session/);
});
test("reminders are quiet after a workout, before start, after stopping, or when opted out", () => {
  const now = new Date("2026-10-26T14:00:00Z");
  const complete = summarizeProgram(enrollment, [row("one", "2026-10-26", [session])], now);
  assert.equal(reminderCopy(complete, now), null);
  for (const changes of [{ status: "stopped" }, { status: "switched" }, { status: "completed" }, { reminder_enabled: false }, { start_date: "2026-10-27" }]) {
    assert.equal(reminderCopy(summarizeProgram({ ...enrollment, ...changes }, [row("one", "2026-10-26")], now), now), null);
    assert.equal(canSendReminder({ ...enrollment, ...changes }, "2026-10-26", now), false);
  }
});

test("historical adherence stops changing after a switch or stop", () => {
  const stopped = { ...enrollment, status: "switched", ended_at: "2026-10-26T14:00:00Z" };
  const result = summarizeProgram(stopped, [row("one", "2026-10-26", [session]), row("two", "2026-11-02")], new Date("2026-12-01T00:00:00Z"));
  assert.equal(result.analytics.due, 1);
  assert.equal(result.analytics.adherencePercent, 100);
  assert.equal(result.analytics.progressPercent, 50);
  assert.equal(result.week, 1);
});
