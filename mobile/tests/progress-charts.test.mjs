import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function chartHarness() {
  const state = [];
  let cursor = 0;
  const react = {
    Fragment: "Fragment",
    useId: () => "chart-test",
    useState: (initial) => {
      const position = cursor++;
      if (!(position in state)) state[position] = initial;
      return [
        state[position],
        (value) => {
          state[position] = value;
        },
      ];
    },
    createElement: (type, props, ...children) =>
      typeof type === "function"
        ? type({ ...props, children })
        : { type, props: props ?? {}, children },
  };
  const deps = {
    react,
    "react-native": { View: "View" },
    "react-native-svg": {
      __esModule: true,
      default: "Svg",
      ...Object.fromEntries(
        ["Circle", "Defs", "Line", "LinearGradient", "Path", "Rect", "Stop", "Text"].map((name) => [
          name,
          name,
        ]),
      ),
    },
    "@/src/components/motion": { MotionPressable: "Button" },
    "@/src/components/ui": { Txt: "Txt" },
    "./model": { dateLabel: (date) => date },
    "./visuals": { Icon: "Icon" },
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(
        new URL("../src/features/progress/analytical-charts.tsx", import.meta.url),
        "utf8",
      ),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
          jsx: ts.JsxEmit.React,
        },
      },
    ).outputText,
    {
      exports,
      require: (name) => {
        if (!(name in deps)) throw Error(name);
        return deps[name];
      },
    },
  );
  return {
    ...exports,
    render(Component, props) {
      cursor = 0;
      return Component(props);
    },
  };
}

function nodes(node) {
  return Array.isArray(node)
    ? node.flatMap(nodes)
    : node && typeof node === "object"
      ? [node, ...nodes(node.children)]
      : [];
}
function text(node) {
  return Array.isArray(node)
    ? node.map(text).join(" ").replace(/\s+/g, " ").trim()
    : node && typeof node === "object"
      ? text(node.children)
      : String(node ?? "");
}
function validGeometry(tree) {
  for (const node of nodes(tree)) {
    for (const [key, value] of Object.entries(node.props)) {
      if (typeof value === "number")
        assert.equal(Number.isFinite(value), true, `${node.type}.${key}`);
      if (key === "d") assert.doesNotMatch(value, /NaN|Infinity/);
    }
  }
}

test("empty charts render without inventing data points", () => {
  const h = chartHarness();
  for (const [Component, props] of [
    [h.CumulativeChart, { points: [], unit: "workouts" }],
    [h.SessionScatter, { points: [] }],
    [h.DurationBoxPlot, { distribution: null }],
  ]) {
    const tree = h.render(Component, props);
    assert.equal(
      nodes(tree).some((node) => node.type === "Svg"),
      false,
    );
    assert.ok(text(tree).trim());
  }
});

test("cumulative charts retain actual plateaus and increments as steps with a zero baseline", () => {
  const h = chartHarness();
  const props = {
    unit: "workouts",
    points: [
      { date: "2026-11-01", value: 0 },
      { date: "2026-11-02", value: 1 },
      { date: "2026-11-04", value: 1 },
      { date: "2026-11-05", value: 3 },
    ],
  };
  let tree = h.render(h.CumulativeChart, props);
  const line = nodes(tree).find((node) => node.type === "Path" && node.props.fill === "none");
  assert.match(line.props.d, /^M[^ ]+ H[^ ]+ V[^ ]+ H[^ ]+ V[^ ]+ H[^ ]+ V/);
  assert.doesNotMatch(line.props.d, /[CQSL]/);
  assert.match(
    nodes(tree).find((node) => node.type === "Svg").props.accessibilityLabel,
    /starts at zero/,
  );
  assert.match(text(tree), /3 workouts in this range/);
  nodes(tree)
    .find((node) => node.props.accessibilityLabel === "Previous cumulative date")
    .props.onPress();
  tree = h.render(h.CumulativeChart, props);
  assert.match(text(tree), /Through 2026-11-04/);
  assert.match(text(tree), /1 workouts in this range/);
  validGeometry(tree);
});

test("cumulative charts work without Array.toSorted and preserve their input order", () => {
  // A separate realm reproduces the device runtime without changing Node globals.
  const points = vm.runInNewContext(`
    Array.prototype.toSorted = undefined;
    Object.freeze([
      Object.freeze({ date: "2026-11-05", value: 3 }),
      Object.freeze({ date: "2026-11-01", value: 0 }),
      Object.freeze({ date: "2026-11-02", value: 1 }),
    ]);
  `);
  assert.equal(points.toSorted, undefined);
  const h = chartHarness();
  let tree = h.render(h.CumulativeChart, { points, unit: "workouts" });
  assert.match(text(tree), /Through 2026-11-05/);
  assert.match(text(tree), /3 workouts in this range/);
  nodes(tree)
    .find((node) => node.props.accessibilityLabel === "Previous cumulative date")
    .props.onPress();
  tree = h.render(h.CumulativeChart, { points, unit: "workouts" });
  assert.match(text(tree), /Through 2026-11-02/);
  assert.match(text(tree), /1 workouts in this range/);
  assert.deepEqual(
    [...points].map((point) => point.date),
    ["2026-11-05", "2026-11-01", "2026-11-02"],
  );
  validGeometry(tree);
});

test("single and equal cumulative values render finite SVG geometry and bound navigation", () => {
  for (const points of [
    [{ date: "2026-11-01", value: 0 }],
    [
      { date: "2026-11-01", value: 5 },
      { date: "2026-11-02", value: 5 },
    ],
  ]) {
    const h = chartHarness();
    const tree = h.render(h.CumulativeChart, { points, unit: "minutes" });
    validGeometry(tree);
    const next = nodes(tree).find(
      (node) => node.props.accessibilityLabel === "Next cumulative date",
    );
    assert.equal(next.props.disabled, true);
    if (points.length === 1) {
      assert.equal(
        nodes(tree).find((node) => node.props.accessibilityLabel === "Previous cumulative date")
          .props.disabled,
        true,
      );
    }
  }
});

test("coincident scatter dots remain individually selectable through accessible session controls", () => {
  const h = chartHarness();
  const props = {
    points: [
      { id: "first", date: "2026-11-01", name: "Push", minutes: 30, sets: 8 },
      { id: "second", date: "2026-11-02", name: "Pull", minutes: 30, sets: 8 },
    ],
  };
  let tree = h.render(h.SessionScatter, props);
  assert.match(text(tree), /2026-11-02 · Pull/);
  nodes(tree)
    .find((node) => node.props.accessibilityLabel === "Previous workout in session chart")
    .props.onPress();
  tree = h.render(h.SessionScatter, props);
  assert.match(text(tree), /2026-11-01 · Push/);
  assert.match(text(tree), /30 min · 8 working sets/);
  nodes(tree)
    .find((node) => node.props.accessibilityLabel === "Next workout in session chart")
    .props.onPress();
  tree = h.render(h.SessionScatter, props);
  assert.match(text(tree), /2026-11-02 · Pull/);
  assert.match(text(tree), /Overlapping dots may represent multiple sessions/);
  validGeometry(tree);
});

test("one zero-duration zero-set scatter session has visible labelled axes without invalid coordinates", () => {
  const h = chartHarness();
  const tree = h.render(h.SessionScatter, {
    points: [{ id: "one", date: "2026-11-01", name: "Quick session", minutes: 0, sets: 0 }],
  });
  validGeometry(tree);
  assert.match(text(tree), /Working sets/);
  assert.match(text(tree), /Session duration \(minutes\)/);
  assert.match(text(tree), /0 min · 0 working sets/);
});

test("duration distribution labels the supplied quartiles, median, full range and sample count", () => {
  const h = chartHarness();
  const tree = h.render(h.DurationBoxPlot, {
    distribution: { min: 10, q1: 20, median: 30, q3: 45, max: 70, count: 9 },
  });
  const body = text(tree).replace(/\s+/g, " ");
  assert.match(body, /30 min median/);
  assert.match(body, /9 sessions/);
  assert.match(body, /Shortest 10 min/);
  assert.match(body, /Longest 70 min/);
  assert.match(body, /middle 50% \(20–45 min\)/);
  assert.match(
    nodes(tree).find((node) => node.type === "Svg").props.accessibilityLabel,
    /full range, not outlier thresholds/,
  );
  validGeometry(tree);
});

test("one equal-duration session renders a median without claiming a measured spread", () => {
  const h = chartHarness();
  const tree = h.render(h.DurationBoxPlot, {
    distribution: { min: 0, q1: 0, median: 0, q3: 0, max: 0, count: 1 },
  });
  assert.match(text(tree), /One recorded session/);
  assert.doesNotMatch(text(tree), /Box: middle 50%/);
  validGeometry(tree);
});

test("large cumulative totals use compact axis ticks and retain the complete selected value", () => {
  const h = chartHarness();
  const tree = h.render(h.CumulativeChart, {
    points: [{ date: "2026-11-01", value: 123456 }],
    unit: "kg volume",
  });
  assert.match(text(tree), /123,456 kg volume in this range/);
  const ticks = nodes(tree)
    .filter((node) => node.type === "Text")
    .map(text);
  assert.ok(ticks.includes("100k"));
  assert.ok(ticks.includes("200k"));
  assert.equal(
    ticks.some((tick) => /100,000|200,000/.test(tick)),
    false,
  );
  validGeometry(tree);
});
