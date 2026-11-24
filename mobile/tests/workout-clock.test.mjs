import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { workoutTime } from "../src/features/workouts/session-progress.ts";

function clockFixture(component, props) {
  let now = Date.parse("2026-11-24T10:00:00Z");
  let current;
  let stateUpdates = 0;
  let focus;
  let blur;
  const intervals = new Map();
  const appState = { currentState: "active" };
  const effects = [];
  const exports = {};
  const deps = {
    react: {
      useCallback: (callback) => callback,
      useState(initial) {
        current ??= typeof initial === "function" ? initial() : initial;
        return [
          current,
          (value) => {
            current = value;
            stateUpdates++;
          },
        ];
      },
      useEffect(callback) {
        effects.push(callback);
      },
    },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }) },
    "react-native": { AppState: appState },
    "expo-router": {
      useFocusEffect(callback) {
        focus = callback;
      },
    },
    "@/src/components/ui": { Txt: "Txt" },
    "../session-progress": { workoutTime },
    "./rest-timer": { RestTimer: "RestTimer" },
  };
  const code = ts.transpileModule(
    readFileSync(
      new URL("../src/features/workouts/components/workout-clock.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    Date: class extends Date {
      static now() {
        return now;
      }
    },
    setInterval(callback) {
      const id = intervals.size + 1;
      intervals.set(id, callback);
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
    require(name) {
      assert.ok(name in deps, name);
      return deps[name];
    },
  });
  return {
    appState,
    get stateUpdates() {
      return stateUpdates;
    },
    get intervalCount() {
      return intervals.size;
    },
    render() {
      const result = exports[component](props);
      effects.splice(0).forEach((callback) => callback());
      return result;
    },
    focus() {
      blur = focus();
    },
    blur() {
      blur();
    },
    advance(seconds) {
      now += seconds * 1000;
      intervals.forEach((tick) => tick());
    },
  };
}

test("workout clock refreshes on focus, stops on blur and skips background updates", () => {
  const ui = clockFixture("WorkoutDuration", { startedAt: "2026-11-24T09:59:00Z" });
  assert.equal(ui.render().props.accessibilityLabel, "Workout duration 01:00");
  ui.focus();
  assert.equal(ui.intervalCount, 1);
  ui.advance(5);
  assert.equal(ui.render().props.accessibilityLabel, "Workout duration 01:05");
  ui.appState.currentState = "background";
  const updates = ui.stateUpdates;
  ui.advance(20);
  assert.equal(ui.stateUpdates, updates);
  ui.blur();
  assert.equal(ui.intervalCount, 0);
  ui.appState.currentState = "active";
  ui.focus();
  assert.equal(ui.render().props.accessibilityLabel, "Workout duration 01:25");
  ui.blur();
});

test("rest timer extends from current time and clears an expired rest", () => {
  const calls = [];
  const ui = clockFixture("LiveRestTimer", {
    timer: { endsAt: Date.parse("2026-11-24T10:00:10Z"), duration: 10 },
    onExtend: (seconds) => calls.push(seconds),
    onSkip: () => calls.push("skip"),
  });
  let tree = ui.render();
  ui.focus();
  ui.advance(3);
  tree.props.onExtend();
  assert.deepEqual(calls, [37]);
  assert.equal(ui.render().props.remaining, 7);
  ui.advance(7);
  assert.equal(ui.render(), null);
  assert.deepEqual(calls, [37, "skip"]);
  ui.blur();
});
