import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function fixture(reduced = false) {
  const slots = [];
  const springs = [];
  let cursor = 0;
  let updates = 0;
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: {
      createContext: () => ({}),
      useContext: () => reduced,
      useSyncExternalStore(subscribe, read) {
        const index = cursor++;
        if (slots[index]?.subscribe !== subscribe) {
          slots[index]?.unsubscribe?.();
          slots[index] = {
            subscribe,
            unsubscribe: subscribe(() => {
              updates++;
            }),
          };
        }
        return read();
      },
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
        return [
          slots[index],
          (next) => {
            updates++;
            slots[index] = typeof next === "function" ? next(slots[index]) : next;
          },
        ];
      },
      useEffect: () => {},
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      Animated: {
        Value: class {},
        View: "AnimatedView",
        createAnimatedComponent: () => "AnimatedPressable",
        spring: (_value, options) => ({ start: () => springs.push(options.toValue) }),
      },
      Pressable: "Pressable",
    },
    "expo-router": {},
    nativewind: { cssInterop() {} },
    "@/src/features/experience/experience-context": {},
  };
  const exports = {};
  const source = readFileSync(new URL("../src/components/motion.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return {
    springs,
    get updates() {
      return updates;
    },
    render(props = {}) {
      cursor = 0;
      return exports.MotionPressable(props);
    },
  };
}

test("static controls animate and deliver actions without React updates on press or hover", () => {
  const f = fixture();
  const events = [];
  const button = f.render({
    style: { opacity: 1 },
    onPress: () => events.push("press"),
    onPressIn: () => events.push("in"),
    onPressOut: () => events.push("out"),
    onHoverIn: () => events.push("hover in"),
    onHoverOut: () => events.push("hover out"),
  });
  button.props.onPressIn({});
  button.props.onPress({});
  button.props.onPressOut({});
  button.props.onHoverIn({});
  button.props.onHoverOut({});
  assert.equal(f.updates, 0);
  assert.ok(f.springs.length > 0);
  assert.deepEqual(events, ["in", "press", "out", "hover in", "hover out"]);
});

test("reduced motion preserves pressed and hovered feedback without animation", () => {
  const f = fixture(true);
  const states = [];
  const props = {
    style: (state) => {
      states.push(state);
      return { opacity: state.pressed ? 0.5 : 1, borderWidth: state.hovered ? 1 : 0 };
    },
  };
  let button = f.render(props);
  button.props.onPressIn({});
  button = f.render(props);
  assert.equal(button.props.style[0].opacity, 0.5);
  button.props.onHoverIn({});
  button = f.render(props);
  assert.equal(button.props.style[0].borderWidth, 1);
  button.props.onPressOut({});
  button = f.render(props);
  assert.equal(button.props.style[0].opacity, 1);
  assert.equal(states[0].pressed, false, "old callback snapshots must remain immutable");
  assert.equal(f.springs.length, 0);
});
