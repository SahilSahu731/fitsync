import * as weightUnits from "../src/lib/weight.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as coachModel from "../src/features/coaching/model.ts";

const jsx = (type, props) => ({ type, props: props ?? {} });
const find = (node, type) =>
  !node || typeof node !== "object"
    ? []
    : Array.isArray(node)
      ? node.flatMap((item) => find(item, type))
      : [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
const text = (node) =>
  node == null || typeof node === "boolean"
    ? ""
    : typeof node !== "object"
      ? String(node)
      : Array.isArray(node)
        ? node.map(text).join("")
        : text(node.props?.children);
const settle = () => new Promise((resolve) => setImmediate(resolve));
function fixture({ paid = false, seed = [] } = {}) {
  const calls = [],
    states = [...seed];
  let cursor = 0;
  const billing = { isPro: paid, loading: false, refresh: async () => {} };
  const profile = {
    goal: "fitness",
    equipment: "bodyweight",
    experience: "beginner",
    trainingDays: 3,
    minutesPerWorkout: 30,
  };
  const session = {
    profile,
    settings: { workoutReminders: true, weightUnit: "kg" },
    updateFitness: async (value) => calls.push(["fitness", value]),
    reloadMe: async () => {},
  };
  const program = {
    active: null,
    loading: false,
    error: "",
    refresh: async () => calls.push("program-refresh"),
  };
  const workout = {
    session: null,
    busy: false,
    start: async (...args) => calls.push(["workout-start", ...args]),
    ensureSynced: async () => {},
    refresh: async () => {},
  };
  const resource = {
    data: { plan: null },
    loading: false,
    busy: false,
    error: "",
    refresh: async () => {},
    mutate: async (_key, operation) => operation("request"),
    api: {
      create: async (value) => {
        calls.push(["coach-create", value]);
        return {};
      },
      start: async (...args) => {
        calls.push(["coach-start", ...args]);
        return { status: "active" };
      },
    },
  };
  let coachingReads = 0;
  const routing = {
    push: (path) => calls.push(["navigate", path]),
    replace: (path) => calls.push(["replace", path]),
    back() {},
  };
  const dependencies = {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
        return [
          states[index],
          (value) => {
            states[index] = typeof value === "function" ? value(states[index]) : value;
          },
        ];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = { current: initial };
        return states[index];
      },
      useMemo: (operation) => operation(),
      useCallback: (value) => value,
      useEffect() {},
    },
    "react-native": {
      View: "View",
      ScrollView: "ScrollView",
      RefreshControl: "RefreshControl",
      ActivityIndicator: "Loading",
      Pressable: "Pressable",
      Image: "Image",
      Switch: "Switch",
      Platform: { OS: "android" },
    },
    "expo-router": {
      router: routing,
      useRouter: () => routing,
      useLocalSearchParams: () => ({ id: "program" }),
      useFocusEffect() {},
    },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 0, top: 0 }) },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@react-native-community/datetimepicker": "DateTimePicker",
    "@/src/components/ui": { Txt: "Txt", PrimaryButton: "PrimaryButton", Card: "Card" },
    "@/src/constants/theme": { C: { brand: "lime", ink: "white", bg: "black", muted: "gray" } },
    "@/src/components/motion": { MotionPressable: "Pressable" },
    "@/src/components/app-dialog": {
      useAppAlert: () => ({ alert: (...args) => calls.push(["alert", ...args]) }),
    },
    "@/src/context/session": { useSession: () => session },
    "@/src/features/workouts/workout-context": { useWorkout: () => workout },
    "@/src/features/billing/billing-context": { useBilling: () => billing },
    "../billing/billing-context": { useBilling: () => billing },
    "./program-context": { useProgram: () => program },
    "@/src/features/program-follow/program-context": { useProgram: () => program },
    "@/src/features/workouts/components/workout-controls": { WorkoutDrawer: "Drawer" },
    "./api": {
      programFollowApi: {
        follow: async (...args) => {
          calls.push(["follow", ...args]);
          return {};
        },
        reminders: async (...args) => {
          calls.push(["reminders", ...args]);
          return {};
        },
      },
      localDate: () => "2026-11-17",
      localTimezone: () => "Asia/Kolkata",
    },
    "./notifications": {
      registerProgramNotifications: async () => calls.push("notification-permission"),
    },
    "./use-coaching": {
      useCoaching: () => {
        coachingReads++;
        return resource;
      },
    },
    "./model": coachModel,
    "./components": {
      Choice: "Choice",
      CoachHeader: "CoachHeader",
      CoachLink: "CoachLink",
      Notes: "Notes",
    },
    "./progression-sheet": { ProgressionSheet: "ProgressionSheet" },
    "./adapt-sheet": { AdaptSheet: "AdaptSheet" },
    "@/src/features/program-follow/program-setup": { ProgramSetup: "ProgramSetup" },
    "@/src/features/training-catalog/api": {
      catalogApi: { saveProgram: async (id) => calls.push(["save-program", id]) },
    },
  };
  function load(path) {
    const output = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    const exports = {};
    vm.runInNewContext(output, {
      exports,
      Date,
      Intl,
      require(name) {
        if (name === "@/src/lib/weight") return weightUnits;
        if (name === "@/src/services/telemetry" || name === "./telemetry")
          return { trackEvent() {}, recordError() {} };
        if (name === "@/src/components/health-disclaimer") return { HealthDisclaimer: () => null };

        if (name === "react/jsx-runtime") return { jsx, jsxs: jsx, Fragment: "Fragment" };
        if (!(name in dependencies)) throw Error(`Unexpected dependency ${name}`);
        return dependencies[name];
      },
    });
    return exports;
  }
  const upgrade = load("../src/features/program-follow/program-upgrade.tsx");
  dependencies["./program-upgrade"] = upgrade;
  dependencies["../program-follow/program-upgrade"] = upgrade;
  function render(Component, props = {}) {
    cursor = 0;
    const expand = (node) =>
      !node || typeof node !== "object"
        ? node
        : Array.isArray(node)
          ? node.map(expand)
          : typeof node.type === "function"
            ? expand(node.type(node.props))
            : { ...node, props: { ...node.props, children: expand(node.props?.children) } };
    return expand(Component(props));
  }
  return {
    calls,
    billing,
    workout,
    resource,
    program,
    load,
    render,
    get coachingReads() {
      return coachingReads;
    },
  };
}
const slot = (extra) => ({
  id: "slot",
  templateId: "template",
  sessionId: null,
  status: "planned",
  ...extra,
});

test("free program starts open Pro while members start the actual program slot", async () => {
  for (const paid of [false, true]) {
    const f = fixture({ paid });
    const { WorkoutAction } = f.load("../src/features/program-follow/workout-action.tsx");
    find(f.render(WorkoutAction, { slot: slot() }), "Pressable")[0].props.onPress();
    await settle();
    if (paid) {
      assert.equal(f.calls.find((call) => call[0] === "workout-start")[2], "slot");
      assert.deepEqual(f.calls.at(-1), ["navigate", "/workout"]);
    } else assert.deepEqual(f.calls, [["navigate", "/pro"]]);
  }
});

test("membership loading cannot start a program or open checkout prematurely", async () => {
  const f = fixture();
  f.billing.loading = true;
  const { WorkoutAction } = f.load("../src/features/program-follow/workout-action.tsx");
  const button = find(f.render(WorkoutAction, { slot: slot() }), "Pressable")[0];
  assert.equal(button.props.disabled, true);
  button.props.onPress();
  await settle();
  assert.equal(f.calls.length, 0);
});

test("free members can resume active workouts and read completed logs without paid calls", async () => {
  const f = fixture();
  f.billing.loading = true;
  const { WorkoutAction } = f.load("../src/features/program-follow/workout-action.tsx");
  f.workout.session = { id: "active-log" };
  let button = find(
    f.render(WorkoutAction, {
      slot: slot({ status: "active", sessionId: "active-log", templateId: null }),
    }),
    "Pressable",
  )[0];
  assert.equal(button.props.disabled, false);
  button.props.onPress();
  await settle();
  assert.deepEqual(f.calls, [["navigate", "/workout"]]);
  button = find(
    f.render(WorkoutAction, { slot: slot({ status: "completed", sessionId: "old-log" }) }),
    "Pressable",
  )[0];
  button.props.onPress();
  await settle();
  assert.equal(f.calls.at(-1)[1].pathname, "/workout/history/[id]");
  assert.equal(f.calls.at(-1)[1].params.id, "old-log");
  assert.equal(f.calls.filter((call) => call[0] === "workout-start").length, 0);
});

test("direct free program setup shows the paywall without following or requesting notifications", async () => {
  const f = fixture();
  const { ProgramSetup } = f.load("../src/features/program-follow/program-setup.tsx");
  const tree = f.render(ProgramSetup, {
    program: { id: "program", name: "Strength" },
    onClose() {
      f.calls.push(["close"]);
    },
    onSaved() {},
  });
  assert.match(text(tree), /Choose and follow a program with Pro/);
  assert.equal(find(tree, "Switch").length, 0);
  find(tree, "PrimaryButton")[0].props.onPress();
  await settle();
  assert.deepEqual(f.calls, [["close"], ["navigate", "/pro"]]);
});

test("members can follow programs and free prior members can disable existing reminders", async () => {
  const f = fixture({ paid: true });
  const { ProgramSetup } = f.load("../src/features/program-follow/program-setup.tsx");
  let tree = f.render(ProgramSetup, {
    program: { id: "program", name: "Strength" },
    onClose() {},
    onSaved() {},
  });
  find(tree, "Pressable")
    .find((node) => text(node) === "Follow program")
    .props.onPress();
  await settle();
  assert.equal(f.calls.find((call) => call[0] === "follow")[1], "program");
  const g = fixture();
  const Setup = g.load("../src/features/program-follow/program-setup.tsx").ProgramSetup;
  const props = {
    enrollment: {
      id: "enrollment",
      reminder_enabled: true,
      reminder_hour: 18,
      reminder_minute: 0,
      timezone: "Asia/Kolkata",
    },
    onClose() {},
    onSaved() {},
  };
  tree = g.render(Setup, props);
  find(tree, "Switch")[0].props.onValueChange(false);
  tree = g.render(Setup, props);
  find(tree, "Pressable")
    .find((node) => text(node) === "Save reminders")
    .props.onPress();
  await settle();
  const call = g.calls.find((call) => call[0] === "reminders");
  assert.equal(call[1], "enrollment");
  assert.equal(call[2].reminderEnabled, false);
  assert.equal(g.calls.includes("notification-permission"), false);
});

test("free and checking coach setup never mount creation hooks or update fitness", () => {
  for (const checking of [false, true]) {
    const f = fixture();
    f.billing.loading = checking;
    const { CoachSetupScreen } = f.load("../src/features/coaching/setup.tsx");
    const tree = f.render(CoachSetupScreen);
    assert.equal(f.coachingReads, 0);
    assert.equal(find(tree, "Choice").length, 0);
    if (!checking) find(tree, "PrimaryButton")[0].props.onPress();
    assert.deepEqual(f.calls, checking ? [] : [["navigate", "/pro"]]);
  }
});

test("Pro coach setup writes the chosen profile and creates a program", async () => {
  const f = fixture({ paid: true });
  const { CoachSetupScreen } = f.load("../src/features/coaching/setup.tsx");
  const tree = f.render(CoachSetupScreen);
  assert.ok(find(tree, "Choice").length > 0);
  find(tree, "PrimaryButton")
    .find((node) => node.props.title === "Build my starting plan")
    .props.onPress();
  await settle();
  assert.equal(f.calls.filter((call) => call[0] === "fitness").length, 1);
  assert.equal(f.calls.filter((call) => call[0] === "coach-create").length, 1);
  assert.deepEqual(f.calls.at(-1), ["replace", "/coach"]);
});

const coachingPlan = () => ({
  id: "coach-plan",
  name: "Personal plan",
  goal: "fitness",
  equipment: "bodyweight",
  trainingDays: 3,
  minutesPerWorkout: 30,
  explanation: [],
  sessions: [
    {
      id: "coach-day",
      status: "planned",
      date: "2026-11-17",
      week: 1,
      day: 1,
      name: "Session",
      workoutId: null,
      prescription: { minutes: 30, equipment: "bodyweight", exercises: [], explanation: [] },
    },
  ],
});
test("existing coaching plans stay readable while new session starts are paywalled", async () => {
  const f = fixture();
  f.resource.data.plan = coachingPlan();
  const { CoachPlanScreen } = f.load("../src/features/coaching/plan-screen.tsx");
  const tree = f.render(CoachPlanScreen);
  assert.match(text(tree), /Personal plan/);
  find(tree, "PrimaryButton")
    .find((node) => node.props.title === "Continue my program with Pro")
    .props.onPress();
  await settle();
  assert.deepEqual(f.calls, [["navigate", "/pro"]]);
  assert.equal(
    find(tree, "Pressable").filter((node) => node.props.accessibilityRole === "tab").length,
    4,
  );
});

test("Pro coaching starts create a session while an existing free workout resumes directly", async () => {
  for (const paid of [true, false]) {
    const f = fixture({ paid });
    f.resource.data.plan = coachingPlan();
    if (!paid) {
      f.billing.loading = true;
      f.workout.session = { id: "active-workout" };
      f.resource.data.plan.sessions[0].workoutId = "active-workout";
      f.resource.data.plan.sessions[0].status = "active";
    }
    const { CoachPlanScreen } = f.load("../src/features/coaching/plan-screen.tsx");
    const tree = f.render(CoachPlanScreen);
    find(tree, "PrimaryButton")
      .find((node) => node.props.title === (paid ? "Start this session" : "Resume session"))
      .props.onPress();
    await settle();
    assert.equal(f.calls.filter((call) => call[0] === "coach-start").length, paid ? 1 : 0);
    assert.deepEqual(f.calls.at(-1), ["navigate", "/workout"]);
  }
});

const programDetail = {
  id: "program",
  name: "Strength",
  author: "FitSync",
  level: "beginner",
  goal: "strength",
  equipment: "gym",
  days_per_week: 3,
  duration_weeks: 4,
  training_program_days: [],
};
test("Explore descriptions stay readable while Free follow and save open Pro", async () => {
  const f = fixture({ seed: [false, programDetail, false, false, false, "", false, {}] });
  const ProgramDetailScreen = f.load("../src/app/explore/programs/[id].tsx").default;
  const tree = f.render(ProgramDetailScreen);
  assert.match(text(tree), /Strength/);
  find(tree, "Pressable")
    .find((node) => text(node) === "Choose this program · Pro")
    .props.onPress();
  find(tree, "Pressable")
    .find((node) => node.props.accessibilityLabel === "Save program with Pro")
    .props.onPress();
  await settle();
  assert.deepEqual(f.calls, [
    ["navigate", "/pro"],
    ["navigate", "/pro"],
  ]);
  assert.equal(find(f.render(ProgramDetailScreen), "ProgramSetup").length, 0);
});

test("members open follow setup and save from Explore", async () => {
  const f = fixture({
    paid: true,
    seed: [false, programDetail, false, false, false, "", false, {}],
  });
  const ProgramDetailScreen = f.load("../src/app/explore/programs/[id].tsx").default;
  let tree = f.render(ProgramDetailScreen);
  find(tree, "Pressable")
    .find((node) => text(node) === "Follow program")
    .props.onPress();
  tree = f.render(ProgramDetailScreen);
  assert.equal(find(tree, "ProgramSetup").length, 1);
  find(tree, "Pressable")
    .find((node) => node.props.accessibilityLabel === "Save program")
    .props.onPress();
  await settle();
  assert.ok(f.calls.some((call) => call[0] === "save-program" && call[1] === "program"));
});

test("checking membership blocks Explore mutations but prior program progress remains accessible", async () => {
  const f = fixture({ seed: [false, programDetail, false, false, false, "", false, {}] });
  f.billing.loading = true;
  const ProgramDetailScreen = f.load("../src/app/explore/programs/[id].tsx").default;
  let tree = f.render(ProgramDetailScreen);
  const choose = find(tree, "Pressable").find((node) => text(node) === "Checking membership…");
  assert.equal(choose.props.disabled, true);
  choose.props.onPress();
  const save = find(tree, "Pressable").find(
    (node) => node.props.accessibilityLabel === "Save program with Pro",
  );
  assert.equal(save.props.disabled, true);
  save.props.onPress();
  await settle();
  assert.equal(f.calls.length, 0);
  f.program.active = { enrollment: { id: "previous-enrollment", program_id: "program" } };
  tree = f.render(ProgramDetailScreen);
  find(tree, "Pressable")
    .find((node) => text(node) === "View my progress")
    .props.onPress();
  assert.equal(f.calls.at(-1)[1].pathname, "/programs/[id]");
  assert.equal(f.calls.at(-1)[1].params.id, "previous-enrollment");
});
