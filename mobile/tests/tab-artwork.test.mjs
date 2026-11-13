import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import sharp from "sharp";
import * as tabModel from "../src/components/tab-bar-model.ts";

const source = readFileSync(new URL("../src/components/tab-artwork.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

// Render the component without an SVG asset loader or SvgXml export, as on a stale Metro session.
function renderArtwork(props) {
  const exports = {};
  const jsx = (type, props, key) => ({ type, props, key });
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
      if (name === "react") return {};
      if (name === "react-native") return { View: "View" };
      if (name === "react-native-svg")
        return {
          __esModule: true,
          default: "Svg",
          Path: "Path",
          Rect: "Rect",
          G: "G",
        };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports.TabArtwork(props).props.children;
}

function svgXml(node) {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(svgXml).join("");
  const children = svgXml(node.props.children);
  if (node.type === "Fragment") return children;
  const tag = { Svg: "svg", Path: "path", Rect: "rect", G: "g" }[node.type];
  assert.ok(tag, `Unsupported vector element: ${node.type}`);
  const attributes = Object.entries(node.props)
    .filter(([key]) => key !== "children" && key !== "accessible")
    .map(
      ([key, value]) =>
        `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}="${value}"`,
    )
    .join(" ");
  return `<${tag} ${tag === "svg" ? 'xmlns="http://www.w3.org/2000/svg" ' : ""}${attributes}>${children}</${tag}>`;
}

for (const name of ["home", "train", "stats", "progress", "library"]) {
  test(`${name} renders white and black native vectors without SVG asset imports`, async () => {
    for (const color of ["#FFFFFF", "#000000", "#FFFFFF"]) {
      const vector = renderArtwork({ name, color });
      assert.equal(vector.type, "Svg");
      assert.equal(vector.props.width, 24);
      assert.equal(vector.props.height, 24);
      assert.equal(vector.props.stroke, color);
      const { data, info } = await sharp(Buffer.from(svgXml(vector)))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      assert.equal(info.width, 24);
      assert.equal(info.height, 24);
      const expected = color === "#FFFFFF" ? 255 : 0;
      let opaquePixels = 0;
      for (let offset = 0; offset < data.length; offset += 4) {
        if (data[offset + 3] < 240) continue;
        opaquePixels++;
        assert.deepEqual([...data.subarray(offset, offset + 3)], [expected, expected, expected]);
      }
      assert.ok(opaquePixels > 30, `${name} must have clearly visible strokes at tab size`);
      const reference = readFileSync(
        new URL(`../assets/tabs/${name}.svg`, import.meta.url),
        "utf8",
      ).replace(/currentColor/g, color);
      const referencePixels = await sharp(Buffer.from(reference)).ensureAlpha().raw().toBuffer();
      assert.deepEqual(
        data,
        referencePixels,
        "native geometry must match the improved SVG artwork",
      );
    }
  });
}

test("custom icon sizes retain the same vector viewBox", () => {
  const vector = renderArtwork({ name: "train", color: "#FFFFFF", size: 32 });
  assert.equal(vector.props.width, 32);
  assert.equal(vector.props.height, 32);
  assert.equal(vector.props.viewBox, "0 0 24 24");
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
  const names = ["home", "train", "stats", "progress", "library"];
  for (let focused = 0; focused < 5; focused++) {
    names.forEach((name, index) => {
      const node = exports.AnimatedTabButton({
        index,
        focused: focused === index,
        label: name,
        artwork: name,
        onPress() {},
        onLongPress() {},
      });
      const icons = find(node, "TabArtwork");
      assert.equal(icons.length, 1, "a tab must not crossfade white and black image layers");
      assert.equal(icons[0].props.color, focused === index ? "#000000" : "#FFFFFF");
      assert.equal(icons[0].props.avatarUrl, undefined);
    });
  }
});
