import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const jsx = (type, props) => ({ type, props });
const find = (node, type) =>
  !node || typeof node !== "object"
    ? []
    : Array.isArray(node)
      ? node.flatMap((item) => find(item, type))
      : [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
const textOf = (node) =>
  node == null
    ? ""
    : Array.isArray(node)
      ? node.map(textOf).join(" ")
      : typeof node === "object"
        ? textOf(node.props?.children)
        : String(node);
function load(file, dependencies) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      Date,
      require: (name) => {
        if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
        return dependencies[name];
      },
    },
  );
  return exports;
}
const workspace = load("../src/features/companion/workspace-ui.tsx", {
  react: {},
  "react/jsx-runtime": { jsx, jsxs: jsx },
  "react-native": { View: "View", ScrollView: "Scroll" },
  "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
  "@/src/components/motion": { MotionPressable: "Pressable" },
  "@/src/components/ui": { Txt: "Txt" },
  "../pro/hub-ui": { PRO: { muted: "#A3A3A3", accent: "#C5F460" } },
});

test("every Companion destination remains available in exactly one group", () => {
  const tabs = workspace.COMPANION_GROUPS.flatMap((group) => group.tabs);
  assert.equal(new Set(tabs).size, workspace.COMPANION_TABS.length);
  assert.deepEqual([...tabs].sort(), [...workspace.COMPANION_TABS].sort());
  for (const tab of tabs) assert.ok(workspace.COMPANION_SECTIONS[tab]?.label);
});

test("deep links select their group, while group and section presses retain canonical tab values", () => {
  const selected = [];
  const tree = workspace.CompanionNavigation({
    tab: "focus",
    onSelect: (tab) => selected.push(tab),
  });
  const buttons = find(tree, "Pressable");
  assert.equal(
    buttons.find((button) => button.props.accessibilityLabel === "Training sections").props
      .accessibilityState.selected,
    true,
  );
  assert.equal(
    buttons.find((button) => button.props.accessibilityLabel === "Muscle focus").props
      .accessibilityState.selected,
    true,
  );
  buttons.find((button) => button.props.accessibilityLabel === "Training sections").props.onPress();
  buttons.find((button) => button.props.accessibilityLabel === "Milestones").props.onPress();
  buttons.find((button) => button.props.accessibilityLabel === "Health sections").props.onPress();
  buttons.find((button) => button.props.accessibilityLabel === "More sections").props.onPress();
  assert.deepEqual(selected, ["focus", "goals", "nutrition", "reminders"]);
});

test("Today shows real check-in readings, leaves missing readings empty, and links to check-in and food planning", () => {
  const selected = [];
  const tree = workspace.CompanionDayBrief({
    name: "Alex Rivera",
    date: "2026-11-18",
    readiness: { sleepHours: 7.5, energy: 4 },
    hasCheckIn: true,
    onSelect: (tab) => selected.push(tab),
  });
  assert.match(textOf(tree), /Alex/);
  assert.match(textOf(tree), /7\.5 h/);
  assert.match(textOf(tree), /4\/5/);
  assert.match(textOf(tree), /—/);
  find(tree, "Pressable")[0].props.onPress();
  const shortcuts = workspace.CompanionShortcuts({ onSelect: (tab) => selected.push(tab) });
  for (const button of find(shortcuts, "Pressable")) button.props.onPress();
  assert.deepEqual(selected, ["readiness", "nutrition", "reminders"]);
});

function screenFixture(tab = "today", isPro = true) {
  const calls = [];
  const records = [];
  const params = { tab };
  const react = {
    useRef: () => ({ current: null }),
    useEffect() {},
    useCallback: (fn) => fn,
  };
  const dependencies = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react,
    "react-native": {
      View: "View",
      ScrollView: "Scroll",
      RefreshControl: "Refresh",
      ActivityIndicator: "Loading",
    },
    "expo-router": {
      router: {
        setParams: (next) => calls.push(next),
        push: (route) => calls.push(route),
        canGoBack: () => false,
      },
      useLocalSearchParams: () => params,
      useFocusEffect() {},
    },
    "expo-image-picker": {},
    "expo-linking": {},
    "@react-native-community/slider": {},
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/components/motion": { MotionPressable: "Pressable" },
    "@/src/components/app-dialog": {},
    "@/src/context/session": { useSession: () => ({ user: { id: "owner", name: "Alex" } }) },
    "../billing/billing-context": { useBilling: () => ({ isPro }) },
    "../progress/use-progress": {
      useProgress: () => ({ journal: { events: [], workouts: [] }, refresh() {} }),
    },
    "../progress/model": { localDate: () => "2026-11-18" },
    "../coaching/model": {},
    "../pro/use-pro-catalog": { useProCatalog: () => ({ items: [], refresh() {} }) },
    "../pro/analytics": {},
    "../pro/companion-insights-panel": { CompanionInsightsPanel: "Insights" },
    "../pro/hub-ui": Object.fromEntries(
      ["GlassCard", "ProAction", "ProButton", "ProPill", "ProScene", "ProSection"].map((name) => [
        name,
        name,
      ]),
    ),
    "../nutrition/food-diary": { FoodDiaryPanel: "FoodDiary" },
    "./monthly-report": { MonthlyReportPanel: "MonthlyReport" },
    "../progress/keyboard-visibility": {
      useKeyboardForm: () => ({
        viewportRef: { current: null },
        scrollRef: { current: null },
        bottomInset: 0,
        onViewportLayout() {},
        onFocus() {},
        onScroll() {},
        revealInput() {},
      }),
    },
    "./companion-context": { useCompanion: () => ({ state: { records }, refresh() {} }) },
    "./model": { effectiveReadiness: () => ({}) },
    "./today-card": { TodayForYouCard: "TodayCard" },
    "./reminders-panel": { ReminderSettingsPanel: "Reminders" },
    "./focus-panel": { FocusPanel: "Focus" },
    "./use-goal-exercises": {},
    "../progress/journal": {},
    "../workouts/workout-context": {},
    "../coaching/use-coaching": { useCoaching: () => ({ data: { plan: null } }) },
    "../program-follow/program-context": { useProgram: () => ({ active: null }) },
    "./workspace-ui": {
      ...workspace,
      CompanionNavigation: "Navigation",
      CompanionDayBrief: "DayBrief",
      CompanionShortcuts: "Shortcuts",
    },
  };
  dependencies["../pro/hub-ui"].PRO = { accent: "#C5F460" };
  const { CompanionScreen } = load("../src/features/companion/screen.tsx", dependencies);
  const account = CompanionScreen();
  return { tree: account.type(account.props), calls };
}

test("Companion keeps direct food, focus, and reminder routes and gates Pro insights", () => {
  const nutrition = screenFixture("nutrition");
  assert.equal(find(nutrition.tree, "FoodDiary").length, 1);
  const focus = screenFixture("focus");
  assert.equal(find(focus.tree, "Focus").length, 1);
  const reminders = screenFixture("reminders");
  assert.equal(find(reminders.tree, "Reminders").length, 1);
  assert.equal(find(screenFixture("insights", true).tree, "Insights").length, 1);
  assert.equal(find(screenFixture("insights", false).tree, "Insights").length, 0);
  const invalid = screenFixture("unknown");
  assert.equal(find(invalid.tree, "Navigation")[0].props.tab, "today");
  find(invalid.tree, "Navigation")[0].props.onSelect("nutrition");
  assert.equal(invalid.calls[0].tab, "nutrition");
});
