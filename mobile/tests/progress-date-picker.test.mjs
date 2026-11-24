import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

process.env.TZ = "Asia/Kolkata";
const jsx = (type, props) => ({ type, props: props ?? {} });
function load(file, dependencies = {}) {
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  vm.runInNewContext(outputText, {
    exports,
    Date,
    Intl,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}
const model = load("../src/features/progress/model.ts");
const calendar = load("../src/features/calendar/model.ts", { "../progress/model": model });
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== "object") return [];
  return [node, ...nodes(node.props?.children), ...nodes(node.props?.footer)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (node && typeof node === "object") return text(node.props?.children);
  return String(node ?? "");
}
function dayLabel(date) {
  return `Select ${model.dateLabel(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`;
}
function harness({ date = "2026-11-17", today = "2026-11-17", loggedDates = new Set() } = {}) {
  const state = [];
  let cursor = 0;
  const selected = [];
  let closed = 0;
  const { CheckInDatePicker } = load("../src/features/progress/date-picker.tsx", {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in state)) state[index] = typeof initial === "function" ? initial() : initial;
        return [
          state[index],
          (next) => {
            state[index] = typeof next === "function" ? next(state[index]) : next;
          },
        ];
      },
      useMemo: (factory) => factory(),
    },
    "react-native": { View: "View" },
    "@/src/components/motion": { MotionPressable: "Pressable" },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/constants/theme": {
      C: { ink: "#FFFFFF", bg: "#000000", panel: "#111111", muted: "#A3A3A3", brand: "#C5F460" },
    },
    "./editors": { Sheet: "Sheet" },
    "./visuals": { Icon: "Icon" },
    "./model": model,
    "../calendar/model": calendar,
  });
  const props = {
    date,
    today,
    loggedDates,
    onSelect: (date) => selected.push(date),
    onClose: () => closed++,
  };
  const h = {
    selected,
    get closed() {
      return closed;
    },
    render() {
      cursor = 0;
      return CheckInDatePicker(props);
    },
    find(label) {
      const control = nodes(h.render()).find((node) => node.props.accessibilityLabel === label);
      assert.ok(control, `Missing control: ${label}`);
      return control;
    },
    press(label) {
      h.find(label).props.onPress();
    },
    selectDay(date) {
      h.press(dayLabel(date));
    },
    day(date) {
      return h.find(dayLabel(date));
    },
  };
  return h;
}

test("the date drawer renders a Monday-first calendar and commits only after confirmation", () => {
  const h = harness();
  const tree = h.render();
  const days = nodes(tree).filter((node) => node.props.accessibilityLabel?.startsWith("Select "));
  assert.equal(days.length, 42);
  assert.equal(days[0].props.accessibilityLabel, dayLabel("2026-10-26"));
  assert.equal(h.day("2026-11-17").props.accessibilityState.selected, true);
  h.selectDay("2026-11-12");
  assert.equal(h.day("2026-11-12").props.accessibilityState.selected, true);
  assert.equal(h.day("2026-11-17").props.accessibilityState.selected, false);
  assert.deepEqual(h.selected, []);
  h.press("Open selected day");
  assert.deepEqual(h.selected, ["2026-11-12"]);
});

test("closing the date drawer discards the draft selection", () => {
  const h = harness();
  h.selectDay("2026-11-10");
  const sheet = nodes(h.render()).find((node) => node.type === "Sheet");
  sheet.props.onClose();
  assert.equal(h.closed, 1);
  assert.deepEqual(h.selected, []);
});

test("future days and future month navigation remain guarded when callbacks are invoked directly", () => {
  const h = harness();
  const future = h.day("2026-11-18");
  assert.equal(future.props.disabled, true);
  assert.equal(future.props.accessibilityState.disabled, true);
  future.props.onPress();
  const next = h.find("Next month");
  assert.equal(next.props.disabled, true);
  next.props.onPress();
  assert.ok(
    text(h.render()).includes(model.dateLabel("2026-11-01", { month: "long", year: "numeric" })),
  );
  h.press("Open selected day");
  assert.deepEqual(h.selected, ["2026-11-17"]);
});

test("month browsing handles year boundaries and selecting an adjacent-month day", () => {
  const h = harness({ date: "2026-01-15", today: "2026-11-17" });
  h.press("Previous month");
  assert.ok(
    text(h.render()).includes(model.dateLabel("2025-12-01", { month: "long", year: "numeric" })),
  );
  h.press("Next month");
  assert.ok(
    text(h.render()).includes(model.dateLabel("2026-01-01", { month: "long", year: "numeric" })),
  );
  h.selectDay("2025-12-31");
  assert.ok(
    text(h.render()).includes(model.dateLabel("2025-12-01", { month: "long", year: "numeric" })),
  );
  h.press("Open selected day");
  assert.deepEqual(h.selected, ["2025-12-31"]);
});

test("leap-day selection preserves the exact ISO date in a timezone ahead of UTC", () => {
  assert.equal(new Date(2028, 1, 29, 0, 0).toISOString().slice(0, 10), "2028-02-28");
  const h = harness({ date: "2028-02-10", today: "2028-03-02" });
  h.selectDay("2028-02-29");
  h.press("Open selected day");
  assert.deepEqual(h.selected, ["2028-02-29"]);
});

test("today and yesterday shortcuts bring the selected month into view", () => {
  const h = harness({ date: "2025-12-31", today: "2026-01-01" });
  h.press("Jump to today");
  assert.equal(h.day("2026-01-01").props.accessibilityState.selected, true);
  assert.ok(
    text(h.render()).includes(model.dateLabel("2026-01-01", { month: "long", year: "numeric" })),
  );
  h.press("Jump to yesterday");
  assert.equal(h.day("2025-12-31").props.accessibilityState.selected, true);
  assert.ok(
    text(h.render()).includes(model.dateLabel("2025-12-01", { month: "long", year: "numeric" })),
  );
  h.press("Open selected day");
  assert.deepEqual(h.selected, ["2025-12-31"]);
});

test("recorded-day indicators expose their meaning to assistive technology", () => {
  const h = harness({ loggedDates: new Set(["2026-11-10"]) });
  assert.equal(h.day("2026-11-10").props.accessibilityHint, "Has saved check-ins or workouts.");
  assert.notEqual(h.day("2026-11-11").props.accessibilityHint, "Has saved check-ins or workouts.");
});
