import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as permissions from "../src/services/permission-prompts.ts";

function fixture() {
  const slots = [],
    effects = [];
  let cursor = 0;
  let ownerId = "owner";
  const events = [],
    listingOpens = [];
  function memo(factory, dependencies) {
    const index = cursor++;
    if (!slots[index] || dependencies.some((value, i) => slots[index].dependencies[i] !== value))
      slots[index] = { value: factory(), dependencies };
    return slots[index].value;
  }
  const react = {
    createContext: () => ({ Provider: "Provider" }),
    useCallback: (callback, dependencies) => memo(() => callback, dependencies),
    useMemo: memo,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (next) => {
          slots[index] = typeof next === "function" ? next(slots[index]) : next;
        },
      ];
    },
    useRef(initial) {
      return (slots[cursor++] ??= { current: initial });
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || dependencies.some((value, i) => value !== previous.dependencies[i])) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[index] = { dependencies, cleanup: callback() };
        });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      Keyboard: { dismiss() {} },
      Linking: { openSettings: async () => {} },
      ...Object.fromEntries(
        ["Modal", "Pressable", "ScrollView", "View"].map((name) => [name, name]),
      ),
    },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/constants/theme": { C: {} },
    "@/src/context/session": { useSession: () => ({ user: { id: ownerId } }) },
    "@/src/features/experience/review-prompt": {
      openPlayReviews: async (source) => {
        listingOpens.push(source);
      },
    },
    "@/src/services/telemetry": {
      trackEvent: (name) => {
        events.push(name);
      },
    },
    "@/src/services/permission-prompts": permissions,
    "./permission-dialog": { PermissionDialog: "PermissionDialog" },
    "./ui": { Txt: "Txt" },
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(new URL("../src/components/app-dialog.tsx", import.meta.url), "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      },
    ).outputText,
    {
      exports,
      require(name) {
        assert.ok(name in dependencies, name);
        return dependencies[name];
      },
    },
  );
  return {
    events,
    listingOpens,
    switchOwner(next) {
      ownerId = next;
    },
    render() {
      cursor = 0;
      const tree = exports.AppDialogProvider({ children: null });
      effects.splice(0).forEach((effect) => effect());
      return tree;
    },
    unmount() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}
function nodes(tree) {
  return Array.isArray(tree)
    ? tree.flatMap(nodes)
    : tree && typeof tree === "object"
      ? [tree, ...nodes(tree.props?.children)]
      : [];
}
function text(tree) {
  return Array.isArray(tree)
    ? tree.map(text).join("")
    : tree && typeof tree === "object"
      ? text(tree.props?.children)
      : String(tree ?? "");
}
const button = (tree, label) =>
  nodes(tree).find((node) => node.type === "Pressable" && text(node) === label);
const flush = () => new Promise((resolve) => setImmediate(resolve));

test("queued permission actions remain usable while an alert awaits them, and stale taps run each action once", async () => {
  for (const accept of [true, false]) {
    const ui = fixture();
    let actions = 0,
      nativeRequests = 0,
      followingActions = 0,
      result;
    try {
      const { alert } = ui.render().props.value;
      alert("Enable reminders", "", [
        {
          text: "Enable",
          onPress: async () => {
            actions++;
            result = await permissions.requestPermissionWithExplanation(
              "notifications",
              { granted: false },
              async () => {
                nativeRequests++;
                return { granted: true };
              },
            );
          },
        },
      ]);
      const original = button(ui.render(), "Enable");
      original.props.onPress();
      original.props.onPress();
      await flush();
      const explanation = nodes(ui.render()).find((node) => node.type === "PermissionDialog");
      assert.ok(explanation);
      alert("Following action", "", [{ text: "Finish", onPress: () => followingActions++ }]);
      const choose = explanation.props[accept ? "onContinue" : "onCancel"];
      choose();
      choose();
      await flush();
      assert.equal(result, accept);
      assert.equal(actions, 1);
      assert.equal(nativeRequests, Number(accept));
      original.props.onPress();
      choose();
      const following = button(ui.render(), "Finish");
      assert.ok(following, "stale taps must not dismiss the next queued dialog");
      following.props.onPress();
      following.props.onPress();
      await flush();
      assert.equal(followingActions, 1);
      assert.equal(actions, 1);
      assert.equal(nodes(ui.render()).find((node) => node.type === "Modal").props.visible, false);
    } finally {
      ui.unmount();
    }
  }
});

test("the review invitation waits its turn, can be dismissed, and opens Play once for its own session", async () => {
  const ui = fixture();
  try {
    const { alert, inviteReview } = ui.render().props.value;
    alert("Workout saved");
    inviteReview();
    inviteReview();
    const saved = ui.render();
    assert.deepEqual(ui.events, []);
    button(saved, "Got it").props.onPress();

    const review = ui.render();
    assert.deepEqual(ui.events, ["review_invitation_shown"]);
    nodes(review)
      .find((item) => item.type === "Modal")
      .props.onRequestClose();
    button(review, "Rate on Google Play").props.onPress();
    await flush();
    assert.deepEqual(ui.listingOpens, []);
    assert.deepEqual(ui.events, ["review_invitation_shown", "review_invitation_dismissed"]);
    assert.ok(!button(ui.render(), "Maybe later"));

    inviteReview();
    const deferred = ui.render();
    button(deferred, "Maybe later").props.onPress();
    await flush();
    assert.deepEqual(ui.listingOpens, []);
    inviteReview();
    const stale = button(ui.render(), "Rate on Google Play");
    ui.switchOwner("new owner");
    const switched = ui.render();
    assert.ok(!button(switched, "Rate on Google Play"));
    stale.props.onPress();
    inviteReview();
    assert.ok(!button(ui.render(), "Rate on Google Play"));
    await flush();
    assert.deepEqual(ui.listingOpens, []);

    switched.props.value.inviteReview();
    const primary = button(ui.render(), "Rate on Google Play");
    primary.props.onPress();
    primary.props.onPress();
    await flush();
    assert.deepEqual(ui.listingOpens, ["workout_summary"]);
  } finally {
    ui.unmount();
  }
});
