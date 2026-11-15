import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(file, deps = {}) {
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
      Date,
      Intl,
      require: (name) => {
        if (!(name in deps)) throw Error(name);
        return deps[name];
      },
    },
  );
  return exports;
}
const model = load("../src/features/progress/model.ts");
const { progressShareSummary } = load("../src/features/progress/share-summary.ts", {
  "./model": model,
});
const data = {
  start: "2026-11-01",
  today: "2026-11-15",
  current: { workouts: 3, minutes: 100, sets: 25, volume: 1200 },
  metrics: [{ notes: "private note", value: 76 }],
  exercises: [{ name: "Private exercise name" }],
};
test("share message contains the preview range, totals and correct units without private journal details", () => {
  const result = progressShareSummary(data, "lb");
  assert.match(result.message, /My FitSync progress/);
  assert.ok(result.message.includes(result.range));
  assert.match(result.message, /Workouts: 3 completed/);
  assert.match(result.message, /Training time: 100 minutes/);
  assert.equal(
    result.stats[3].value,
    model.weightValue(1200, "lb").toLocaleString(undefined, { maximumFractionDigits: 1 }),
  );
  assert.equal(result.stats[3].suffix, "lb × reps");
  assert.doesNotMatch(result.message, /private|Private|76|metrics|notes/);
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
function harness({ empty = false, fail = false } = {}) {
  const state = [];
  let cursor = 0;
  const shares = [];
  const react = {
    Fragment: "fragment",
    createElement: (type, props, ...children) =>
      typeof type === "function"
        ? type({ ...props, children })
        : { type, props: props ?? {}, children },
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [
        state[index],
        (next) => {
          state[index] = next;
        },
      ];
    },
  };
  const { ShareProgress } = load("../src/features/progress/share-progress.tsx", {
    react,
    "react-native": {
      View: "View",
      ActivityIndicator: "Loading",
      Share: {
        async share(content) {
          shares.push(content);
          if (fail) throw Error("Unavailable");
          return { action: "dismissedAction" };
        },
      },
    },
    "@/src/components/motion": { MotionPressable: "Button" },
    "@/src/components/ui": { Txt: "Text" },
    "@/src/constants/theme": { C: {} },
    "./editors": { Sheet: (props) => ({ type: "Sheet", props, children: props.children }) },
    "./visuals": { Icon: "Icon", SmallButton: "SmallButton" },
    "./share-summary": { progressShareSummary },
  });
  return {
    shares,
    render() {
      cursor = 0;
      return nodes(
        ShareProgress({
          data: empty
            ? { ...data, current: { workouts: 0, minutes: 0, sets: 0, volume: 0 } }
            : data,
          unit: "kg",
          loading: false,
          error: "",
          onClose() {},
          onRetry() {},
        }),
      );
    },
  };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));
test("opening the preview does not share until the user presses Share summary; cancellation is harmless", async () => {
  const h = harness();
  const tree = h.render();
  assert.equal(h.shares.length, 0);
  tree.find((n) => n.type === "Button").props.onPress();
  await flush();
  assert.equal(h.shares.length, 1);
  assert.equal(h.shares[0].message, progressShareSummary(data, "kg").message);
  assert.equal(
    h.render().some((n) => n.props.accessibilityRole === "alert"),
    false,
  );
});
test("empty progress cannot be shared, and a sharing failure offers retry without closing the preview", async () => {
  const empty = harness({ empty: true });
  assert.equal(empty.render().find((n) => n.type === "Button").props.disabled, true);
  const h = harness({ fail: true });
  h.render()
    .find((n) => n.type === "Button")
    .props.onPress();
  await flush();
  const tree = h.render();
  assert.ok(
    tree.some((n) => n.props.accessibilityRole === "alert" && text(n).includes("Please try again")),
  );
  assert.equal(tree.find((n) => n.type === "Button").props.disabled, false);
});
