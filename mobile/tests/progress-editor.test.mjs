import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise calendar dates in the app's local timezone, rather than accidentally
// accepting a UTC-only native date conversion.
process.env.TZ = "Asia/Kolkata";
const NOW = "2026-11-17T07:30:00.000Z";
class TestDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [NOW]));
  }
  static now() {
    return Date.parse(NOW);
  }
}

function load(file, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    Date: TestDate,
    Error,
    Intl,
    require(name) {
      if (!(name in dependencies)) throw Error(`Unmocked dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

const model = load("../src/features/progress/model.ts");
const TODAY = model.localDate();
const YESTERDAY = model.addDays(TODAY, -1);
const flush = () => new Promise((resolve) => setImmediate(resolve));
function nodes(tree) {
  return Array.isArray(tree)
    ? tree.flatMap(nodes)
    : tree && typeof tree === "object"
      ? [tree, ...nodes(tree.children)]
      : [];
}
function text(tree) {
  return Array.isArray(tree)
    ? tree.map(text).join(" ")
    : tree && typeof tree === "object"
      ? text(tree.children)
      : String(tree ?? "");
}
function entry(metric, value, date = TODAY, notes = "") {
  return {
    id: `${metric}-${date}`,
    kind: "metric",
    metric,
    date,
    value,
    notes,
    source: "manual",
    observedAt: `${date}T12:00:00Z`,
  };
}

function harness({
  metric = "weight",
  date = TODAY,
  unit = "kg",
  events = [],
  save,
  keyboardOpen = false,
  startWithPicker = false,
} = {}) {
  const hooks = [];
  let cursor = 0;
  const saved = [];
  const picker = [];
  let closed = 0;
  let keyboardDismissals = 0;
  const createElement = (type, props, ...children) => {
    const nextProps = { ...(props ?? {}), children: children.length ? children : props?.children };
    return typeof type === "function"
      ? type(nextProps)
      : { type, props: nextProps, children: nextProps.children };
  };
  const react = {
    Fragment: "Fragment",
    createElement,
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [
        hooks[index],
        (next) => {
          hooks[index] = typeof next === "function" ? next(hooks[index]) : next;
        },
      ];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = { current: initial };
      return hooks[index];
    },
    useMemo: (factory) => factory(),
  };
  const runtime = {
    Fragment: "Fragment",
    jsx: (type, props) => createElement(type, props),
    jsxs: (type, props) => createElement(type, props),
  };
  const { MetricEditor } = load("../src/features/progress/editors.tsx", {
    react,
    "react/jsx-runtime": runtime,
    "react-native": {
      ActivityIndicator: "Loading",
      KeyboardAvoidingView: "KeyboardAvoidingView",
      Modal: "Modal",
      Platform: { OS: "android" },
      ScrollView: "ScrollView",
      TextInput: "TextInput",
      View: "View",
      Keyboard: { dismiss: () => keyboardDismissals++ },
    },
    "react-native-safe-area-context": {
      useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 28, left: 0 }),
    },
    "@react-native-community/datetimepicker": {
      __esModule: true,
      default: "DateTimePicker",
      DateTimePickerAndroid: { open: (options) => picker.push(options), dismiss() {} },
    },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/motion": { MotionPressable: "Button" },
    "@/src/components/ui": { Txt: "Text" },
    "@/src/constants/theme": {
      C: { ink: "#FFFFFF", bg: "#000000", panel: "#111111", muted: "#A3A3A3", brand: "#C5F460" },
    },
    "./model": model,
    "./keyboard-visibility": {
      useKeyboardForm: () => ({ bottomInset: 0, keyboardOpen }),
    },
  });
  const props = {
    initialMetric: metric,
    startWithPicker,
    date,
    unit,
    events,
    onClose: () => closed++,
    async onSave(...args) {
      saved.push(args);
      await save?.(...args);
    },
  };
  const h = {
    saved,
    picker,
    get closed() {
      return closed;
    },
    get keyboardDismissals() {
      return keyboardDismissals;
    },
    render() {
      cursor = 0;
      return nodes(MetricEditor(props));
    },
    find(label) {
      const control = h.render().find((node) => node.props.accessibilityLabel === label);
      assert.ok(control, `Missing control: ${label}`);
      return control;
    },
    press(label) {
      h.find(label).props.onPress();
    },
    input(label, value) {
      h.find(label).props.onChangeText(value);
    },
    select(nextMetric) {
      const label = `Select ${model.METRICS[nextMetric].label}`;
      if (!h.render().some((node) => node.props.accessibilityLabel === label)) {
        h.press("Change tracking metric");
      }
      if (!h.render().some((node) => node.props.accessibilityLabel === label)) {
        const group = Object.values(model.METRIC_GROUPS).find((item) =>
          item.metrics.includes(nextMetric),
        );
        h.press(`Choose ${group.label} metrics`);
      }
      h.press(label);
    },
    note(value) {
      if (!h.render().some((node) => node.props.accessibilityLabel === "Check-in notes")) {
        h.press("Add a note");
      }
      h.input("Check-in notes", value);
    },
    alert() {
      return h
        .render()
        .filter((node) => node.props.accessibilityRole === "alert")
        .map(text)
        .join(" ");
    },
  };
  return h;
}

test("quick check-ins can open the metric picker and save the selected metric in one editor", async () => {
  const h = harness({ startWithPicker: true });
  assert.ok(h.find("Search tracking metrics"));
  assert.equal(
    h.render().some((node) => node.props.accessibilityLabel === "Body weight in kg"),
    false,
  );
  h.press("Choose Activity metrics");
  h.press("Select Steps");
  h.input("Steps in steps", "4321");
  h.press("Save check-in");
  await flush();
  assert.deepEqual(h.saved, [["steps", TODAY, 4321, ""]]);
  assert.equal(h.closed, 1);
});

test("weight logs display pounds but save kilograms with trimmed notes", async () => {
  const h = harness({ unit: "lb", events: [entry("weight", 80, TODAY, "Morning")] });
  assert.equal(Number(h.find("Body weight in lb").props.value), 176.37);
  h.input("Body weight in lb", "180");
  h.note("  After waking  ");
  h.press("Save check-in");
  await flush();
  assert.equal(h.saved.length, 1);
  assert.equal(h.saved[0][0], "weight");
  assert.equal(h.saved[0][1], TODAY);
  assert.ok(Math.abs(h.saved[0][2] - model.weightKg(180, "lb")) < 0.00001);
  assert.equal(h.saved[0][3], "After waking");
  assert.equal(h.closed, 1);
});

test("existing zero remains editable and a zero daily total saves as zero, not null", async () => {
  const h = harness({ metric: "steps", events: [entry("steps", 0, TODAY, "Rest day")] });
  assert.equal(h.find("Steps in steps").props.value, "0");
  assert.ok(h.find("Clear this day’s value"));
  h.press("Save check-in");
  await flush();
  assert.deepEqual(h.saved[0], ["steps", TODAY, 0, "Rest day"]);
});

test("the latest correction wins and a cleared metric is presented as an empty new entry", () => {
  const old = { ...entry("water", 500), id: "old", observedAt: `${TODAY}T01:00:00Z` };
  const correction = { ...entry("water", 750), id: "correction", observedAt: `${TODAY}T02:00:00Z` };
  const tombstone = { ...entry("water", null), id: "clear", observedAt: `${TODAY}T03:00:00Z` };
  const corrected = harness({ metric: "water", events: [correction, old] });
  assert.equal(corrected.find("Water in ml").props.value, "750");
  const cleared = harness({ metric: "water", events: [tombstone, old, correction] });
  assert.equal(cleared.find("Water in ml").props.value, "");
  assert.equal(
    cleared.render().some((node) => node.props.accessibilityLabel === "Clear this day’s value"),
    false,
  );
});

test("switching metrics and dates keeps independent unsaved values and notes", () => {
  const h = harness();
  h.input("Body weight in kg", "78.5");
  h.note("Morning draft");
  h.select("water");
  h.input("Water in ml", "900");
  h.note("Bottle draft");
  h.select("weight");
  assert.equal(h.find("Body weight in kg").props.value, "78.5");
  assert.equal(h.find("Check-in notes").props.value, "Morning draft");
  h.press("Log for yesterday");
  h.input("Body weight in kg", "79");
  h.note("Yesterday draft");
  h.press("Log for today");
  assert.equal(h.find("Body weight in kg").props.value, "78.5");
  assert.equal(h.find("Check-in notes").props.value, "Morning draft");
  h.select("water");
  assert.equal(h.find("Water in ml").props.value, "900");
  assert.equal(h.find("Check-in notes").props.value, "Bottle draft");
});

test("native date choice uses the local calendar day and cannot choose beyond today", async () => {
  const h = harness({ metric: "steps" });
  h.press("Choose check-in date");
  assert.equal(h.picker.length, 1);
  const options = h.picker[0];
  assert.equal(options.mode, "date");
  assert.equal(model.localDate(options.maximumDate), TODAY);
  const picked = new Date(2026, 10, 15, 0, 15);
  assert.equal(picked.toISOString().slice(0, 10), "2026-11-14");
  const onChange = options.onValueChange ?? options.onChange;
  assert.equal(typeof onChange, "function");
  onChange({ type: "set" }, picked);
  h.input("Steps in steps", "1234");
  h.press("Save check-in");
  await flush();
  assert.equal(h.saved[0][1], "2026-11-15");
  assert.equal(h.closed, 1);
});

test("native picker dismissal leaves the selected day unchanged", async () => {
  const h = harness({ metric: "steps", date: YESTERDAY });
  h.press("Choose check-in date");
  const options = h.picker[0];
  // Picker 9.1 calls onValueChange only for a chosen date. Dismissing the
  // dialog must leave the draft untouched and never sends a fake selection.
  options.onDismiss?.();
  h.input("Steps in steps", "123");
  h.press("Save check-in");
  await flush();
  assert.equal(h.saved[0][1], YESTERDAY);
});

test("rapid repeated save and close attempts are blocked until the write completes", async () => {
  let resolveSave;
  const h = harness({
    metric: "steps",
    save: () =>
      new Promise((resolve) => {
        resolveSave = resolve;
      }),
  });
  h.input("Steps in steps", "1000");
  const firstTree = h.render();
  const save = firstTree.find((node) => node.props.accessibilityLabel === "Save check-in");
  const close = firstTree.find((node) => node.props.accessibilityLabel === "Close editor");
  const modal = firstTree.find((node) => node.type === "Modal");
  save.props.onPress();
  save.props.onPress();
  close.props.onPress();
  modal.props.onRequestClose();
  assert.equal(h.saved.length, 1);
  assert.equal(h.closed, 0);
  assert.equal(h.find("Save check-in").props.disabled, true);
  resolveSave();
  await flush();
  assert.equal(h.closed, 1);
});

test("failed writes keep the draft and show an error, then allow retry", async () => {
  let fail = true;
  const h = harness({
    metric: "sleep",
    save: async () => {
      if (fail) throw Error("Storage unavailable");
    },
  });
  h.input("Sleep in hours", "7.5");
  h.note("Good night");
  h.press("Save check-in");
  await flush();
  assert.equal(h.closed, 0);
  assert.match(h.alert(), /Storage unavailable/);
  assert.equal(h.find("Sleep in hours").props.value, "7.5");
  assert.equal(h.find("Check-in notes").props.value, "Good night");
  assert.equal(h.find("Save check-in").props.disabled, false);
  fail = false;
  h.press("Save check-in");
  await flush();
  assert.equal(h.saved.length, 2);
  assert.deepEqual(h.saved[1], ["sleep", TODAY, 7.5, "Good night"]);
  assert.equal(h.closed, 1);
});

test("clearing a saved metric writes a tombstone rather than a zero total", async () => {
  const h = harness({ metric: "water", events: [entry("water", 1500)] });
  h.press("Clear this day’s value");
  await flush();
  assert.deepEqual(h.saved[0], ["water", TODAY, null, ""]);
  assert.equal(h.closed, 1);
});

test("water shortcuts add to the draft and saving writes the absolute daily total", async () => {
  const h = harness({ metric: "water", events: [entry("water", 500)] });
  for (const amount of [250, 500, 750]) {
    const preset = h.render().find((node) => {
      if (node.type !== "Button") return false;
      return (
        new RegExp(`\\+\\s*${amount}\\s*ml`, "i").test(text(node)) ||
        new RegExp(`Add ${amount} (milliliters|ml)`, "i").test(node.props.accessibilityLabel ?? "")
      );
    });
    assert.ok(preset, `Missing water preset ${amount}`);
    preset.props.onPress();
  }
  assert.equal(h.find("Water in ml").props.value, "2000");
  h.press("Save check-in");
  await flush();
  assert.deepEqual(h.saved[0], ["water", TODAY, 2000, ""]);
});

test("ratings expose their meaning and save a whole-number rating", async () => {
  const h = harness({ metric: "energy" });
  for (const [index, label] of model.RATING_LABELS.energy.entries()) {
    assert.ok(h.find(`${index + 1}: ${label}`));
  }
  h.press("4: Energized");
  assert.equal(h.find("4: Energized").props.accessibilityState.selected, true);
  h.press("Save check-in");
  await flush();
  assert.deepEqual(h.saved[0], ["energy", TODAY, 4, ""]);
});

test("empty, fractional integer, and out-of-range drafts never call the save callback", async () => {
  const h = harness({ metric: "steps" });
  for (const value of ["", "1.5", "-1", "200001"]) {
    h.input("Steps in steps", value);
    h.press("Save check-in");
    await flush();
    assert.equal(h.saved.length, 0);
    assert.ok(h.alert());
    assert.equal(h.closed, 0);
  }
});

test("weight-unit preferences do not convert body measurements", async () => {
  const h = harness({ metric: "waist", unit: "lb", events: [entry("waist", 82)] });
  assert.equal(h.find("Waist in cm").props.value, "82");
  h.input("Waist in cm", "83.5");
  h.press("Save check-in");
  await flush();
  assert.deepEqual(h.saved[0], ["waist", TODAY, 83.5, ""]);
});

test("future and nonexistent dates cannot be saved even when supplied directly", async () => {
  for (const date of [model.addDays(TODAY, 1), "2026-02-30"]) {
    const h = harness({ metric: "steps", date });
    h.input("Steps in steps", "100");
    h.press("Save check-in");
    await flush();
    assert.equal(h.saved.length, 0);
    assert.equal(h.closed, 0);
    assert.ok(h.alert());
  }
});

test("save controls stay outside the scrolling fields with bottom safe-area room", () => {
  const h = harness({ metric: "steps" });
  const tree = h.render();
  const scroll = tree.find((node) => node.type === "ScrollView");
  assert.ok(scroll);
  assert.ok(nodes(scroll).some((node) => node.props.accessibilityLabel === "Steps in steps"));
  assert.equal(
    nodes(scroll).some((node) => node.props.accessibilityLabel === "Save check-in"),
    false,
  );
  const footer = tree.find(
    (node) =>
      node.type === "View" &&
      node.props.style?.paddingBottom >= 28 &&
      nodes(node).some((child) => child.props.accessibilityLabel === "Save check-in"),
  );
  assert.ok(footer, "Pinned save footer should accommodate the 28px bottom safe area");
});

test("an open keyboard compacts the sheet header while preserving the title and save action", () => {
  const closed = harness();
  assert.match(text(closed.render()), /YOUR PROGRESS/);
  assert.match(text(closed.render()), /Small check-ins/);
  const open = harness({ keyboardOpen: true });
  const content = text(open.render());
  assert.doesNotMatch(content, /YOUR PROGRESS|Small check-ins/);
  assert.match(content, /Daily check-in/);
  assert.ok(open.find("Save check-in"));
  assert.ok(open.find("Body weight in kg"));
});
