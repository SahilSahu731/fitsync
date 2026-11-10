import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source = fs.readFileSync(new URL("../src/features/calendar/native.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function runtime({ native = true, action = "done", platform = "android" } = {}) {
  const calls = [];
  const exports = {};
  vm.runInNewContext(output, { exports, require(name) {
    if (name === "react-native") return { Platform: { OS: platform } };
    if (name === "expo") return { requireOptionalNativeModule: () => native ? {} : null };
    if (name === "./model") return { calendarEvent: (date, title) => ({ date, title }) };
    if (name === "expo-calendar/legacy") { calls.push("load"); return { createEventInCalendarAsync: async event => { calls.push(event); return { action }; } }; }
    throw new Error(name);
  } });
  return { api: exports, calls };
}
test("old native builds receive a rebuild message before importing the calendar", async () => {
  const { api, calls } = runtime({ native: false });
  await assert.rejects(api.openTrainingCalendar("2026-11-10", "Training"), /new FitSync development build/);
  assert.deepEqual(calls, []);
});
test("closing an Android calendar form never claims that an event was saved", async () => {
  const { api } = runtime({ action: "done" });
  assert.equal(await api.openTrainingCalendar("2026-11-10", "Training"), "closed");
  assert.equal(await runtime({ action: "saved", platform: "ios" }).api.openTrainingCalendar("2026-11-10", "Training"), "saved");
  assert.equal(await runtime({ action: "canceled", platform: "ios" }).api.openTrainingCalendar("2026-11-10", "Training"), "cancelled");
});
