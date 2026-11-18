import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import sharp from "sharp";
import { MUSCLES } from "../src/features/pro/analytics.ts";

function fixture() {
  const jsx = (type, props = {}) => ({ type, props });
  const exports = {};
  const dependencies = {
    react: {},
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native-svg": {
      __esModule: true,
      default: "Svg",
      G: "G",
      Image: "SvgImage",
      Path: "Path",
    },
    "../../../assets/anatomy/muscle-atlas.png": "bundled-atlas",
  };
  const source = ts.transpileModule(
    readFileSync(new URL("../src/features/pro/anatomical-body.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  vm.runInNewContext(source, {
    exports,
    require(name) {
      assert.ok(name in dependencies, `Unexpected anatomy dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

function nodes(node, type) {
  if (node == null || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((child) => nodes(child, type));
  return [...(node.type === type ? [node] : []), ...nodes(node.props?.children, type)];
}

function region(tree, code) {
  const found = nodes(tree, "G").find((node) => node.props.testID.endsWith(`-${code}`));
  assert.ok(found, `Expected visible region ${code}`);
  return found;
}

test("anatomy uses a bundled transparent atlas with the correct front and back crop", async () => {
  const source = new URL("../assets/anatomy/muscle-atlas.png", import.meta.url).pathname;
  const metadata = await sharp(source).metadata();
  assert.equal(metadata.width, metadata.height);
  assert.ok(metadata.width >= 1000);
  assert.equal(metadata.hasAlpha, true);
  const alpha = (await sharp(source).stats()).channels[3];
  assert.equal(alpha.min, 0);
  assert.equal(alpha.max, 255);
  const { AnatomicalBody } = fixture();
  const front = AnatomicalBody({ muscles: [], size: 145 });
  const back = AnatomicalBody({ muscles: [], size: 145, back: true });
  assert.equal(front.props.viewBox, "0 0 500 1000");
  assert.equal(back.props.viewBox, "500 0 500 1000");
  assert.equal(front.props.width, 145);
  assert.equal(front.props.height, 290);
  assert.equal(front.props.style.overflow, "hidden");
  assert.equal(back.props.style.overflow, "hidden");
  for (const tree of [front, back]) {
    assert.equal(nodes(tree, "SvgImage").length, 1);
    const image = nodes(tree, "SvgImage")[0];
    assert.equal(image.props.href, "bundled-atlas");
    assert.equal(image.props.width, 1000);
    assert.equal(image.props.height, 1000);
  }
});

test("the front and back contours cover every catalog muscle without guessed unknown regions", () => {
  const { AnatomicalBody, MUSCLE_VIEWS } = fixture();
  const visible = new Set();
  for (const back of [false, true]) {
    const view = back ? "back" : "front";
    const tree = AnatomicalBody({ muscles: [...MUSCLES, "unclassified"], back });
    for (const group of nodes(tree, "G")) {
      const code = group.props.testID.slice(`anatomy-${view}-`.length);
      visible.add(code);
      assert.ok(MUSCLE_VIEWS[code].includes(view));
      assert.equal(nodes(group, "Path").length, 2, `${code} has paired muscle contours`);
      assert.ok(nodes(group, "Path").every((path) => path.props.d.includes("C")));
    }
    assert.ok(nodes(tree, "G").every((group) => !group.props.testID.includes("unclassified")));
  }
  assert.deepEqual([...visible].sort(), [...MUSCLES].sort());
  assert.deepEqual(Object.keys(MUSCLE_VIEWS).sort(), [...MUSCLES].sort());
  assert.deepEqual([...MUSCLE_VIEWS.forearms], ["front", "back"]);
  assert.deepEqual([...MUSCLE_VIEWS.calves], ["front", "back"]);
});

test("organic regions dispatch their own muscle and expose selected labels on either view", () => {
  const { AnatomicalBody } = fixture();
  const selections = [];
  const front = AnatomicalBody({
    muscles: ["chest"],
    selected: "chest",
    onSelect: (code) => selections.push(code),
  });
  const chest = region(front, "chest");
  assert.equal(chest.props.accessibilityLabel, "chest muscle, selected");
  assert.equal(chest.props.accessible, true);
  assert.equal(chest.props.disabled, false);
  assert.equal(chest.props.stroke, "#ECF7FF");
  chest.props.onPress();
  const back = AnatomicalBody({
    muscles: ["upper-back", "triceps"],
    selected: "upper-back",
    back: true,
    onSelect: (code) => selections.push(code),
  });
  assert.equal(region(back, "upper-back").props.accessibilityLabel, "upper back muscle, selected");
  region(back, "upper-back").props.onPress();
  region(back, "triceps").props.onPress();
  assert.deepEqual(selections, ["chest", "upper-back", "triceps"]);
  assert.equal(region(back, "triceps").props.accessibilityLabel, "triceps muscle");
});

test("only supplied muscles receive a bounded translucent highlight, including malformed intensities", () => {
  const { AnatomicalBody } = fixture();
  const tree = AnatomicalBody({
    muscles: ["chest", "biceps", "abs", "quads", "calves"],
    intensity: { chest: 8, biceps: -5, abs: Number.NaN, quads: Infinity, calves: 0.5 },
  });
  assert.ok(Math.abs(region(tree, "chest").props.fillOpacity - 0.58) < 1e-8);
  assert.equal(region(tree, "biceps").props.fillOpacity, 0.18);
  assert.equal(region(tree, "abs").props.fillOpacity, 0.18);
  assert.equal(region(tree, "quads").props.fillOpacity, 0.18);
  assert.equal(region(tree, "calves").props.fillOpacity, 0.38);
  assert.equal(region(tree, "forearms").props.fillOpacity, 0);
  for (const group of nodes(tree, "G")) {
    assert.equal(group.props.fill, "#159CFF");
    assert.ok(Number.isFinite(group.props.fillOpacity));
    assert.ok(group.props.fillOpacity >= 0 && group.props.fillOpacity <= 0.5800001);
  }
});

test("an untrained selection stays outlined and maps without callbacks stay inert", () => {
  const { AnatomicalBody } = fixture();
  const tree = AnatomicalBody({ muscles: [], selected: "chest" });
  assert.equal(region(tree, "chest").props.fillOpacity, 0);
  assert.equal(region(tree, "chest").props.strokeWidth, 3);
  for (const group of nodes(tree, "G")) {
    assert.equal(group.props.onPress, undefined);
    assert.equal(group.props.disabled, true);
    assert.equal(group.props.accessible, false);
  }
  assert.equal(AnatomicalBody({ muscles: [], size: NaN }).props.width, 150);
  assert.equal(AnatomicalBody({ muscles: [], size: -1 }).props.height, 300);
  assert.equal(AnatomicalBody({ muscles: [], small: true }).props.height, 76);
});
