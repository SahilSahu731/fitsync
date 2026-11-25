import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as weight from "../src/lib/weight.ts";
import * as achievements from "../src/features/workouts/achievements.ts";
import { workingSetVolume } from "../src/features/workouts/summary.ts";
import { setAppearance } from "../src/features/workouts/set-types.ts";

const code = ts.transpileModule(
  readFileSync(new URL("../src/app/workout/history/[id].tsx", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  },
).outputText;
const set = (kg) => ({
  id: "set",
  set_type: "normal",
  position: 0,
  completed_at: "2026-11-23T10:05:00Z",
  weight_kg: kg,
  reps: 8,
});
const workout = (id, kg, date) => ({
  id,
  name: "Upper body",
  status: "completed",
  started_at: `${date}T10:00:00Z`,
  finished_at: `${date}T11:00:00Z`,
  elapsed_seconds: 3600,
  notes: "",
  workout_session_exercises: [
    {
      id: "exercise",
      exercise_id: "bench",
      exercise_name: "Bench press",
      tracking_type: "reps_weight",
      position: 0,
      workout_logged_sets: [set(kg)],
    },
  ],
});
function render({ pending = false, pro = false, celebrate = "1" } = {}) {
  const Box = ({ children }) => React.createElement("div", null, children);
  const Txt = ({ children }) => React.createElement("span", null, children);
  const Button = ({ children }) => React.createElement("button", null, children);
  const current = workout("current", 100, "2026-11-23");
  const deps = {
    react: React,
    "react/jsx-runtime": jsxRuntime,
    "react-native": {
      ActivityIndicator: () => null,
      View: Box,
      ScrollView: Box,
      Pressable: Button,
      Share: {},
    },
    "expo-router": {
      useRouter: () => ({}),
      useLocalSearchParams: () => ({ id: "current", celebrate }),
    },
    "@expo/vector-icons": { MaterialCommunityIcons: () => null },
    "@/src/components/ui": { Txt },
    "@/src/components/app-dialog": { useAppAlert: () => ({ inviteReview() {} }) },
    "@/src/constants/theme": { C: {} },
    "@/src/context/session": { useSession: () => ({ settings: { weightUnit: "lb" } }) },
    "@/src/lib/weight": weight,
    "@/src/features/progress/use-progress": {
      useProgress: () => ({
        loading: false,
        workoutError: "",
        journal: { workouts: [workout("prior", 90, "2026-11-20")] },
      }),
    },
    "@/src/features/billing/billing-context": { useBilling: () => ({ isPro: pro }) },
    "@/src/features/billing/experience-moments": {
      WorkoutUpgradeMoment: ({ ready }) =>
        ready ? React.createElement("div", null, "Personal workout preview") : null,
    },
    "@/src/features/workouts/workout-context": {
      useWorkout: () => ({
        completedWorkout: current,
        pendingCompletion: pending,
        dataRevision: 0,
      }),
    },
    "@/src/features/workouts/summary": { workingSetVolume },
    "@/src/features/workouts/set-types": { setAppearance },
    "@/src/features/workouts/components/workout-sync-notice": { WorkoutSyncNotice: () => null },
    "@/src/features/workouts/achievements": achievements,
    "@/src/features/experience/review-prompt": {},
    "@/src/features/experience/review-model": {},
    "@/src/services/telemetry": {},
    "@/src/features/workouts/api": {},
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      assert.ok(name in deps, name);
      return deps[name];
    },
  });
  return renderToStaticMarkup(React.createElement(exports.default));
}
test("saved workout shows a real personal best, lb performance, sharing and useful free-to-Pro context", () => {
  const html = render();
  assert.match(html, /1 personal best/);
  assert.match(html, /220.46 lb/);
  assert.match(html, /Share workout/);
  assert.match(html, /Personal workout preview/);
});
test("offline completion is explicit and Pro members get an action for their workspace", () => {
  const html = render({ pending: true, pro: true });
  assert.match(html, /Saved on this device/);
  assert.match(html, /sync when you’re back online/);
  assert.match(html, /Open Pro workspace/);
});
test("ordinary history visits retain performance details without repeating the finish celebration", () => {
  const html = render({ celebrate: "" });
  assert.match(html, /LOGGED PERFORMANCE/);
  assert.doesNotMatch(html, /Share workout|Personal workout preview/);
});
