import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as reminderSettings from "../src/features/home/reminder-settings.ts";
import * as reminderModel from "../src/features/companion/reminder-model.ts";

const jsx = (type, props = {}) => (typeof type === "function" ? type(props) : { type, props });
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
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function hooks() {
  let active;
  const same = (a, b) =>
    a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  function effect(callback, deps) {
    const instance = active,
      index = instance.cursor++,
      previous = instance.slots[index];
    if (!previous || !same(previous.deps, deps)) {
      const slot = { deps, cleanup: previous?.cleanup };
      instance.slots[index] = slot;
      instance.effects.push(() => {
        slot.cleanup?.();
        slot.cleanup = callback();
      });
    }
  }
  const react = {
    useState(initial) {
      const instance = active,
        index = instance.cursor++;
      if (!(index in instance.slots))
        instance.slots[index] = typeof initial === "function" ? initial() : initial;
      return [
        instance.slots[index],
        (value) => {
          instance.slots[index] =
            typeof value === "function" ? value(instance.slots[index]) : value;
          instance.changed = true;
        },
      ];
    },
    useRef(initial) {
      const instance = active,
        index = instance.cursor++;
      return (instance.slots[index] ??= { current: initial });
    },
    useMemo(callback, deps) {
      const instance = active,
        index = instance.cursor++,
        previous = instance.slots[index];
      if (!previous || !same(previous.deps, deps))
        instance.slots[index] = { deps, value: callback() };
      return instance.slots[index].value;
    },
    useCallback(callback, deps) {
      return react.useMemo(() => callback, deps);
    },
    useEffect: effect,
    useLayoutEffect: effect,
  };
  function mount(render) {
    const instance = { slots: [], cursor: 0, effects: [], changed: false, tree: null, alive: true };
    instance.render = () => {
      active = instance;
      instance.cursor = 0;
      instance.changed = false;
      instance.tree = render();
      instance.effects.splice(0).forEach((run) => run());
      return instance.tree;
    };
    instance.settle = async () => {
      for (let index = 0; index < 10; index++) {
        await tick();
        if (instance.alive && instance.changed) instance.render();
      }
    };
    instance.unmount = () => {
      instance.alive = false;
      instance.slots.forEach((slot) => slot?.cleanup?.());
    };
    instance.render();
    return instance;
  }
  return { react, mount };
}

const basePreferences = () => ({
  enabled: false,
  time: "18:00",
  days: [1, 3, 5],
  quietStart: "22:00",
  quietEnd: "08:00",
  snoozeMinutes: 45,
  timezone: "UTC",
  habits: {
    hydration: { enabled: false, time: "15:00" },
    meals: { enabled: false, time: "12:00" },
    sleep: { enabled: true, time: "21:00" },
  },
});
const enrollment = () => ({
  id: "program-a",
  status: "active",
  reminder_enabled: true,
  reminder_hour: 18,
  reminder_minute: 10,
  timezone: "Asia/Kolkata",
});
function control(tree, label, role = "button") {
  const found = nodes(
    tree,
    (node) =>
      node.props?.accessibilityLabel === label &&
      (role === "switch" ? node.type === "Switch" : node.props.accessibilityRole === role),
  )[0];
  assert.ok(found, `Expected ${role}: ${label}`);
  return found;
}
function fixture(options = {}) {
  const runtime = hooks();
  const calls = {
    permissions: 0,
    saves: [],
    programs: [],
    registrations: [],
    closes: 0,
    routes: [],
    settings: 0,
    refreshes: 0,
    reloads: 0,
    pickers: [],
  };
  const session = {
    user: { id: "alice", name: "Alex" },
    settings: { workoutReminders: true },
    reloadMe: async () => {
      calls.reloads++;
    },
  };
  const billing = { isPro: options.isPro ?? true, loading: false };
  const prefs = options.prefs ?? basePreferences();
  const companion = {
    state: {
      records: options.records ?? [
        { id: "reminders", kind: "reminders", revision: 3, data: prefs },
      ],
    },
    stateLoaded: options.stateLoaded ?? true,
    stateError: options.stateError ?? null,
    loading: options.companionLoading ?? false,
    busy: false,
    error: options.companionError ?? "",
    refresh: async () => {},
    save: async (...args) => {
      calls.saves.push(args);
      await options.save?.(...args);
      const saved = { id: "reminders", kind: "reminders", data: args[2], revision: args[4] + 1 };
      companion.state = { records: [saved] };
      return saved;
    },
  };
  const program = {
    active: options.program ? { enrollment: options.program } : null,
    loading: options.programLoading ?? false,
    error: options.programError ?? "",
    refresh: async () => {
      calls.refreshes++;
    },
  };
  const dependencies = {
    react: runtime.react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      ActivityIndicator: "Loading",
      Switch: "Switch",
      View: "View",
      Platform: { OS: options.platform ?? "android" },
      Linking: {
        openSettings: async () => {
          calls.settings++;
        },
      },
    },
    "@react-native-community/datetimepicker": {
      __esModule: true,
      default: "DateTimePicker",
      DateTimePickerAndroid: { open: (value) => calls.pickers.push(value) },
    },
    "expo-router": { router: { push: (route) => calls.routes.push(route) } },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/motion": { MotionPressable: "Pressable" },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/context/session": { useSession: () => session },
    "../billing/billing-context": { useBilling: () => billing },
    "../companion/companion-context": { useCompanion: () => companion },
    "../companion/api": { defaultReminders: basePreferences },
    "../companion/reminder-model": reminderModel,
    "../companion/reminders": {
      requestCompanionReminderPermission: async () => {
        calls.permissions++;
        return options.permission ?? true;
      },
    },
    "../companion/native-status": { useCompanionNativeStatus: () => ({ permission: "granted" }) },
    "../program-follow/program-context": { useProgram: () => program },
    "../program-follow/api": {
      programFollowApi: {
        reminders: async (...args) => {
          calls.programs.push(args);
          await options.programSave?.(...args);
        },
      },
    },
    "../program-follow/notifications": {
      registerProgramNotifications: async (...args) => {
        calls.registrations.push(args);
        await options.register?.(...args);
      },
    },
    "../progress/editors": {
      Sheet: (props) => ({
        type: "Sheet",
        props: {
          ...props,
          children: [props.children, props.footer],
        },
      }),
    },
    "./reminder-settings": reminderSettings,
  };
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(new URL("../src/features/home/reminder-sheet.tsx", import.meta.url), "utf8"),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      },
    ).outputText,
    {
      exports,
      Date,
      Error,
      Promise,
      require: (name) => {
        assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
        return dependencies[name];
      },
    },
  );
  const instance = runtime.mount(() =>
    exports.HomeReminderSheet({ onClose: () => calls.closes++ }),
  );
  const toggle = (label, enabled) => {
    control(instance.tree, label, "switch").props.onValueChange(enabled);
    instance.render();
  };
  const chooseTime = (label, hour, minute) => {
    control(instance.tree, label).props.onPress();
    const picker = calls.pickers.at(-1);
    assert.equal(picker.mode, "time");
    const value = new Date(2026, 10, 18, hour, minute);
    picker.onValueChange({}, value);
    instance.render();
  };
  const save = () => control(instance.tree, "Save reminders").props.onPress();
  return { instance, calls, session, billing, companion, program, toggle, chooseTime, save };
}

test("The simple dialog has three opt-in reminders and native time controls, with no text date/time inputs", async () => {
  const ui = fixture();
  assert.equal(nodes(ui.instance.tree, (node) => node.type === "Switch").length, 3);
  for (const label of ["Workout reminders", "Water reminders", "Diet reminders"])
    assert.equal(control(ui.instance.tree, label, "switch").props.value, false);
  assert.equal(nodes(ui.instance.tree, (node) => node.type === "TextInput").length, 0);
  assert.equal(control(ui.instance.tree, "Save reminders").props.disabled, true);
  ui.toggle("Water reminders", true);
  ui.chooseTime("Choose water reminder time", 9, 35);
  assert.equal(ui.calls.permissions, 0);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.permissions, 1);
  assert.equal(ui.calls.saves.length, 1);
  const saved = ui.calls.saves[0];
  assert.deepEqual(saved.slice(0, 2), ["reminders", "reminders"]);
  assert.equal(saved[2].habits.hydration.time, "09:35");
  assert.equal(saved[2].habits.hydration.enabled, true);
  assert.equal(saved[2].habits.sleep.time, "21:00");
  assert.equal(saved[2].snoozeMinutes, 45);
  assert.equal(saved[4], 3);
  assert.equal(ui.calls.closes, 1);
});

test("an unrelated companion error does not lock loaded reminder preferences", async () => {
  const ui = fixture({ companionError: "Exercise usage could not refresh" });
  for (const label of ["Workout reminders", "Water reminders", "Diet reminders"])
    assert.equal(control(ui.instance.tree, label, "switch").props.disabled, false);
  assert.doesNotMatch(text(ui.instance.tree), /saved reminders couldn’t refresh/);
  ui.toggle("Water reminders", true);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.saves.length, 1);
  assert.equal(ui.calls.saves[0][2].habits.hydration.enabled, true);
  assert.equal(ui.calls.closes, 1);
});

test("a program refresh error only blocks workout controls, leaving water and diet editable", async () => {
  const ui = fixture({ program: enrollment(), programError: "Program is offline" });
  assert.equal(control(ui.instance.tree, "Workout reminders", "switch").props.disabled, true);
  assert.equal(control(ui.instance.tree, "Water reminders", "switch").props.disabled, false);
  assert.equal(control(ui.instance.tree, "Diet reminders", "switch").props.disabled, false);
  ui.toggle("Workout reminders", false);
  assert.equal(control(ui.instance.tree, "Workout reminders", "switch").props.value, true);
  ui.toggle("Diet reminders", true);
  ui.chooseTime("Choose diet reminder time", 13, 10);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.saves.length, 1);
  assert.equal(ui.calls.saves[0][2].habits.meals.time, "13:10");
  assert.equal(ui.calls.saves[0][2].habits.meals.enabled, true);
  assert.equal(ui.calls.saves[0][2].enabled, false);
  assert.equal(ui.calls.saves[0][2].time, "18:00");
  assert.deepEqual(ui.calls.saves[0][2].days, [1, 3, 5]);
  assert.equal(ui.calls.programs.length, 0);
  assert.equal(ui.calls.closes, 1);
});

test("a failed background settings refresh retains editable saved preferences and their revision", async () => {
  const ui = fixture({ stateError: "Offline", stateLoaded: true });
  for (const label of ["Workout reminders", "Water reminders", "Diet reminders"])
    assert.equal(control(ui.instance.tree, label, "switch").props.disabled, false);
  ui.toggle("Water reminders", true);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.saves[0][4], 3);
  assert.equal(ui.calls.saves[0][2].habits.sleep.time, "21:00");
  assert.equal(ui.calls.closes, 1);
});

test("an initial settings failure blocks saving defaults until the real preferences load", async () => {
  const ui = fixture({ stateError: "Offline", stateLoaded: false, records: [] });
  for (const label of ["Workout reminders", "Water reminders", "Diet reminders"])
    assert.equal(control(ui.instance.tree, label, "switch").props.disabled, true);
  control(ui.instance.tree, "Retry reminders");
  ui.toggle("Water reminders", true);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.saves.length, 0);
  assert.equal(ui.calls.permissions, 0);
  ui.companion.state = {
    records: [{ id: "reminders", kind: "reminders", revision: 8, data: basePreferences() }],
  };
  ui.companion.stateLoaded = true;
  ui.companion.stateError = null;
  ui.instance.render();
  assert.equal(control(ui.instance.tree, "Water reminders", "switch").props.disabled, false);
  ui.toggle("Water reminders", true);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.saves[0][4], 8);
  assert.equal(ui.calls.closes, 1);
});

test("Permission denial leaves the enabled draft available to retry and opens phone settings", async () => {
  const ui = fixture({ permission: false });
  ui.toggle("Diet reminders", true);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.permissions, 1);
  assert.equal(ui.calls.saves.length, 0);
  assert.equal(ui.calls.closes, 0);
  assert.equal(control(ui.instance.tree, "Diet reminders", "switch").props.value, true);
  assert.match(text(ui.instance.tree), /Notifications are off/);
  await control(ui.instance.tree, "Open phone notification settings").props.onPress();
  assert.equal(ui.calls.settings, 1);
});

test("Disabling every reminder saves without requesting notification permission", async () => {
  const prefs = basePreferences();
  prefs.habits.sleep.enabled = false;
  prefs.habits.hydration.enabled = true;
  const ui = fixture({ prefs });
  ui.toggle("Water reminders", false);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.permissions, 0);
  assert.equal(ui.calls.saves[0][2].habits.hydration.enabled, false);
  assert.equal(ui.calls.closes, 1);
});

test("Turning off water does not require permission even while a saved sleep reminder remains enabled", async () => {
  const prefs = basePreferences();
  prefs.habits.hydration.enabled = true;
  const ui = fixture({ prefs, permission: false });
  ui.toggle("Water reminders", false);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.permissions, 0);
  assert.equal(ui.calls.saves[0][2].habits.hydration.enabled, false);
  assert.equal(ui.calls.saves[0][2].habits.sleep.enabled, true);
  assert.equal(ui.calls.closes, 1);
});

test("A failed save keeps the edited time and revision, while pending writes block duplicate save and close", async () => {
  const pending = deferred();
  const ui = fixture({ save: () => pending.promise });
  ui.toggle("Water reminders", true);
  ui.chooseTime("Choose water reminder time", 13, 45);
  ui.companion.state.records[0] = {
    ...ui.companion.state.records[0],
    revision: 9,
    data: { ...basePreferences(), habits: { hydration: { enabled: true, time: "17:00" } } },
  };
  ui.instance.render();
  const submit = control(ui.instance.tree, "Save reminders").props.onPress;
  submit();
  submit();
  await tick();
  ui.instance.render();
  nodes(ui.instance.tree, (node) => node.type === "Sheet")[0].props.onClose();
  assert.equal(ui.calls.saves.length, 1);
  assert.equal(ui.calls.saves[0][4], 3);
  assert.equal(ui.calls.closes, 0);
  assert.equal(control(ui.instance.tree, "Save reminders").props.disabled, true);
  pending.reject(new Error("Changed on another device. Reopen reminders."));
  await ui.instance.settle();
  assert.match(text(ui.instance.tree), /Changed on another device/);
  assert.equal(control(ui.instance.tree, "Water reminders", "switch").props.value, true);
  control(ui.instance.tree, "Choose water reminder time").props.onPress();
  assert.equal(ui.calls.pickers.at(-1).value.getHours(), 13);
  assert.equal(ui.calls.pickers.at(-1).value.getMinutes(), 45);
});

test("Free users can save workout reminders and see a separate Pro upgrade", async () => {
  const ui = fixture({ isPro: false });
  assert.equal(control(ui.instance.tree, "Workout reminders", "switch").props.disabled, false);
  assert.equal(nodes(ui.instance.tree, (node) => node.type === "Switch").length, 1);
  ui.toggle("Workout reminders", true);
  ui.chooseTime("Choose workout reminder time", 19, 15);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.saves.length, 1);
  assert.equal(ui.calls.saves[0][2].enabled, true);
  assert.equal(ui.calls.saves[0][2].time, "19:15");
  assert.deepEqual(Object.keys(ui.calls.saves[0][2].habits), []);
  assert.equal(ui.calls.closes, 1);
  const upgrade = fixture({ isPro: false });
  control(upgrade.instance.tree, "Explore Pro reminders").props.onPress();
  assert.deepEqual(upgrade.calls.routes, ["/membership"]);
});

test("A followed program owns workout timing, registers push permission, and preserves its timezone", async () => {
  const ui = fixture({ program: enrollment() });
  assert.equal(control(ui.instance.tree, "Workout reminders", "switch").props.value, true);
  ui.chooseTime("Choose workout reminder time", 19, 25);
  ui.save();
  await ui.instance.settle();
  assert.deepEqual(ui.calls.registrations, [[true]]);
  assert.equal(ui.calls.permissions, 1);
  assert.equal(ui.calls.saves.length, 0);
  assert.equal(ui.calls.programs[0][0], "program-a");
  assert.equal(ui.calls.programs[0][1].reminderEnabled, true);
  assert.equal(ui.calls.programs[0][1].hour, 19);
  assert.equal(ui.calls.programs[0][1].minute, 25);
  assert.equal(ui.calls.programs[0][1].timezone, "Asia/Kolkata");
  assert.equal(ui.calls.refreshes, 1);
  assert.equal(ui.calls.reloads, 1);
  assert.equal(ui.calls.closes, 1);
});

test("A program with its reminders off preserves an existing personal workout schedule", async () => {
  const prefs = { ...basePreferences(), enabled: true, time: "17:15" };
  const ui = fixture({ prefs, program: { ...enrollment(), reminder_enabled: false } });
  assert.equal(control(ui.instance.tree, "Workout reminders", "switch").props.value, true);
  control(ui.instance.tree, "Change workout reminder days");
  ui.chooseTime("Choose workout reminder time", 16, 45);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.permissions, 1);
  assert.equal(ui.calls.registrations.length, 0);
  assert.equal(ui.calls.programs.length, 0);
  assert.equal(ui.calls.saves.length, 1);
  assert.equal(ui.calls.saves[0][2].enabled, true);
  assert.equal(ui.calls.saves[0][2].time, "16:45");
  assert.deepEqual(ui.calls.saves[0][2].days, [1, 3, 5]);
  assert.equal(ui.calls.closes, 1);
});

test("A partial personal save is not duplicated when the program update is retried", async () => {
  let attempt = 0;
  const ui = fixture({
    program: enrollment(),
    programSave: async () => {
      if (++attempt === 1) throw new Error("Offline");
    },
  });
  ui.toggle("Water reminders", true);
  ui.chooseTime("Choose workout reminder time", 20, 0);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.saves.length, 1);
  assert.equal(ui.calls.programs.length, 1);
  assert.equal(ui.calls.closes, 0);
  assert.match(text(ui.instance.tree), /Daily reminders saved.*workout reminder could not save/);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.saves.length, 1);
  assert.equal(ui.calls.programs.length, 2);
  assert.equal(ui.calls.closes, 1);
});

test("a draft created without a program retains that captured identity after later habit edits", async () => {
  const ui = fixture();
  ui.toggle("Water reminders", true);
  ui.program.active = { enrollment: enrollment() };
  ui.instance.render();
  assert.equal(control(ui.instance.tree, "Workout reminders", "switch").props.disabled, true);
  ui.toggle("Diet reminders", true);
  assert.equal(control(ui.instance.tree, "Workout reminders", "switch").props.disabled, true);
  assert.match(text(ui.instance.tree), /training program changed/);
  control(ui.instance.tree, "Choose workout reminder time").props.onPress();
  assert.equal(ui.calls.pickers.length, 0);
  ui.save();
  await ui.instance.settle();
  assert.equal(ui.calls.saves.length, 1);
  assert.equal(ui.calls.saves[0][2].enabled, false);
  assert.equal(ui.calls.saves[0][2].time, "18:00");
  assert.deepEqual(ui.calls.saves[0][2].days, [1, 3, 5]);
  assert.equal(ui.calls.saves[0][2].habits.hydration.enabled, true);
  assert.equal(ui.calls.saves[0][2].habits.meals.enabled, true);
  assert.equal(ui.calls.programs.length, 0);
  assert.equal(ui.calls.closes, 1);
});

for (const readiness of ["refreshing", "failed"]) {
  test(`a workout save stops if the program becomes ${readiness} while notification permission is pending`, async () => {
    const permission = deferred();
    const ui = fixture({ program: enrollment(), permission: permission.promise });
    ui.chooseTime("Choose workout reminder time", 19, 0);
    ui.save();
    await tick();
    assert.equal(ui.calls.permissions, 1);
    ui.program.loading = readiness === "refreshing";
    ui.program.error = readiness === "failed" ? "Offline" : "";
    ui.instance.render();
    permission.resolve(true);
    await ui.instance.settle();
    assert.equal(ui.calls.registrations.length, 0);
    assert.equal(ui.calls.programs.length, 0);
    assert.equal(ui.calls.saves.length, 0);
    assert.equal(ui.calls.closes, 0);
    ui.program.loading = false;
    ui.program.error = "";
    ui.instance.render();
    ui.save();
    await ui.instance.settle();
    assert.equal(ui.calls.programs.length, 1);
    assert.equal(ui.calls.programs[0][1].hour, 19);
    assert.equal(ui.calls.closes, 1);
  });
}

for (const change of ["membership", "active program"]) {
  test(`Pending workout saves respect ${change} changes`, async () => {
    const pending = deferred();
    const ui = fixture({ program: enrollment(), register: () => pending.promise });
    ui.chooseTime("Choose workout reminder time", 19, 0);
    ui.save();
    await tick();
    if (change === "membership") ui.billing.isPro = false;
    else ui.program.active = { enrollment: { ...enrollment(), id: "program-b" } };
    ui.instance.render();
    pending.resolve();
    await ui.instance.settle();
    assert.equal(ui.calls.programs.length, 0);
    assert.equal(ui.calls.saves.length, 0);
    assert.equal(ui.calls.closes, 0);
    if (change === "active program")
      assert.match(text(ui.instance.tree), /training program changed/);
  });
}
