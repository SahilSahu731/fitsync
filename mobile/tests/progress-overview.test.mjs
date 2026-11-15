import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(file, deps = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.React } }).outputText, { exports, Date, Intl, require: name => { if (!(name in deps)) throw Error(name); return deps[name]; } });
  return exports;
}
const model = load('../src/features/progress/model.ts');
const { buildProgress } = load('../src/features/progress/analytics.ts', { './model': model });
const react = { createElement: (type, props, ...children) => typeof type === 'function' ? type({ ...props, children }) : ({ type, props: props ?? {}, children }), Fragment: 'fragment' };
const component = name => props => ({ type: name, props, children: props.children ?? [] });
const { ProgressOverview } = load('../src/features/progress/overview.tsx', {
  react, 'react-native': { View: 'View' }, 'react-native-svg': { __esModule: true, default: 'Svg', Path: 'Path', Circle: 'Circle' },
  '@/src/components/motion': { MotionPressable: 'Pressable' }, '@/src/components/ui': { Txt: 'Text' }, '@/src/constants/theme': { C: {} }, './model': model,
  './visuals': { Icon: component('Icon'), SectionTitle: component('SectionTitle'), SmallButton: component('SmallButton') },
  './tracking-cards': { compact: String, displayMetric: (_, value) => value === null ? '—' : String(value) },
});
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.children)] : []; }
function text(n) { return Array.isArray(n) ? n.map(text).join(' ') : n && typeof n === 'object' ? text(n.children) : String(n ?? ''); }
function render(extra = {}) {
  const calls = [];
  const props = { data: buildProgress([], [], 30, '2026-11-15', 3), goals: { weeklyWorkouts: 3, water: 2000 }, unit: 'kg', today: '2026-11-15', dateTitle: 'Today', daily: () => null, weights: [], canLog: true, trainingAvailable: true, waterBusy: false,
    ...Object.fromEntries(['onLog', 'onMetric', 'onNutrition', 'onHealth', 'onTraining', 'onExercise', 'onTrain', 'onHistory', 'onWater'].map(key => [key, value => calls.push([key, value])])), ...extra };
  const tree = ProgressOverview(props);
  return { tree, nodes: nodes(tree), calls };
}
test('new user sees starting actions and missing values without invented progress', () => {
  const v = render();
  assert.match(text(v.tree), /Your first log sets your baseline/);
  assert.match(text(v.tree), /Finish a workout/);
  assert.match(text(v.tree), /—/);
  v.nodes.find(n => n.props.label === 'Start your first workout').props.onPress();
  assert.deepEqual(v.calls, [['onTrain', undefined]]);
});
test('tracking actions open the intended detail or editor', () => {
  const v = render();
  v.nodes.find(n => n.props.accessibilityLabel === 'Log weight').props.onPress();
  v.nodes.find(n => n.props.accessibilityLabel?.startsWith('Water,')).props.onPress();
  v.nodes.find(n => n.props.accessibilityLabel === 'Log protein').props.onPress();
  v.nodes.find(n => n.props.accessibilityLabel === 'Nutrition totals and nutrient tracking').props.onPress();
  v.nodes.find(n => n.props.accessibilityLabel?.startsWith('Add 250 milliliters')).props.onPress();
  assert.deepEqual(v.calls, [['onLog', 'weight'], ['onMetric', 'water'], ['onLog', 'protein'], ['onNutrition', undefined], ['onWater', undefined]]);
});
test('storage loading disables logging and failed training does not look like a new user', () => {
  const v = render({ canLog: false, trainingAvailable: false });
  for (const label of ['Log weight', 'Log water', 'Log protein']) assert.equal(v.nodes.find(n => n.props.accessibilityLabel === label).props.disabled, true);
  assert.doesNotMatch(text(v.tree), /Start with one workout|See what’s getting stronger/);
});
test('exercise preview compares real sessions in the selected weight unit and opens that exercise', () => {
  const exercise = { id: 'bench:reps_weight', name: 'Bench press', type: 'reps_weight', sessions: [
    { timestamp: '2026-11-10T10:00:00Z', date: '2026-11-10', load: 50 },
    { timestamp: '2026-11-14T10:00:00Z', date: '2026-11-14', load: 55 },
  ] };
  const data = buildProgress([], [], 30, '2026-11-15', 3);
  data.exercises = [exercise];
  const v = render({ data, unit: 'lb' });
  assert.match(text(v.tree), /lb · last session/);
  assert.match(text(v.tree), /\+11\.023/);
  const row = v.nodes.find(n => n.type === 'Pressable' && text(n).includes('Bench press'));
  row.props.onPress();
  assert.deepEqual(v.calls, [['onExercise', 'bench:reps_weight']]);
});
