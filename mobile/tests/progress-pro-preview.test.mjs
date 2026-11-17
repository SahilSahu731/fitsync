import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(file, deps) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
        jsx: ts.JsxEmit.React,
      },
    }).outputText,
    {
      exports,
      require: (name) => {
        if (!(name in deps)) throw Error(name);
        return deps[name];
      },
    },
  );
  return exports;
}
const react = {
  useRef: (value) => ({ current: value }),
  createElement: (type, props, ...children) =>
    typeof type === "function"
      ? type({ ...props, children })
      : { type, props: props ?? {}, children },
};
const deps = {
  react,
  "react-native": { View: "View", ActivityIndicator: "Loading" },
  "expo-blur": { BlurTargetView: "BlurTarget", BlurView: "Blur" },
  "react-native-svg": { __esModule: true, default: "Svg", Path: "Path", Rect: "Rect" },
  "@/src/components/motion": { MotionPressable: "Button", ProgressFill: "Fill" },
  "@/src/components/ui": { Txt: "Text" },
  "@/src/constants/theme": { C: {} },
  "./visuals": { Icon: "Icon" },
  "./model": { weightValue: (n) => n },
};
const { AdvancedInsights } = load("../src/features/progress/advanced-insights.tsx", deps);
const { DeepAnalytics } = load("../src/features/progress/deep-analytics.tsx", {
  ...deps,
  "./insights": {
    deepProgressInsight: () => {
      throw Error("Paid analytics must not run");
    },
  },
  "./dashboard-ui": {},
});
const { ProgressRange } = load("../src/features/progress/progress-range.tsx", {
  ...deps,
  "./access": { PROGRESS_PERIODS: [7, 30, 90, 365] },
});
function nodes(n) {
  return Array.isArray(n)
    ? n.flatMap(nodes)
    : n && typeof n === "object"
      ? [n, ...nodes(n.children)]
      : [];
}
function text(n) {
  return Array.isArray(n)
    ? n.map(text).join(" ")
    : n && typeof n === "object"
      ? text(n.children)
      : String(n ?? "");
}
const unavailable = new Proxy(
  {},
  {
    get() {
      throw Error("Locked analytics must not be computed");
    },
  },
);
test("the new free analytics invitation opens Pro without reading or computing member data", () => {
  let opened = 0;
  const tree = DeepAnalytics({
    data: unavailable,
    isPro: false,
    checking: false,
    unit: "kg",
    onPro: () => opened++,
    onExercise() {},
  });
  assert.match(text(tree), /Go deeper into your progress/);
  nodes(tree)
    .find((n) => n.props.accessibilityLabel === "Explore Pro advanced analytics")
    .props.onPress();
  assert.equal(opened, 1);
});
test("the new analytics gate waits for billing resolution even with a previous Pro state", () => {
  for (const isPro of [false, true]) {
    const tree = DeepAnalytics({
      data: unavailable,
      isPro,
      checking: true,
      unit: "kg",
      onPro() {},
      onExercise() {},
    });
    assert.equal(
      nodes(tree).some((n) => n.type === "Loading"),
      true,
    );
    assert.doesNotMatch(text(tree), /Go deeper into your progress/);
  }
});
test("locked preview is illustrative, inaccessible decorative geometry and never computes private paid analytics", () => {
  let opened = 0;
  const tree = AdvancedInsights({
    data: unavailable,
    isPro: false,
    checking: false,
    unit: "kg",
    onOpen: () => opened++,
  });
  assert.match(text(tree), /Illustrative preview/);
  assert.equal(
    nodes(tree).find((n) => n.type === "BlurTarget").props.importantForAccessibility,
    "no-hide-descendants",
  );
  assert.equal(
    nodes(tree).some((n) => n.type === "Blur"),
    true,
  );
  nodes(tree)
    .find((n) => n.props.accessibilityLabel === "Explore Pro advanced analytics")
    .props.onPress();
  assert.equal(opened, 1);
});
test("billing resolution shows a loading state without locked or paid content flashing", () => {
  const tree = AdvancedInsights({
    data: unavailable,
    isPro: true,
    checking: true,
    unit: "kg",
    onOpen() {},
  });
  assert.equal(
    nodes(tree).some((n) => n.type === "Loading"),
    true,
  );
  assert.equal(
    nodes(tree).some((n) => n.type === "Blur"),
    false,
  );
});
test("Pro chart uses real exercise volume only inside the selected range", () => {
  const data = {
    start: "2026-11-01",
    today: "2026-11-15",
    exercises: [
      {
        id: "bench",
        name: "Bench",
        sessions: [
          { date: "2026-11-10", volume: 100 },
          { date: "2026-01-01", volume: 900 },
        ],
      },
      { id: "row", name: "Row", sessions: [{ date: "2026-11-10", volume: 50 }] },
    ],
  };
  const tree = AdvancedInsights({ data, isPro: true, checking: false, unit: "kg", onOpen() {} });
  const fills = nodes(tree).filter((n) => n.type === "Fill");
  assert.equal(fills[0].props.ratio, 2 / 3);
  assert.equal(fills[1].props.ratio, 1 / 3);
  assert.equal(
    nodes(tree).some((n) => n.type === "Blur"),
    false,
  );
});
test("90 days is free and older range selection opens Pro instead of changing the chart", () => {
  const periods = [];
  let upgrades = 0;
  let tree = ProgressRange({
    days: 30,
    isPro: false,
    onChange: (value) => periods.push(value),
    onPro: () => upgrades++,
  });
  nodes(tree)
    .find((n) => n.props.accessibilityLabel === "Last 90 days")
    .props.onPress();
  nodes(tree)
    .find((n) => n.props.accessibilityLabel === "1 year of analytics, requires Pro")
    .props.onPress();
  assert.deepEqual(periods, [90]);
  assert.equal(upgrades, 1);
  tree = ProgressRange({
    days: 90,
    isPro: true,
    onChange: (value) => periods.push(value),
    onPro() {},
  });
  nodes(tree)
    .find((n) => n.props.accessibilityLabel === "Last 365 days")
    .props.onPress();
  assert.deepEqual(periods, [90, 365]);
});
