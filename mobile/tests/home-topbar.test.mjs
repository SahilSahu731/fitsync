import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const jsx = (type, props = {}) => ({ type, props });
function nodes(node, predicate = () => true) {
  if (node == null || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((child) => nodes(child, predicate));
  return [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)];
}
function text(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node !== "object") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  return text(node.props?.children);
}
function button(tree, label) {
  const found = nodes(
    tree,
    (node) => node.props?.accessibilityRole === "button" && node.props.accessibilityLabel === label,
  )[0];
  assert.ok(found, `Expected ${label}`);
  return found;
}

function topbarFixture({ isPro = false, user = { id: "alice", name: "Alex Rivera" } } = {}) {
  const slots = [];
  let cursor = 0;
  const calls = [];
  const props = {
    isPro,
    user,
    onPro: () => calls.push("pro"),
    onReminders: () => calls.push("reminders"),
    onProfile: () => calls.push("profile"),
  };
  const dependencies = {
    "react-native-svg": {
      __esModule: true,
      default: "Svg",
      Rect: "Rect",
      Defs: "Defs",
      Stop: "Stop",
      LinearGradient: "LinearGradient",
    },

    "react-native-reanimated": {
      __esModule: true,
      default: {
        createAnimatedComponent: (component) => component,
      },
      useSharedValue: (value) => ({ value }),
      useAnimatedProps: (fn) => fn(),
    },
    react: {
      useCallback: (callback) => callback,
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [slots[index], (value) => (slots[index] = value)];
      },
      useEffect() {},
    },
    "expo-router": { useFocusEffect() {} },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { Image: "Image", View: "View" },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/motion": { MotionPressable: "Pressable" },
    "@/src/components/ui": { Txt: "Txt" },
  };
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL("../src/features/home/top-bar.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return {
    calls,
    props,
    render() {
      cursor = 0;
      return exports.HomeTopBar(props);
    },
  };
}

test("Home membership, reminders and profile actions stay reachable", () => {
  const ui = topbarFixture();
  const tree = ui.render();
  button(tree, "Explore Pro").props.onPress();
  button(tree, "Open reminders").props.onPress();
  button(tree, "Open your profile").props.onPress();
  assert.deepEqual(ui.calls, ["pro", "reminders", "profile"]);
});

test("Pro members open the membership destination", () => {
  const ui = topbarFixture({ isPro: true });
  const tree = ui.render();
  button(tree, "Open Pro studio").props.onPress();
  assert.deepEqual(ui.calls, ["pro"]);
});

test("Profile avatars fall back to initials after a failed image and recover for a new image", () => {
  const ui = topbarFixture({ user: { id: "alice", name: "Alex Rivera", avatarUrl: "image-a" } });
  let tree = ui.render();
  let avatar = nodes(tree, (node) => node.type === "Image")[0];
  assert.equal(avatar.props.source.uri, "image-a");
  avatar.props.onError();
  tree = ui.render();
  assert.equal(nodes(tree, (node) => node.type === "Image").length, 0);
  assert.match(text(button(tree, "Open your profile")), /AR/);
  ui.props.user = { ...ui.props.user, avatarUrl: "image-b" };
  avatar = nodes(ui.render(), (node) => node.type === "Image")[0];
  assert.equal(avatar.props.source.uri, "image-b");
});
