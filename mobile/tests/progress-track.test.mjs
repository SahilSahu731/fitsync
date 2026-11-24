import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    Date,
    Intl,
    require(name) {
      if (!(name in dependencies)) throw Error(`Unmocked dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

const model = load("../src/features/progress/model.ts");
function nodes(tree) {
  return Array.isArray(tree)
    ? tree.flatMap(nodes)
    : tree && typeof tree === "object"
      ? [tree, ...nodes(tree.props?.children)]
      : [];
}
function text(tree) {
  return Array.isArray(tree)
    ? tree.map(text).join(" ")
    : tree && typeof tree === "object"
      ? text(tree.props?.children)
      : String(tree ?? "");
}

function harness(extra = {}) {
  const hooks = [];
  let cursor = 0;
  const calls = [];
  const jsx = (type, props) =>
    typeof type === "function" ? type(props ?? {}) : { type, props: props ?? {} };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in hooks)) hooks[index] = typeof initial === "function" ? initial() : initial;
      return [
        hooks[index],
        (value) => {
          hooks[index] = typeof value === "function" ? value(hooks[index]) : value;
        },
      ];
    },
    useMemo: (factory) => factory(),
  };
  const dependencies = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "Fragment" },
    "react-native": { View: "View", ScrollView: "ScrollView" },
    "@/src/components/motion": { MotionPressable: "Button", ProgressFill: "ProgressFill" },
    "@/src/components/ui": { Txt: "Text" },
    "@/src/constants/theme": {
      C: {
        ink: "#FFFFFF",
        bg: "#000000",
        panel: "#111111",
        muted: "#A3A3A3",
        brand: "#C5F460",
      },
    },
    "./model": model,
    "./charts": { TrendChart: "TrendChart" },
    "./visuals": { Icon: "Icon", PanelCard: "PanelCard" },
    "./tracking-artwork": {
      StepsArtwork: "StepsArtwork",
      WaterArtwork: "WaterArtwork",
      NutritionArtwork: "NutritionArtwork",
    },
  };
  dependencies["./tracking-cards"] = load(
    "../src/features/progress/tracking-cards.tsx",
    dependencies,
  );
  const { TrackCards } = load("../src/features/progress/track-cards.tsx", dependencies);
  const values = extra.values ?? {};
  const props = {
    group: "activity",
    daily: (metric) => values[metric] ?? null,
    goals: model.defaultGoals(),
    unit: "kg",
    canLog: true,
    onLog: (metric) => calls.push(["log", metric]),
    onDetail: (metric) => calls.push(["detail", metric]),
    onWater: () => calls.push(["water"]),
    waterBusy: false,
    weights: [],
    ...extra,
  };
  const h = {
    calls,
    props,
    render() {
      cursor = 0;
      h.tree = TrackCards(props);
      return h.tree;
    },
    button(label) {
      const button = nodes(h.tree).find(
        (node) => node.type === "Button" && node.props.accessibilityLabel === label,
      );
      assert.ok(button, `Missing button: ${label}`);
      return button;
    },
  };
  h.render();
  return h;
}

test("card logging and history actions route to their own metrics", () => {
  const h = harness();
  for (const [label, metric] of [
    ["Steps", "steps"],
    ["Water", "water"],
    ["Food calories", "caloriesIn"],
    ["Protein", "protein"],
    ["Carbs", "carbs"],
  ]) {
    h.button(`Log ${label}`).props.onPress();
    h.button(`View ${label} history`).props.onPress();
    assert.deepEqual(h.calls.slice(-2), [
      ["log", metric],
      ["detail", metric],
    ]);
  }
});

test("a recorded zero remains distinct from a missing daily total", () => {
  const empty = harness();
  const zero = harness({ values: { steps: 0, water: 0, caloriesIn: 0, protein: 0, carbs: 0 } });
  for (const metric of ["Steps", "Water", "Food calories", "Protein", "Carbs"]) {
    assert.match(text(empty.button(`View ${metric} history`)), /—/, metric);
    assert.match(text(zero.button(`View ${metric} history`)), /\b0\b/, metric);
    assert.doesNotMatch(text(zero.button(`View ${metric} history`)), /—/, metric);
  }
});

test("nutrition keeps the three main values visible and expands the remaining nutrients", () => {
  const h = harness({ group: "nutrition" });
  assert.equal(
    nodes(h.tree).some((node) => node.props.accessibilityLabel === "Log Sodium"),
    false,
  );
  h.button("Show more nutrients").props.onPress();
  h.render();
  for (const [label, metric] of [
    ["Fat", "fat"],
    ["Fiber", "fiber"],
    ["Sugar", "sugar"],
    ["Sodium", "sodium"],
    ["Caffeine", "caffeine"],
  ]) {
    h.button(`Log ${label}`).props.onPress();
    assert.deepEqual(h.calls.at(-1), ["log", metric]);
  }
  h.button("Show fewer nutrients").props.onPress();
  h.render();
  assert.equal(
    nodes(h.tree).some((node) => node.props.accessibilityLabel === "Log Sodium"),
    false,
  );
});

test("water converts the stored millilitre total to litres and quick-add stays a separate action", () => {
  const h = harness({ group: "nutrition", values: { water: 1250 }, goals: { water: 2500 } });
  assert.match(text(h.tree), /1\.3|1\.25/);
  assert.match(text(h.tree), /2\.5/);
  const progress = nodes(h.tree).find((node) => node.type === "ProgressFill");
  assert.equal(progress.props.ratio, 0.5, "the goal ratio uses stored ml for both values");
  h.button("Add 250 ml water").props.onPress();
  assert.deepEqual(h.calls, [["water"]]);
});

test("loading or unavailable storage blocks logging while trends remain readable", () => {
  const h = harness({ canLog: false });
  for (const label of [
    "Log Steps",
    "Log Water",
    "Log Food calories",
    "Log Protein",
    "Log Carbs",
    "Add 250 ml water",
  ]) {
    const button = h.button(label);
    assert.equal(button.props.disabled, true, label);
    button.props.onPress?.();
  }
  assert.equal(h.calls.length, 0, "callbacks also reject programmatic writes");
  h.button("View Steps history").props.onPress();
  assert.deepEqual(h.calls, [["detail", "steps"]]);
});

test("secondary activity, body and recovery tiles respect the same logging availability", () => {
  for (const group of ["activity", "body", "recovery"]) {
    const h = harness({ group, canLog: false });
    const logging = nodes(h.tree).filter(
      (node) => node.type === "Button" && node.props.accessibilityLabel?.startsWith("Log "),
    );
    assert.ok(logging.length > 0, group);
    for (const button of logging) {
      assert.equal(button.props.disabled, true, button.props.accessibilityLabel);
      button.props.onPress?.();
    }
    assert.equal(h.calls.length, 0, group);
  }
});

test("a pending water add blocks repeated quick adds", () => {
  const h = harness({ waterBusy: true });
  const button = h.button("Add 250 ml water");
  assert.equal(button.props.disabled, true);
  button.props.onPress?.();
  assert.equal(h.calls.length, 0);
});

test("body weight converts the saved kilogram measurement and chart to the chosen unit", () => {
  const latestWeight = {
    id: "weight-check-in",
    kind: "metric",
    metric: "weight",
    date: "2026-11-17",
    observedAt: "2026-11-17T12:00:00Z",
    value: 50,
    notes: "",
    source: "manual",
  };
  const h = harness({ group: "body", unit: "lb", latestWeight, weights: [latestWeight] });
  assert.match(text(h.tree), /110\.2/);
  assert.match(text(h.tree), /lb/);
  const chart = nodes(h.tree).find((node) => node.type === "TrendChart");
  assert.equal(chart.props.unit, "lb");
  assert.equal(chart.props.points[0].value, model.weightValue(50, "lb"));
});
