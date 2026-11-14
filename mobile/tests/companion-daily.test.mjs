import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {
  effectiveReadiness,
  todayBriefing,
  milestoneProgress,
} from "../src/features/companion/model.ts";
import * as progressModel from "../src/features/progress/model.ts";
import { programFocus } from "../src/features/program-follow/program-view.ts";
import { workoutDate } from "../src/features/progress/analytics.ts";

const TODAY = "2026-11-16";
const metric = (id, name, value, date = TODAY, observedAt = `${TODAY}T08:00:00Z`) => ({
  id,
  kind: "metric",
  metric: name,
  value,
  date,
  observedAt,
  notes: "",
  source: "manual",
});
const set = (extra = {}) => ({
  id: "set",
  set_type: "normal",
  weight_kg: 60,
  reps: 8,
  duration_seconds: null,
  distance_meters: null,
  rpe: null,
  rir: null,
  completed_at: `${TODAY}T08:00:00Z`,
  ...extra,
});
const workout = (id, date, extra = {}) => ({
  id,
  name: id,
  status: "completed",
  started_at: `${date}T08:00:00Z`,
  finished_at: `${date}T09:00:00Z`,
  elapsed_seconds: 600,
  workout_session_exercises: [
    {
      id: `${id}-row`,
      exercise_id: "bench",
      exercise_name: "Bench",
      tracking_type: "reps_weight",
      position: 0,
      workout_logged_sets: [set()],
    },
  ],
  ...extra,
});
const day = (extra = {}) => ({
  id: "day",
  revision: 1,
  date: TODAY,
  status: "planned",
  name: "Upper",
  workoutId: null,
  week: 1,
  day: 1,
  prescription: {
    minutes: 45,
    effort: "normal",
    explanation: ["Balanced session"],
    exercises: [{ exerciseId: "bench", trackingType: "reps_weight", name: "Bench", sets: 3 }],
  },
  ...extra,
});
const plan = (sessions = [day()]) => ({
  id: "plan",
  name: "My plan",
  trainingDays: 3,
  timezone: "UTC",
  sessions,
});
const record = (data, extra = {}) => ({
  id: "readiness",
  kind: "readiness",
  date: TODAY,
  revision: 1,
  data,
  ...extra,
});
function load(file, dependencies = {}) {
  const exports = {};
  const js = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(js, {
    exports,
    Date,
    Error,
    Promise,
    Intl,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}
function find(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((child) => find(child, type));
  return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("daily check-in uses the latest shared corrections and tombstones instead of stale snapshot values", () => {
  const snapshot = record({
    sleepHours: 5,
    energy: 1,
    availableMinutes: 30,
    soreness: [{ muscle: "chest", level: 2 }],
  });
  const events = [
    metric("sleep-new", "sleep", 8, TODAY, `${TODAY}T09:00:00Z`),
    metric("sleep-old", "sleep", 6),
    metric("energy-old", "energy", 2),
    metric("energy-new", "energy", 4, TODAY, `${TODAY}T10:00:00Z`),
    metric("future", "sleep", 1, "2026-11-17"),
  ];
  const value = effectiveReadiness(snapshot, events, TODAY);
  assert.equal(value.sleepHours, 8);
  assert.equal(value.energy, 4);
  assert.equal(value.availableMinutes, 30);
  assert.equal(value.soreness[0].level, 2);
  const removed = effectiveReadiness(
    snapshot,
    [
      ...events,
      metric("sleep-delete", "sleep", null, TODAY, `${TODAY}T11:00:00Z`),
      metric("energy-delete", "energy", null, TODAY, `${TODAY}T11:00:00Z`),
    ],
    TODAY,
  );
  assert.equal(removed.sleepHours, undefined);
  assert.equal(removed.energy, undefined);
  assert.equal(
    effectiveReadiness(record({ energy: 1 }, { date: "2026-11-15" }), [], TODAY).energy,
    undefined,
  );
});
test("briefing previous performance requires matching exercise identity, tracking type and completed working sets", () => {
  const matching = workout("matching", "2026-11-14");
  const wrongType = workout("wrong-type", "2026-11-15");
  wrongType.workout_session_exercises[0].tracking_type = "reps";
  const warmups = workout("warmups", TODAY);
  warmups.workout_session_exercises[0].workout_logged_sets = [set({ set_type: "warmup" })];
  const unlogged = workout("unlogged", TODAY);
  unlogged.workout_session_exercises[0].workout_logged_sets = [set({ completed_at: null })];
  const result = todayBriefing(
    plan(),
    [
      matching,
      wrongType,
      warmups,
      unlogged,
      workout("future", "2026-11-17"),
      workout("active", TODAY, { status: "active" }),
    ],
    TODAY,
    {},
  );
  assert.equal(result.previous.id, "matching");
  assert.equal(todayBriefing(plan(), [wrongType, warmups, unlogged], TODAY, {}).previous, null);
});
test("rest-day briefing has a next session without moving that session onto today", () => {
  const result = todayBriefing(plan([day({ date: "2026-11-18", id: "next" })]), [], TODAY, {
    energy: 2,
  });
  assert.equal(result.restDay, true);
  assert.equal(result.day, null);
  assert.equal(result.next.id, "next");
  assert.equal(result.suggestion, null);
  const completed = todayBriefing(
    plan([day({ date: "2026-11-18" })]),
    [workout("done", TODAY)],
    TODAY,
    {},
  );
  assert.equal(completed.restDay, false);
  assert.equal(completed.completedToday.length, 1);
});
test("consistency milestones include exactly seven local dates and count each completed workout once", () => {
  const today = workout("today", TODAY),
    start = workout("start", "2026-11-10");
  const result = milestoneProgress(
    { type: "consistency", target: 2 },
    [
      today,
      today,
      start,
      workout("old", "2026-11-09"),
      workout("future", "2026-11-17"),
      workout("active", TODAY, { status: "active" }),
    ],
    [],
    TODAY,
  );
  assert.equal(result.current, 2);
  assert.equal(result.achieved, true);
  assert.equal(result.percent, 100);
  assert.match(result.evidence, /2026-11-10 to 2026-11-16/);
});
test("decreasing measurement milestones use corrected readings, a decreasing baseline and deadlines", () => {
  const goal = {
    type: "measurement",
    metric: "weight",
    target: 80,
    baseline: 90,
    deadline: "2026-11-15",
  };
  const readings = [
    metric("old", "weight", 88, "2026-11-14"),
    metric("new", "weight", 85),
    metric("future", "weight", 70, "2026-11-17"),
  ];
  const result = milestoneProgress(goal, [], readings, TODAY);
  assert.equal(result.current, 85);
  assert.equal(result.percent, 50);
  assert.equal(result.achieved, false);
  assert.equal(result.overdue, true);
  const corrected = milestoneProgress(
    goal,
    [],
    [...readings, metric("correction", "weight", 79, TODAY, `${TODAY}T11:00:00Z`)],
    TODAY,
  );
  assert.equal(corrected.percent, 100);
  assert.equal(corrected.achieved, true);
  assert.equal(corrected.overdue, false);
  const removed = milestoneProgress(
    goal,
    [],
    [...readings, metric("delete", "weight", null, TODAY, `${TODAY}T11:00:00Z`)],
    TODAY,
  );
  assert.equal(removed.current, 88);
  assert.equal(removed.percent, 20);
  assert.equal(milestoneProgress(goal, [], [], TODAY).percent, null);
});
test("strength milestones use actual working-set load and exclude warmups, invalid reps and other tracking types", () => {
  const good = workout("valid", TODAY);
  good.workout_session_exercises[0].workout_logged_sets.push(
    set({ weight_kg: 500, set_type: "warmup" }),
    set({ weight_kg: 600, completed_at: null }),
    set({ weight_kg: 700, reps: 0 }),
  );
  const other = workout("bodyweight", TODAY);
  other.workout_session_exercises[0].tracking_type = "reps";
  other.workout_session_exercises[0].workout_logged_sets = [set({ weight_kg: 800 })];
  const result = milestoneProgress(
    { type: "strength", exerciseId: "bench", target: 70, baseline: 50 },
    [good, other],
    [],
    TODAY,
  );
  assert.equal(result.current, 60);
  assert.equal(result.percent, 50);
  assert.equal(result.achieved, false);
});

function cardFixture(options = {}) {
  const slots = [],
    calls = [];
  let cursor = 0,
    tree;
  const companion = { state: { records: [record({ energy: 1, availableMinutes: 30 })] } };
  const progress = { journal: { events: [], workouts: [] } };
  const program = { active: null };
  const workoutState = {
    session: null,
    busy: false,
    ensureSynced: async () => calls.push(["ensure-synced"]),
    refresh: async () => {},
  };
  const coaching = {
    data: { plan: plan() },
    error: null,
    refresh: async () => {},
    api: {
      start: async (id) => {
        calls.push(["start", id]);
        return { status: "active" };
      },
      adapt: async (selected, request, input) => {
        calls.push(["adapt", selected.revision, { ...input }]);
        if (options.adaptGate) await options.adaptGate;
        const copy = JSON.parse(JSON.stringify(coaching.data.plan));
        const selectedDay = copy.sessions.find((item) => item.id === selected.id);
        selectedDay.prescription.minutes = input.minutes ?? selectedDay.prescription.minutes;
        selectedDay.prescription.effort = input.effort ?? selectedDay.prescription.effort;
        return copy;
      },
    },
    mutate: async (key, action, apply) => {
      calls.push(["mutate", key]);
      const value = await action("request");
      if (apply) coaching.data.plan = apply(value);
      return value;
    },
  };
  const jsx = (type, props) => ({ type, props });
  const module = load("../src/features/companion/today-card.tsx", {
    react: {
      useMemo: (callback) => callback(),
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
        return [
          slots[index],
          (value) => {
            slots[index] = typeof value === "function" ? value(slots[index]) : value;
          },
        ];
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View" },
    "expo-router": { router: { push: (path) => calls.push(["route", path]) } },
    "@/src/components/ui": { Txt: "Txt" },
    "@/src/components/app-dialog": {
      useAppAlert: () => ({ alert: (...args) => calls.push(["alert", ...args]) }),
    },
    "../billing/billing-context": { useBilling: () => ({ isPro: true }) },
    "../progress/use-progress": { useProgress: () => progress },
    "../progress/model": { localDate: () => TODAY, dateLabel: (date) => date },
    "../progress/analytics": { workoutDate },
    "../workouts/workout-context": { useWorkout: () => workoutState },
    "../coaching/use-coaching": { useCoaching: () => coaching },
    "../pro/ui": { GlassCard: "Card", ProAction: "Action", ProButton: "Button", PRO: {} },
    "./companion-context": { useCompanion: () => companion },
    "./model": { effectiveReadiness, todayBriefing },
    "../program-follow/program-context": { useProgram: () => program },
    "../program-follow/program-view": { programFocus },
    "../program-follow/workout-action": { WorkoutAction: "WorkoutAction" },
    "../pro/companion-insights": { suggestWorkingSetTargets: () => null },
  });
  function render() {
    cursor = 0;
    tree = module.TodayForYouCard();
    if (typeof tree.type === "function") tree = tree.type(tree.props);
    return tree;
  }
  const button = (title) => find(tree, "Button").find((item) => item.props.title === title);
  async function settle() {
    await tick();
    render();
  }
  async function preview() {
    button("Why this suggestion?").props.onPress();
    render();
    button("Preview session changes").props.onPress();
    await settle();
  }
  render();
  return {
    get tree() {
      return tree;
    },
    companion,
    progress,
    program,
    workout: workoutState,
    coaching,
    calls,
    render,
    button,
    settle,
    preview,
  };
}
test("an active workout resumes from a rest-day card and does not start another plan session", async () => {
  const fixture = cardFixture();
  fixture.coaching.data.plan = plan([day({ date: "2026-11-18" })]);
  fixture.workout.session = { id: "active", name: "My ongoing workout" };
  fixture.render();
  fixture.button("Resume workout").props.onPress();
  await fixture.settle();
  assert.ok(fixture.calls.some((call) => call[0] === "route" && call[1] === "/workout"));
  assert.equal(
    fixture.calls.some((call) => call[0] === "start"),
    false,
  );
});
test("a true rest day reviews progress without starting an upcoming session", async () => {
  const fixture = cardFixture();
  fixture.coaching.data.plan = plan([day({ date: "2026-11-18" })]);
  fixture.render();
  fixture.button("Review my week").props.onPress();
  await fixture.settle();
  assert.ok(fixture.calls.some((call) => call[0] === "route" && call[1] === "/(tabs)/progress"));
  assert.equal(
    fixture.calls.some((call) => call[0] === "start"),
    false,
  );
});
test("a readiness preview applies exactly its reviewed payload and plan revision", async () => {
  const fixture = cardFixture();
  await fixture.preview();
  assert.ok(fixture.button("Accept these changes"));
  fixture.button("Accept these changes").props.onPress();
  await fixture.settle();
  const calls = fixture.calls.filter((call) => call[0] === "adapt");
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1], 1);
  assert.equal(calls[1][1], 1);
  assert.deepEqual(calls[0][2], { minutes: 30, effort: "easy", preview: true });
  assert.deepEqual(calls[1][2], { minutes: 30, effort: "easy" });
});
test("changing readiness inputs, shared metrics or the saved plan revision invalidates a displayed preview", async () => {
  for (const change of ["readiness", "shared-metric", "revision"]) {
    const fixture = cardFixture();
    await fixture.preview();
    assert.ok(fixture.button("Accept these changes"));
    if (change === "readiness")
      fixture.companion.state.records = [
        record({ energy: 1, availableMinutes: 20 }, { revision: 2 }),
      ];
    else if (change === "shared-metric")
      fixture.progress.journal.events = [metric("energy-correction", "energy", 5)];
    else fixture.coaching.data.plan.sessions[0] = day({ revision: 2 });
    fixture.render();
    assert.equal(fixture.button("Accept these changes"), undefined);
    assert.equal(fixture.calls.filter((call) => call[0] === "adapt").length, 1);
  }
});
test("a preview arriving after a readiness change cannot become an applicable new recommendation", async () => {
  let resolve;
  const gate = new Promise((done) => {
    resolve = done;
  });
  const fixture = cardFixture({ adaptGate: gate });
  await fixture.preview();
  assert.equal(fixture.button("Accept these changes"), undefined);
  fixture.companion.state.records = [record({ energy: 2, availableMinutes: 20 }, { revision: 2 })];
  fixture.render();
  resolve();
  await fixture.settle();
  assert.equal(fixture.button("Accept these changes"), undefined);
  assert.equal(fixture.calls.filter((call) => call[0] === "adapt").length, 1);
});
test("followed program sessions take priority over a separate coaching plan", () => {
  const fixture = cardFixture();
  fixture.program.active = {
    enrollment: { id: "enrollment", status: "active", start_date: TODAY, duration_weeks: 4 },
    today: TODAY,
    slots: [
      {
        id: "slot",
        date: TODAY,
        status: "planned",
        routineName: "Program lower body",
        week: 1,
        day: 1,
      },
    ],
  };
  fixture.render();
  assert.equal(find(fixture.tree, "WorkoutAction")[0].props.slot.id, "slot");
  assert.equal(fixture.button("Start today’s session"), undefined);
});
test("a failing journal subscriber cannot turn a persisted save into failure or block other screens", async () => {
  const data = new Map(),
    received = [];
  const journal = load("../src/features/progress/journal.ts", {
    "@react-native-async-storage/async-storage": {
      getItem: async (key) => data.get(key) ?? null,
      setItem: async (key, value) => data.set(key, value),
    },
    "@/src/services/api": {
      apiRequest: async () => {
        throw Error("No network expected");
      },
    },
    "./model": progressModel,
  });
  journal.subscribeJournal(() => {
    throw new Error("Unmounted screen failed");
  });
  journal.subscribeJournal((owner, value) => received.push([owner, value.events.length]));
  await journal.appendEvent("alice", metric("sleep", "sleep", 8));
  assert.equal((await journal.readJournal("alice")).events[0].value, 8);
  assert.deepEqual(received, [["alice", 1]]);
  assert.equal((await journal.readJournal("bob")).events.length, 0);
});
test("a failing coaching subscriber does not block another screen from refreshing after a committed change", () => {
  const bus = load("../src/features/coaching/updates.ts"),
    calls = [];
  bus.subscribeCoachingChange(() => {
    throw new Error("A view failed");
  });
  bus.subscribeCoachingChange(() => calls.push("refreshed"));
  assert.doesNotThrow(() => bus.publishCoachingChange());
  assert.deepEqual(calls, ["refreshed"]);
});
