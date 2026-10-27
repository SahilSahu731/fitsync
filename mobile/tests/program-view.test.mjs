import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/features/program-follow/program-view.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const view = {};
vm.runInNewContext(output, { exports: view, Date, Intl });
const slot = (id, date, status = "planned", extra = {}) => ({ id, date, status, routineName: id, templateId: "routine", week: 1, day: Number(date.slice(-2)) - 25, ...extra });
function detail(slots = []) {
  return { today: "2026-10-28", week: 1, enrollment: { start_date: "2026-10-26", duration_weeks: 2, status: "active", weekly_plan: Array.from({ length: 7 }, (_, index) => ({ day_number: index + 1, rest: ![0, 2, 4].includes(index), label: "Recovery day" })) }, slots };
}
test("today's workout takes priority over unfinished earlier sessions", () => {
  const result = view.programFocus(detail([slot("Old session", "2026-10-26", "overdue"), slot("Today", "2026-10-28")]));
  assert.equal(result.kind, "workout"); assert.equal(result.slot.id, "Today");
  assert.equal(view.focusAction(result), "Start today’s workout");
});
test("an already running session takes priority without being labelled today's plan", () => {
  const result = view.programFocus(detail([slot("Old session", "2026-10-26", "active"), slot("Today", "2026-10-28")]));
  assert.equal(result.kind, "inProgress"); assert.equal(result.slot.id, "Old session");
  assert.equal(view.focusAction(result), "Resume workout");
});
test("recovery day previews the next future workout, not an overdue session", () => {
  const input = detail([slot("Old", "2026-10-26", "overdue"), slot("Next", "2026-10-28")]); input.today = "2026-10-27";
  const result = view.programFocus(input);
  assert.equal(result.kind, "rest"); assert.equal(result.slot.id, "Next");
  assert.equal(view.focusAction(result), "Preview next workout");
});
test("a logged day opens its log and never prompts the same workout again", () => {
  const result = view.programFocus(detail([slot("Logged", "2026-10-28", "completed", { sessionId: "log" })]));
  assert.equal(result.kind, "done"); assert.equal(view.focusAction(result), "View workout log");
});
test("future programs preview, ended schedules offer catch-up, and archived programs do not start sessions", () => {
  const input = detail([slot("First", "2026-10-26")]); input.today = "2026-10-25";
  assert.equal(view.programFocus(input).kind, "upcoming");
  assert.equal(view.focusAction(view.programFocus(input)), "Preview next workout");
  input.today = "2026-11-20";
  assert.equal(view.programFocus(input).kind, "catchup");
  input.enrollment.status = "stopped";
  assert.equal(view.programFocus(input).kind, "archived"); assert.equal(view.programFocus(input).slot, null);
  input.enrollment.status = "completed";
  assert.equal(view.programFocus(input).kind, "completed");
});
test("calendar spans months and DST without depending on the phone timezone", () => {
  assert.equal(view.addProgramDays("2026-10-26", 7), "2026-11-02");
  assert.equal(view.addProgramDays("2026-03-07", 2), "2026-03-09");
  const input = detail(); input.today = "2026-11-02";
  assert.equal(view.defaultScheduleDay(input).week, 2); assert.equal(view.defaultScheduleDay(input).day, 1);
  const days = view.weekDays(input, 2);
  assert.equal(days.length, 7); assert.equal(days[0].date, "2026-11-02"); assert.equal(days[0].today, true);
  assert.equal(days[6].date, "2026-11-08");
});
test("missing workout data is not disguised as a recovery day", () => {
  const input = detail();
  assert.equal(view.weekDays(input, 1)[2].rest, false);
  assert.equal(view.programFocus(input).kind, "unavailable");
});
