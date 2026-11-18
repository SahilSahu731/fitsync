import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as model from "../src/features/companion/monthly-report-model.ts";

const tick = () => new Promise((resolve) => setImmediate(resolve));
const payload = () => ({
  month: "2026-11",
  generatedAt: "2026-11-18T12:00:00Z",
  timezone: "UTC",
  text: "Private server text",
  summary: {
    workouts: 2,
    trainingDays: 2,
    minutes: 90,
    workingSets: 12,
    warmupSets: 4,
    volumeKg: 800,
    reps: 100,
    averageRpe: null,
    effortRecordedSets: 0,
  },
  workouts: [
    { id: "a", date: "2026-11-10", name: "My real session", minutes: 45 },
    { id: "b", date: "2026-11-11", name: "Second session", minutes: 45 },
  ],
  exercises: [
    {
      exerciseId: "bench",
      name: "Bench press",
      trackingType: "reps_weight",
      workingSets: 6,
      sessions: 2,
      bestWeightKg: 40,
      bestReps: 8,
    },
  ],
  measurements: [{ metric: "weight", date: "2026-11-10", value: 80, unit: "kg" }],
});
function nodes(node, predicate = () => true) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((item) => nodes(item, predicate));
  return [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
}
function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(text).join(" ");
  return typeof node === "object" ? text(node.props?.children) : String(node);
}
function press(tree, label) {
  const button = nodes(
    tree,
    (node) => node.type === "Pressable" && node.props.accessibilityLabel === label,
  )[0];
  assert.ok(button, `Expected ${label}`);
  assert.equal(button.props.disabled ?? false, false, `${label} should be enabled`);
  return button.props.onPress();
}
function fixture(component = "AccountMonthlyReport", options = {}) {
  const states = [],
    cleanups = [],
    calls = [],
    shares = [];
  let cursor = 0,
    response = options.response ?? payload;
  const jsx = (type, props = {}) => (typeof type === "function" ? type(props) : { type, props });
  const button = (props) =>
    jsx("Pressable", {
      ...props,
      disabled: props.disabled || props.loading,
      accessibilityLabel: props.title ?? props.label,
      children: props.title ?? props.label,
    });
  const dependencies = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
        return [
          states[index],
          (next) => {
            states[index] = typeof next === "function" ? next(states[index]) : next;
          },
        ];
      },
      useRef(initial) {
        const index = cursor++;
        return (states[index] ??= { current: initial });
      },
      useEffect(effect) {
        const index = cursor++;
        if (!(index in states)) {
          states[index] = true;
          cleanups.push(effect());
        }
      },
      useMemo: (fn) => fn(),
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      View: "View",
      ScrollView: "ScrollView",
      Switch: "Switch",
      Share: {
        share: async (...args) => {
          shares.push(args);
          if (options.shareError) throw new Error(options.shareError);
          return { action: "dismissedAction" };
        },
      },
    },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/components/motion": { MotionPressable: "Pressable" },
    "@/src/context/session": {
      useSession: () => ({
        user: { id: options.ownerId ?? "alice" },
        settings: { weightUnit: "kg" },
      }),
    },
    "../progress/editors": {
      Sheet: (props) => ({
        type: "Sheet",
        props: { ...props, children: [props.children, props.footer] },
      }),
    },
    "../progress/journal": {
      readJournal: async (owner) => {
        calls.push(["journal", owner]);
        return { pending: options.pending ?? [] };
      },
    },
    "../progress/model": { localDate: () => "2026-11-18" },
    "../progress/use-progress": {
      useProgress: () => ({
        refresh: async () => {
          calls.push(["progress"]);
        },
      }),
    },
    "../workouts/workout-context": {
      useWorkout: () => ({
        ensureSynced: async () => {
          calls.push(["workouts"]);
        },
      }),
    },
    "../pro/hub-ui": {
      GlassCard: "GlassCard",
      ProSection: (props) => jsx("View", { children: [props.title, props.description] }),
      ProButton: button,
      ProPill: button,
      PRO: { muted: "#A3A3A3" },
    },
    "./companion-context": {
      useCompanion: () => ({
        api: {
          report: async (month) => {
            calls.push(["report", month]);
            return response(month);
          },
        },
      }),
    },
    "./monthly-report-model": model,
  };
  const exports = {};
  const source =
    readFileSync(new URL("../src/features/companion/monthly-report.tsx", import.meta.url), "utf8") +
    "\nexport { AccountMonthlyReport, ReportShareSheet };";
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      Date,
      Error,
      Set,
      Map,
      Promise,
      require: (name) => {
        assert.ok(name in dependencies, name);
        return dependencies[name];
      },
    },
  );
  return {
    calls,
    shares,
    setResponse(next) {
      response = next;
    },
    unmount() {
      for (const cleanup of cleanups) cleanup?.();
    },
    render() {
      cursor = 0;
      return exports[component](
        component === "ReportShareSheet"
          ? {
              report: model.normalizeMonthlyReport(payload(), "2026-11"),
              unit: "kg",
              onClose: () => {},
            }
          : { ownerId: options.ownerId ?? "alice", unit: "kg" },
      );
    },
  };
}

test("report generation syncs real logs before requesting the selected month", async () => {
  const app = fixture();
  assert.equal(app.calls.length, 0);
  press(app.render(), "Build monthly report");
  await tick();
  const view = app.render();
  assert.deepEqual(app.calls, [
    ["workouts"],
    ["progress"],
    ["journal", "alice"],
    ["report", "2026-11"],
  ]);
  assert.match(text(view), /My real session/);
  assert.match(text(view), /Bench press/);
  assert.match(text(view), /Body weight/);
  assert.match(text(view), /Effort not recorded/);
  assert.doesNotMatch(text(view), /Private server text/);
});

test("pending progress entries block generation and keep an actionable error", async () => {
  const app = fixture("AccountMonthlyReport", { pending: [{ id: "pending" }] });
  press(app.render(), "Build monthly report");
  await tick();
  assert.equal(
    app.calls.some(([kind]) => kind === "report"),
    false,
  );
  assert.match(text(app.render()), /still need to sync/);
});

test("signed-out report actions stay disabled without issuing a data request", async () => {
  const app = fixture("AccountMonthlyReport", { ownerId: "" });
  const view = app.render();
  const action = nodes(
    view,
    (node) => node.props?.accessibilityLabel === "Build monthly report",
  )[0];
  assert.equal(action.props.disabled, true);
  action.props.onPress();
  await tick();
  assert.deepEqual(app.calls, []);
  assert.match(text(app.render()), /Sign in to build/);
});

test("rapid submissions create only one request and failed refresh keeps the previous report", async () => {
  let resolve;
  const app = fixture("AccountMonthlyReport", {
    response: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  const initial = app.render();
  press(initial, "Build monthly report");
  press(initial, "Build monthly report");
  await tick();
  assert.equal(app.calls.filter(([kind]) => kind === "report").length, 1);
  resolve(payload());
  await tick();
  app.setResponse(async () => {
    throw new Error("Connection interrupted");
  });
  press(app.render(), "Refresh report");
  await tick();
  assert.match(text(app.render()), /Connection interrupted/);
  assert.match(text(app.render()), /My real session/);
  assert.match(text(app.render()), /Share your monthly report/);
});

test("month buttons replace the old preview and the picker cannot choose future months", async () => {
  const app = fixture();
  press(app.render(), "Build monthly report");
  await tick();
  press(app.render(), "Previous report month");
  let view = app.render();
  assert.doesNotMatch(text(view), /My real session/);
  press(view, "Choose report month. October 2026");
  view = app.render();
  const future = nodes(view, (node) => node.props?.accessibilityLabel === "December 2026")[0];
  assert.equal(future.props.disabled, true);
  press(view, "November 2026");
  view = app.render();
  assert.equal(
    nodes(view, (node) => node.props?.accessibilityLabel === "Next report month")[0].props.disabled,
    true,
  );
});

test("a response arriving after leaving the account cannot install a report", async () => {
  let resolve;
  const app = fixture("AccountMonthlyReport", {
    response: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  press(app.render(), "Build monthly report");
  await tick();
  app.unmount();
  resolve(payload());
  await tick();
  assert.doesNotMatch(text(app.render()), /My real session/);
});

test("share preview starts training-only and opt-in shares exactly the chosen detailed content", async () => {
  const app = fixture("ReportShareSheet");
  let view = app.render();
  const toggle = nodes(view, (node) => node.type === "Switch")[0];
  assert.equal(toggle.props.value, false);
  press(view, "Open share options");
  await tick();
  assert.doesNotMatch(app.shares[0][0].message, /80 kg|Body weight|My real session/);
  assert.match(app.shares[0][0].message, /2 workouts/);
  view = app.render();
  press(view, "Detailed report");
  nodes(view, (node) => node.type === "Switch")[0].props.onValueChange(true);
  press(app.render(), "Open share options");
  await tick();
  assert.match(app.shares[1][0].message, /My real session/);
  assert.match(app.shares[1][0].message, /Body weight.*80 kg/);
  assert.match(app.shares[1][0].message, /Bench press/);
  assert.doesNotMatch(text(app.render()), /Successfully shared|Shared successfully/);
});

test("share failures are visible and leave the report preview available to retry", async () => {
  const app = fixture("ReportShareSheet", { shareError: "Sharing unavailable" });
  press(app.render(), "Open share options");
  await tick();
  const view = app.render();
  assert.match(text(view), /Sharing unavailable/);
  assert.match(text(view), /FITSYNC \/ MONTHLY REPORT/);
  assert.equal(
    nodes(view, (node) => node.props?.accessibilityLabel === "Open share options")[0].props
      .disabled,
    false,
  );
});
