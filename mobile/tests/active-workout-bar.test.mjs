import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const NOW = Date.parse("2026-11-13T12:10:00Z");
function fixture(initialProps = { inline: true }) {
  const route = { pathname: "/train", segments: ["(tabs)", "train"] };
  const calls = { discarded: 0, navigated: [], dialogs: [] };
  const workout = {
    session: {
      id: "session",
      name: "Push Day",
      started_at: "2026-11-13T12:00:00Z",
      workout_session_exercises: [
        {
          exercise_name: "Bench Press",
          position: 0,
          workout_logged_sets: [
            { position: 0, completed_at: "2026-11-13T12:01:00Z" },
            { position: 1, completed_at: null },
          ],
        },
      ],
    },
    restTimer: null,
    busy: false,
    discard: async () => {
      calls.discarded++;
      workout.session = null;
    },
  };
  const clock = { now: NOW };
  const intervals = new Map();
  const slots = [];
  const effects = [];
  let cursor = 0;
  let effectCursor = 0;
  let intervalId = 0;
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  const { outputText } = ts.transpileModule(
    readFileSync(
      new URL("../src/features/workouts/components/active-workout-bar.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  );
  const dependencies = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
        return [
          slots[index],
          (value) => {
            slots[index] = value;
          },
        ];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
      useEffect(run, deps) {
        const index = effectCursor++;
        if (!effects[index] || deps.some((value, i) => value !== effects[index].deps[i])) {
          effects[index]?.cleanup?.();
          effects[index] = { run, deps: [...deps], pending: true };
        }
      },
    },
    "react-native": { View: "View", Pressable: "Pressable" },
    "expo-router": {
      usePathname: () => route.pathname,
      useSegments: () => route.segments,
      useRouter: () => ({ push: (path) => calls.navigated.push(path) }),
    },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 24 }) },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/components/app-dialog": {
      useAppAlert: () => ({
        alert: (title, message, actions) => calls.dialogs.push({ title, message, actions }),
      }),
    },
    "@/src/components/glass-tabs": { TabGlassSurface: "TabGlassSurface" },
    "@/src/constants/theme": { C: {} },
    "../workout-context": { useWorkout: () => workout },
  };
  vm.runInNewContext(outputText, {
    exports,
    Error,
    Date: class extends Date {
      static now() {
        return clock.now;
      }
    },
    setInterval: (run) => {
      const id = ++intervalId;
      intervals.set(id, run);
      return id;
    },
    clearInterval: (id) => intervals.delete(id),
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (!(name in dependencies)) throw Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return {
    route,
    workout,
    clock,
    intervals,
    calls,
    render(props = initialProps) {
      cursor = 0;
      effectCursor = 0;
      const tree = exports.ActiveWorkoutBar(props);
      for (const effect of effects) {
        if (effect.pending) {
          effect.pending = false;
          effect.cleanup = effect.run();
        }
      }
      return tree;
    },
    tick(milliseconds) {
      clock.now += milliseconds;
      for (const run of intervals.values()) run();
    },
  };
}
function find(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((child) => find(child, type));
  return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
}
const button = (tree, prefix) =>
  find(tree, "Pressable").find((node) => node.props.accessibilityLabel.startsWith(prefix));
const text = (node) =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? node.map(text).join(" ")
      : text(node?.props?.children ?? "");
const confirm = (dialog) => dialog.actions.find((action) => action.style === "destructive");

test("trash asks for confirmation and discards only after confirmation", async () => {
  const bar = fixture();
  button(bar.render(), "Discard").props.onPress();
  assert.equal(bar.calls.discarded, 0);
  assert.deepEqual(bar.calls.navigated, []);
  assert.equal(bar.calls.dialogs.length, 1);
  const dialog = bar.calls.dialogs[0];
  assert.equal(dialog.title, "Discard workout?");
  assert.ok(dialog.actions.some((action) => action.style === "cancel"));
  await confirm(dialog).onPress();
  assert.equal(bar.calls.discarded, 1);
  assert.equal(bar.render(), null);
  assert.equal(bar.intervals.size, 0);
  assert.deepEqual(bar.calls.navigated, []);
});

test("cancel preserves the workout and repeated taps cannot queue duplicate confirmations", () => {
  const bar = fixture();
  const trash = button(bar.render(), "Discard");
  trash.props.onPress();
  trash.props.onPress();
  assert.equal(bar.calls.dialogs.length, 1);
  bar.calls.dialogs[0].actions.find((action) => action.style === "cancel").onPress();
  assert.equal(bar.calls.discarded, 0);
  assert.ok(bar.workout.session);
  trash.props.onPress();
  assert.equal(bar.calls.dialogs.length, 2);
});

test("a failed discard keeps the workout and reports the error", async () => {
  const bar = fixture();
  bar.workout.discard = async () => {
    throw Error("Unable to connect");
  };
  button(bar.render(), "Discard").props.onPress();
  await confirm(bar.calls.dialogs[0]).onPress();
  assert.ok(bar.workout.session);
  assert.equal(bar.calls.dialogs[1].title, "Could not discard workout");
  assert.equal(bar.calls.dialogs[1].message, "Unable to connect");
  button(bar.render(), "Discard").props.onPress();
  assert.equal(bar.calls.dialogs.length, 3, "failure releases the confirmation guard for retry");
  assert.deepEqual(bar.calls.navigated, []);
});

test("trash is disabled during an existing workout operation", () => {
  const bar = fixture();
  bar.workout.busy = true;
  const trash = button(bar.render(), "Discard");
  assert.equal(trash.props.disabled, true);
  trash.props.onPress();
  assert.equal(bar.calls.dialogs.length, 0);
  assert.equal(bar.calls.discarded, 0);
});

test("resume and trash are sibling buttons so trash cannot trigger resume", () => {
  const bar = fixture();
  const tree = bar.render();
  const resume = button(tree, "Resume");
  const trash = button(tree, "Discard");
  assert.ok(
    find(tree, "View").some(
      (node) =>
        Array.isArray(node.props.children) &&
        node.props.children.includes(resume) &&
        node.props.children.includes(trash),
    ),
  );
  assert.equal(find(resume, "Pressable").length, 1);
  resume.props.onPress();
  assert.deepEqual(bar.calls.navigated, ["/workout"]);
  assert.equal(bar.calls.discarded, 0);
});

test("the existing layout uses the tab bar glass surface and preserves icon styles", () => {
  const bar = fixture();
  const tree = bar.render();
  assert.equal(find(tree, "TabGlassSurface").length, 1);
  const surface = find(tree, "View").find(
    (node) => /^overflow-hidden rounded-\[\d+px\]$/.test(node.props.className ?? ""),
  );
  assert.ok(surface, "an opaque background must not cover the glass surface");
  assert.match(text(tree), /Push Day/);
  assert.match(text(tree), /Bench Press · Set 2/);
  assert.match(text(tree), /10:00/);
  const trash = button(tree, "Discard");
  assert.equal(trash.props.className, "items-end bg-red-700/40 rounded-full p-2");
  assert.equal(find(trash, "Icon")[0].props.size, 20);
  assert.equal(find(trash, "Icon")[0].props.color, "white");
  const chevron = find(tree, "Icon").find((node) => node.props.name === "chevron-up");
  assert.equal(chevron.props.size, 22);
  assert.equal(chevron.props.color, "white");
});

test("existing timer, positioning and route visibility behavior stays intact", () => {
  const bar = fixture();
  bar.workout.restTimer = { endsAt: NOW + 30000 };
  assert.match(text(bar.render()), /Bench Press · Set 2/);
  bar.tick(1000);
  assert.match(text(bar.render()), /10:01/);
  assert.match(text(bar.render()), /Bench Press · Set 2/);
  assert.equal(bar.render({ inline: false }), null);
  assert.equal(bar.intervals.size, 0);
  bar.route.pathname = "/profile";
  bar.route.segments = ["profile"];
  assert.equal(bar.render({ inline: false }).props.style.bottom, 24);
  bar.route.pathname = "/workout";
  assert.equal(bar.render({ inline: false }), null);
  assert.equal(bar.intervals.size, 0);
});
