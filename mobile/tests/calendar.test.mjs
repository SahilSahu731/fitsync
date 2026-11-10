import test from "node:test";
import assert from "node:assert/strict";
import { buildAgenda, calendarEvent, monthGrid, shiftMonth } from "../src/features/calendar/model.ts";
import { localDate } from "../src/features/progress/model.ts";

const workout = { id: "actual-1", name: "Upper body", status: "completed", started_at: "2026-11-10T08:00:00", finished_at: "2026-11-10T08:45:00", elapsed_seconds: 2700, workout_session_exercises: [] };
const slot = { id: "slot-1", templateId: "routine-1", routineName: "Upper body", week: 1, day: 2, date: "2026-11-10", status: "completed", sessionId: "actual-1", completedAt: "2026-11-10T08:45:00", completedSets: 10, volumeKg: 2000, durationSeconds: 2700 };
const coachDay = { id: "coach-1", week: 1, day: 2, date: "2026-11-10", name: "Coaching day", status: "completed", revision: 1, workoutId: "actual-1", prescription: { minutes: 45, equipment: "gym", effort: "normal", explanation: [], exercises: [] } };

test("calendar grids start on Monday, handle leap days, and keep dates unique", () => {
  const days = monthGrid("2028-02");
  assert.equal(days.length, 42);
  assert.equal(days[0].date, "2028-01-31");
  assert.equal(days.filter(day => day.inMonth).length, 29);
  assert.equal(new Set(days.map(day => day.date)).size, 42);
  assert.equal(monthGrid("2026-02").filter(day => day.inMonth).length, 28);
  assert.equal(monthGrid("2026-11")[0].date, "2026-10-26");
});
test("month navigation crosses year boundaries without day overflow", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-01", 1), "2026-02");
});
test("a completed workout linked to both a program and coaching counts once", () => {
  const items = buildAgenda([workout, workout], [slot], [coachDay]);
  assert.equal(items.length, 1);
  assert.equal(items[0].source, "workout");
  assert.equal(items[0].minutes, 45);
  assert.equal(items[0].date, localDate(new Date(workout.started_at)));
});
test("planned days and completed slots without a downloaded workout remain visible", () => {
  const items = buildAgenda([{ ...workout, status: "active" }], [{ ...slot, status: "planned", sessionId: null }, { ...slot, id: "done", sessionId: "other-actual" }], [{ ...coachDay, id: "next-coach", workoutId: null, status: "planned", date: "2026-11-12" }]);
  assert.equal(items.length, 3);
  assert.equal(items.filter(item => item.status === "completed").length, 1);
  assert.equal(items.filter(item => item.status === "planned").length, 2);
});
test("calendar export uses the selected local date and a bounded duration", () => {
  const event = calendarEvent("2026-11-10", "My session", 30);
  assert.equal(localDate(event.startDate), "2026-11-10");
  assert.equal(event.startDate.getHours(), 18);
  assert.equal(event.endDate - event.startDate, 30 * 60_000);
  assert.equal(calendarEvent("2026-11-10", "Session", NaN).endDate - event.startDate, 45 * 60_000);
  assert.throws(() => calendarEvent("2026-02-30", "Invalid"), /valid calendar date/);
  assert.throws(() => calendarEvent("not-a-date", "Invalid"), /valid calendar date/);
});
