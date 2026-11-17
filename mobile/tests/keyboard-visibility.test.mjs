import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(react = {}, native = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(
    readFileSync(
      new URL("../src/features/progress/keyboard-visibility.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  vm.runInNewContext(source, {
    exports,
    ...globals,
    require: (name) => {
      if (name === "react") return react;
      if (name === "react-native") return native;
      throw Error(`Unexpected dependency ${name}`);
    },
  });
  return exports;
}

const { keyboardOverlap, focusedScrollOffset } = load();

test("overlay keyboards reduce the visible form area but resized Android modals do not double avoid", () => {
  const keyboard = { screenY: 480, height: 320 };
  assert.equal(keyboardOverlap(0, 800, keyboard), 320);
  assert.equal(keyboardOverlap(0, 480, keyboard), 0);
  assert.equal(keyboardOverlap(24, 456, keyboard), 0);
  assert.equal(keyboardOverlap(24, 500, keyboard), 44);
  assert.equal(keyboardOverlap(0, 800, undefined), 0);
  assert.equal(keyboardOverlap(0, 800, { screenY: 800, height: 0 }), 0);
});

test("focused input is revealed above pinned actions without disturbing already visible values", () => {
  // The field viewport ends at 400px, above the Save footer and keyboard.
  assert.equal(focusedScrollOffset(0, 160, 240, 350, 100), 66);
  assert.equal(focusedScrollOffset(80, 160, 240, 200, 100), 80);
  // Scrolling back to a previous field also exposes its top.
  assert.equal(focusedScrollOffset(220, 160, 240, 110, 100), 154);
  assert.equal(focusedScrollOffset(0, 160, 240, 110, 100), 0);
  // A multiline note larger than the available space starts at its top.
  assert.equal(focusedScrollOffset(0, 160, 120, 230, 160), 70);
  // A short viewport gives a large value its full height before adding margin.
  assert.equal(focusedScrollOffset(0, 160, 120, 190, 112), 26);
});

function harness() {
  const state = [];
  let cursor = 0;
  let effect;
  let cleanup;
  let frameId = 0;
  const frames = new Map();
  const listeners = new Map();
  const scrolls = [];
  let keyboard;
  let viewportHeight = 800;
  let scrollHeight = 480;
  let inputY = 620;
  const input = {
    measureInWindow: (callback) => callback(24, inputY, 280, 100),
  };
  const react = {
    useCallback: (fn) => fn,
    useEffect: (fn) => {
      effect ??= fn;
    },
    useRef(initial) {
      const i = cursor++;
      state[i] ??= { current: initial };
      return state[i];
    },
    useState(initial) {
      const i = cursor++;
      if (!(i in state)) state[i] = initial;
      return [state[i], (next) => (state[i] = next)];
    },
  };
  const { useKeyboardForm } = load(
    react,
    {
      Platform: { OS: "android" },
      Keyboard: {
        metrics: () => keyboard,
        addListener(name, callback) {
          listeners.set(name, callback);
          return { remove: () => listeners.delete(name) };
        },
      },
      TextInput: { State: { currentlyFocusedInput: () => input } },
    },
    {
      requestAnimationFrame(callback) {
        frames.set(++frameId, callback);
        return frameId;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
  );
  const render = () => {
    cursor = 0;
    const hook = useKeyboardForm();
    hook.viewportRef.current = {
      measureInWindow: (callback) => callback(0, 0, 360, viewportHeight),
    };
    hook.scrollRef.current = {
      getNativeScrollRef: () => ({
        measureInWindow: (callback) => callback(0, 140, 360, scrollHeight),
      }),
      scrollTo: (options) => {
        scrolls.push(options.y);
        inputY -= options.y - (scrolls.at(-2) ?? 0);
      },
    };
    if (!cleanup) cleanup = effect();
    return hook;
  };
  return {
    render,
    scrolls,
    listeners,
    flushFrames() {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback());
    },
    showKeyboard() {
      keyboard = { screenY: 480, height: 320 };
      listeners.get("keyboardDidShow")({ endCoordinates: keyboard });
      scrollHeight = 220;
    },
    resizeNativeModal() {
      viewportHeight = 480;
    },
    hideKeyboard() {
      keyboard = undefined;
      listeners.get("keyboardDidHide")();
    },
    dispose() {
      cleanup();
    },
  };
}

test("keyboard changes resize the drawer and reveal the active input after its scroll viewport shrinks", () => {
  const h = harness();
  h.render().onFocus();
  h.showKeyboard();
  assert.equal(h.render().bottomInset, 320);
  assert.equal(h.render().keyboardOpen, true);
  h.render().revealInput();
  h.flushFrames();
  assert.deepEqual(h.scrolls, [376]);
  h.render().revealInput();
  h.flushFrames();
  assert.deepEqual(h.scrolls, [376], "A visible focused field should not jump a second time");

  h.resizeNativeModal();
  h.render().onViewportLayout();
  assert.equal(h.render().bottomInset, 0, "Native resize replaces the keyboard spacer");
  h.hideKeyboard();
  assert.equal(h.render().bottomInset, 0);
  assert.equal(h.render().keyboardOpen, false);
  h.dispose();
  assert.equal(h.listeners.size, 0);
});
