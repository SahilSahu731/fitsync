import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as tabModel from "../src/components/tab-bar-model.ts";

const source = readFileSync(new URL("../src/components/tab-artwork.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

// Exercise native image load/error events without a device or network dependency.
function mount(initialProps) {
  const state = [];
  let cursor = 0;
  let currentKey;
  let props = initialProps;
  const exports = {};
  const jsx = (type, props, key) => ({ type, props, key });
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react")
        return {
          useState(initial) {
            const index = cursor++;
            if (!(index in state)) state[index] = initial;
            return [
              state[index],
              (value) => {
                state[index] = value;
              },
            ];
          },
        };
      if (name === "react-native") return { View: "View" };
      if (name === "expo-image") return { Image: "NativeImage" };
      if (name === "react-native-svg") return { __esModule: true, default: "Svg", Path: "Path" };
      if (name.endsWith(".svg")) return name;
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return {
    render(nextProps = props) {
      props = nextProps;
      const root = exports.TabArtwork(props);
      if (root.key !== currentKey) {
        state.length = 0;
        currentKey = root.key;
      }
      cursor = 0;
      const element = root.type(root.props);
      const children = element.props.children.filter(Boolean);
      return {
        fallback: children.find((child) => child.type === "Svg"),
        image: children.find((child) => child.type === "NativeImage"),
      };
    },
  };
}

test("Train has a visible vector while loading and after an asset failure", () => {
  const tab = mount({ name: "train", color: "white" });
  const loading = tab.render();
  assert.ok(loading.fallback);
  assert.ok(loading.fallback.props.children.props.d.length > 0);
  loading.image.props.onError();
  const failed = tab.render();
  assert.ok(failed.fallback);
  assert.equal(failed.image, undefined);
});

test("changing selection color keeps the loaded symbol mounted", () => {
  const tab = mount({ name: "train", color: "white" });
  const initial = tab.render();
  initial.image.props.onDisplay();
  const selected = tab.render({ name: "train", color: "black" });
  assert.equal(selected.fallback, undefined);
  assert.equal(selected.image.props.source, initial.image.props.source);
  assert.equal(selected.image.props.tintColor, "black");
});

test("photo and SVG failures keep Me visible, and a new photo can load", () => {
  const props = { name: "profile", color: "white", avatarUrl: "https://example.test/me.jpg" };
  const tab = mount(props);
  const photo = tab.render();
  assert.equal(photo.image.props.tintColor, undefined);
  assert.equal(photo.image.props.contentFit, "cover");
  photo.image.props.onError();
  const artwork = tab.render();
  assert.ok(artwork.fallback);
  assert.equal(artwork.image.props.source, "@/assets/tabs/profile.svg");
  artwork.image.props.onError();
  assert.ok(tab.render().fallback);
  const updated = tab.render({ ...props, avatarUrl: "https://example.test/new.jpg" });
  assert.equal(updated.image.props.source.uri, "https://example.test/new.jpg");
  assert.equal(updated.image.props.tintColor, undefined);
});

test("a profile without a photo uses the saved icon and its selected color", () => {
  const tab = mount({ name: "profile", color: "black", avatarUrl: null });
  const result = tab.render();
  assert.equal(result.image.props.source, "@/assets/tabs/profile.svg");
  assert.equal(result.image.props.tintColor, "black");
  assert.equal(result.image.props.contentFit, "contain");
});

test("only the focused tab is black even while selection geometry is animating", () => {
  const jsx = (type, props) => ({ type, props });
  const widths = { get: () => [34, 28, 42, 55, 18] };
  const layout = { get: () => tabModel.tabBarLayout(336, 0, [0.5, 0.5, 0, 0, 0], widths.get()) };
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL("../src/components/animated-tabs.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react")
        return { createContext: () => ({}), useContext: () => ({ layout, labelWidths: widths }) };
      if (name === "react-native") return { View: "View", Text: "Text" };
      if (name === "react-native-reanimated")
        return {
          __esModule: true,
          default: { View: "AnimatedView", Text: "AnimatedText" },
          useAnimatedStyle: (fn) => fn(),
          Extrapolation: { CLAMP: "clamp" },
          interpolate: (value) => value,
        };
      if (name === "./motion") return { MotionPressable: "Pressable" };
      if (name === "./glass-tabs") return {};
      if (name === "./tab-bar-model") return tabModel;
      if (name === "./tab-artwork") return { TabArtwork: "TabArtwork" };
      if (name === "./tab-bar-motion")
        return { useTabBarMotion: () => ({ compact: { get: () => 0 } }) };
      throw Error(name);
    },
  });
  const find = (node, type) =>
    !node || typeof node !== "object"
      ? []
      : [
          ...(node.type === type ? [node] : []),
          ...[node.props?.children].flat().flatMap((child) => find(child, type)),
        ];
  const names = ["home", "train", "library", "progress", "profile"];
  for (let focused = 0; focused < 5; focused++) {
    names.forEach((name, index) => {
      const node = exports.AnimatedTabButton({
        index,
        focused: focused === index,
        label: name,
        artwork: name,
        avatarUrl: index === 4 ? "https://example.test/me.jpg" : undefined,
        onPress() {},
        onLongPress() {},
      });
      const icons = find(node, "TabArtwork");
      assert.equal(icons.length, 1, "a tab must not crossfade white and black image layers");
      assert.equal(icons[0].props.color, focused === index ? "#000000" : "#FFFFFF");
      assert.equal(
        icons[0].props.avatarUrl,
        index === 4 ? "https://example.test/me.jpg" : undefined,
      );
    });
  }
});
