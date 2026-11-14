import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

function load(file, dependencies) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === "react") return React;
      if (name === "react/jsx-runtime") return jsxRuntime;
      assert.ok(name in dependencies, `Unexpected dependency ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}
const View = ({ children }) => React.createElement("div", null, children);
const Txt = ({ children }) => React.createElement("span", null, children);
const host =
  (tag) =>
  ({ children, accessibilityLabel, ...props }) =>
    React.createElement(tag, props, children);
const native = { View, Pressable: View, StyleSheet: { absoluteFill: {} } };
const ui = { Txt };
const icons = { MaterialCommunityIcons: () => null };
const colors = { C: {} };
const { MuscleFocus } = load("../src/features/workouts/components/muscle-focus.tsx", {
  "react-native": native,
  "@expo/vector-icons": icons,
  "@/src/constants/theme": colors,
  "@/src/components/ui": ui,
  "./workout-controls": { WorkoutDrawer: View },
  "react-native-svg": {
    __esModule: true,
    default: host("svg"),
    Circle: host("circle"),
    Path: host("path"),
  },
});
const { SessionOverview } = load("../src/features/workouts/components/session-overview.tsx", {
  "react-native": native,
  "@/src/components/ui": ui,
  "./muscle-focus": { MuscleFocus },
  "./workout-glass": { WorkoutGlassSurface: () => null },
});

test("the complete overview renders safely when the exercise list is missing, null or empty", (t) => {
  const errors = [];
  t.mock.method(console, "error", (...args) => errors.push(args));
  for (const exercises of [undefined, null, []]) {
    const props = { name: "Workout", completedSets: 0, totalSets: 0, volume: 0 };
    if (exercises !== undefined) props.exercises = exercises;
    // Render actual nested components: a shallow overview mock misses the MuscleFocus crash.
    const markup = renderToStaticMarkup(React.createElement(SessionOverview, props));
    assert.match(markup, /Sets logged/);
    assert.match(markup, /Volume/);
    assert.equal((markup.match(/<svg/g) ?? []).length, 2);
    assert.doesNotThrow(() =>
      renderToStaticMarkup(React.createElement(MuscleFocus, { exercises })),
    );
  }
  assert.equal(errors.length, 0);
});

test("an exercise without loaded set data still renders its tagged muscles", () => {
  const markup = renderToStaticMarkup(
    React.createElement(SessionOverview, {
      name: "Upper body",
      completedSets: 0,
      totalSets: 0,
      volume: 0,
      exercises: [
        {
          id: "bench",
          exercise_name: "Bench press",
          exercises: { primary_muscles: ["chest"], secondary_muscles: [] },
        },
      ],
    }),
  );
  assert.match(markup, /fill="#C5F460"/);
});

test("targetless glass surfaces use the supported Android fallback without deprecated props", () => {
  const blurCalls = [];
  const BlurView = (props) => {
    blurCalls.push(props);
    return null;
  };
  const animation = {
    duration() {
      return this;
    },
    springify() {
      return this;
    },
    damping() {
      return this;
    },
    delay() {
      return this;
    },
  };
  const reanimated = {
    __esModule: true,
    default: { View },
    FadeInDown: animation,
    useReducedMotion: () => true,
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: (callback) => callback(),
  };
  const common = {
    "react-native": { ...native, Platform: { OS: "android", Version: 34 } },
    "expo-blur": { BlurView },
    "expo-linear-gradient": { LinearGradient: () => null },
    "react-native-reanimated": reanimated,
  };
  const { GlassSurface } = load("../src/components/glass-surface.tsx", common);
  const { CoachHomeButton } = load("../src/features/coaching/home-card.tsx", {
    ...common,
    "expo-router": { router: {} },
    "@expo/vector-icons": icons,
    "@/src/components/motion": { MotionPressable: View },
    "@/src/components/ui": ui,
    "@/src/constants/theme": colors,
    "@/src/features/billing/billing-context": {
      useBilling: () => ({ isPro: false, loading: false }),
    },
    "./model": {},
    "./use-coaching": {},
  });
  renderToStaticMarkup(React.createElement(GlassSurface));
  renderToStaticMarkup(React.createElement(CoachHomeButton));
  assert.equal(blurCalls.length, 2);
  for (const props of blurCalls) {
    assert.equal(props.experimentalBlurMethod, undefined);
    assert.equal(props.blurMethod, "none");
  }
});
