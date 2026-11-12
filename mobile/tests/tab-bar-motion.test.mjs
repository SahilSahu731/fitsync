import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as model from "../src/components/tab-bar-model.ts";

function mount(reduced = false, platform = "ios") {
  let now = 0;
  const pending = new Map();
  const shared = (initial) => {
    let value = initial;
    const result = {
      get: () => value,
      set(next) {
        pending.delete(result);
        if (next?.kind === "delay")
          pending.set(result, { at: now + next.delay, animation: next.animation });
        else value = next;
      },
    };
    return result;
  };
  const compact = shared(0);
  const target = shared(0);
  const motion = {
    compact,
    target,
    reduced,
    expand() {
      target.set(0);
      compact.set(0);
    },
  };
  let focus;
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  const js = ts.transpileModule(
    readFileSync(new URL("../src/components/tab-bar-motion.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(js, {
    exports,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react")
        return {
          createContext: () => ({}),
          forwardRef: (fn) => fn,
          useContext: () => motion,
          useCallback: (fn) => fn,
        };
      if (name === "react-native") return { Platform: { OS: platform } };
      if (name === "expo-router")
        return {
          useFocusEffect: (callback) => {
            focus = callback;
          },
        };
      if (name === "./motion") return {};
      if (name === "./tab-bar-model") return model;
      if (name === "react-native-reanimated")
        return {
          __esModule: true,
          default: { ScrollView: "ScrollView" },
          ReduceMotion: { System: "system", Never: "never" },
          useSharedValue: shared,
          useAnimatedScrollHandler: (handlers) => handlers,
          cancelAnimation: (value) => {
            pending.delete(value);
          },
          withSpring: (value) => value,
          withTiming: (value, _config, callback) => ({ value, callback }),
          withDelay: (delay, animation) => ({ kind: "delay", delay, animation }),
        };
      throw Error(name);
    },
  });
  const { onScroll: handlers } = exports.TabScrollView({}, null).props;
  let cleanup = focus();
  return {
    compact,
    target,
    handlers,
    event: (y) => ({
      contentOffset: { y },
      contentSize: { height: 2000 },
      layoutMeasurement: { height: 600 },
    }),
    advance(ms) {
      now += ms;
      for (const [value, scheduled] of [...pending])
        if (scheduled.at <= now) {
          pending.delete(value);
          value.set(scheduled.animation.value);
          scheduled.animation.callback?.(true);
        }
    },
    blur() {
      cleanup();
    },
    focus() {
      cleanup = focus();
    },
  };
}

test("downward scrolling stays compact after drag, momentum, and a long idle period", () => {
  const bar = mount();
  const { handlers: h, event } = bar;
  h.onBeginDrag(event(0));
  h.onScroll(event(80));
  assert.equal(bar.compact.get(), 1);
  h.onEndDrag();
  bar.advance(2000);
  h.onMomentumBegin();
  h.onScroll(event(400));
  h.onMomentumEnd();
  bar.advance(60000);
  assert.equal(bar.compact.get(), 1, "stopping never expands the bar");
  assert.equal(bar.target.get(), 1);
  h.onBeginDrag(event(400));
  h.onScroll(event(380));
  assert.equal(bar.compact.get(), 0, "scrolling up restores the active label");
});

test("small reversals do not flicker; an intentional upward swipe expands immediately", () => {
  const bar = mount();
  const { handlers: h, event } = bar;
  h.onBeginDrag(event(100));
  h.onScroll(event(160));
  h.onEndDrag();
  bar.advance(2000);
  h.onBeginDrag(event(160));
  h.onScroll(event(156));
  assert.equal(bar.compact.get(), 1);
  h.onScroll(event(146));
  assert.equal(bar.compact.get(), 0);
  h.onEndDrag();
  bar.advance(2000);
  assert.equal(bar.compact.get(), 0);
  h.onBeginDrag(event(146));
  h.onScroll(event(166));
  assert.equal(bar.compact.get(), 1);
});

test("wheel scrolling stays compact while idle and expands only when scrolling up", () => {
  const bar = mount(false, "web");
  const { handlers: h, event } = bar;
  h.onScroll(event(80));
  bar.advance(60000);
  assert.equal(bar.compact.get(), 1);
  h.onScroll(event(100));
  h.onScroll(event(80));
  assert.equal(bar.compact.get(), 0);
});

test("hidden screens cannot change the bar and changing tabs restores its label", () => {
  const bar = mount();
  const { handlers: h, event } = bar;
  h.onBeginDrag(event(0));
  h.onScroll(event(80));
  h.onEndDrag();
  bar.blur();
  bar.compact.set(0);
  bar.target.set(0);
  h.onScroll(event(300));
  h.onMomentumEnd();
  bar.advance(60000);
  assert.equal(bar.compact.get(), 0);
  bar.compact.set(1);
  bar.target.set(1);
  bar.focus();
  assert.equal(bar.compact.get(), 0);
});

test("native scroll restoration cannot shrink a newly selected tab", () => {
  const bar = mount();
  const { handlers: h, event } = bar;
  h.onScroll(event(400));
  assert.equal(bar.compact.get(), 0);
  h.onBeginDrag(event(400));
  h.onScroll(event(420));
  assert.equal(bar.compact.get(), 1);
});

test("reduced motion preserves the same persistent compact behavior", () => {
  const bar = mount(true);
  const { handlers: h, event } = bar;
  h.onBeginDrag(event(0));
  h.onScroll(event(80));
  h.onEndDrag();
  bar.advance(60000);
  assert.equal(bar.compact.get(), 1);
  h.onBeginDrag(event(80));
  h.onScroll(event(60));
  assert.equal(bar.compact.get(), 0);
});
