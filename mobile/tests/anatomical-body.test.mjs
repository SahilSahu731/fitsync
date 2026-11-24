
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
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

  assert.equal(muscle(staticMap, "chest").onPress, undefined);
});
