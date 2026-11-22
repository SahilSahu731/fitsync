
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import sharp from "sharp";
import { MUSCLES } from "../src/features/pro/analytics.ts";

function loadBody() {
  const jsx = (type, props = {}) => ({ type, props });

  const dependencies = {
    react: {},
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native-svg": {
      __esModule: true,
      default: "Svg",
      G: "G",
      Image: "Image",
      Path: "Path",
    },
    "../../../assets/anatomy/muscle-atlas.png": "atlas",
  };

  const code = ts.transpileModule(
    readFileSync(
      new URL("../src/features/pro/anatomical-body.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;

  const exports = {};

  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });

  return exports;
}

function findAll(tree, type) {
  if (Array.isArray(tree)) {
    return tree.flatMap((item) => findAll(item, type));
  }

  if (!tree || typeof tree !== "object") return [];

  return [
    ...(tree.type === type ? [tree] : []),
    ...findAll(tree.props?.children, type),
  ];
}

function muscle(tree, code) {
  const group = findAll(tree, "G").find(
    (item) => item.props.testID.endsWith(`-${code}`),
  );

  assert.ok(group, `Missing muscle region: ${code}`);
  return group.props;
}

test("anatomical atlas is visible, transparent and correctly cropped", async () => {
  const path = new URL("../assets/anatomy/muscle-atlas.png", import.meta.url);
  const metadata = await sharp(path.pathname).metadata();
  const alpha = (await sharp(path.pathname).stats()).channels[3];

  assert.equal(metadata.width, metadata.height);
  assert.ok(metadata.width >= 1000);
  assert.equal(metadata.hasAlpha, true);
  assert.equal(alpha.min, 0);
  assert.ok(alpha.max >= 250, "atlas should contain nearly opaque pixels");

  const { AnatomicalBody } = loadBody();

  for (const [back, viewBox] of [
    [false, "0 0 500 1000"],
    [true, "500 0 500 1000"],
  ]) {
    const tree = AnatomicalBody({ muscles: [], back, size: 145 });

    assert.equal(tree.props.viewBox, viewBox);
    assert.equal(tree.props.width, 145);
    assert.equal(tree.props.height, 290);
    assert.equal(findAll(tree, "Image")[0]?.props.href, "atlas");
  }
});

test("front and back maps cover every known muscle and ignore unknown muscles", () => {
  const { AnatomicalBody, MUSCLE_VIEWS } = loadBody();
  const visible = new Set();

  for (const back of [false, true]) {
    const view = back ? "back" : "front";
    const tree = AnatomicalBody({
      muscles: [...MUSCLES, "unknown"],
      back,
    });

    for (const group of findAll(tree, "G")) {
      const code = group.props.testID.replace(`anatomy-${view}-`, "");

      assert.ok(MUSCLE_VIEWS[code]?.includes(view), `Wrong view for ${code}`);
      visible.add(code);
    }
  }

  assert.deepEqual([...visible].sort(), [...MUSCLES].sort());
});

test("muscle selection dispatches the correct region and stays accessible", () => {
  const { AnatomicalBody } = loadBody();
  const selections = [];

  const front = AnatomicalBody({
    muscles: ["chest"],
    selected: "chest",
    onSelect: (code) => selections.push(code),
  });

  assert.equal(
    muscle(front, "chest").accessibilityLabel,
    "chest muscle, selected",
  );

  muscle(front, "chest").onPress();

  const back = AnatomicalBody({
    muscles: ["triceps"],
    back: true,
    onSelect: (code) => selections.push(code),
  });

  muscle(back, "triceps").onPress();

  assert.deepEqual(selections, ["chest", "triceps"]);

  const staticMap = AnatomicalBody({
    muscles: [],
    selected: "chest",
  });

  assert.equal(muscle(staticMap, "chest").fillOpacity, 0);
  assert.equal(muscle(staticMap, "chest").onPress, undefined);
});

test("highlight opacity stays bounded and only applies to trained muscles", () => {
  const { AnatomicalBody } = loadBody();

  const tree = AnatomicalBody({
    muscles: ["chest", "biceps", "abs", "calves"],
    intensity: {
      chest: 8,
      biceps: -5,
      abs: NaN,
      calves: 0.5,
    },
  });

  assert.ok(Math.abs(muscle(tree, "chest").fillOpacity - 0.58) < 1e-8);
  assert.equal(muscle(tree, "biceps").fillOpacity, 0.18);
  assert.equal(muscle(tree, "abs").fillOpacity, 0.18);
  assert.equal(muscle(tree, "forearms").fillOpacity, 0);

  for (const group of findAll(tree, "G")) {
    const opacity = group.props.fillOpacity;

    assert.ok(
      Number.isFinite(opacity) &&
      opacity >= 0 &&
      opacity <= 0.58 + 1e-8,
    );
  }
});
