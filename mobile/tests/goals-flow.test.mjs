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
const { goalsToDraft, parseGoalsDraft } = load('../src/features/progress/goal-draft.ts', { './model': model });
const { goalStatuses } = load('../src/features/progress/goal-status.ts', { './model': model });
const event = (metric, value, date = '2026-11-15') => ({ id: `${metric}-${date}`, kind: 'metric', metric, value, date, observedAt: `${date}T12:00:00Z`, source: 'manual', notes: '' });
const workout = (id, date, status = 'completed') => ({ id, status, started_at: `${date}T08:00:00Z`, finished_at: status === 'completed' ? `${date}T09:00:00Z` : null });
test('default onboarding frequency is not a user-confirmed goal', () => {
  assert.equal(model.currentGoals([], 4).weeklyWorkouts, 4);
  assert.equal(model.hasSavedGoals([]), false);
  assert.equal(model.hasSavedGoals([event('water', 250)]), false);
  assert.equal(model.hasSavedGoals([{ kind: 'goals', goals: model.defaultGoals(4) }]), true);
});
test('optional targets remain unset and editing pounds converts to stored kilograms', () => {
  const draft = goalsToDraft(model.defaultGoals(3), 'lb');
  assert.equal(Object.values(draft).filter(Boolean).length, 1);
  draft.weight = '154.324'; draft.water = '2000';
  const saved = parseGoalsDraft(draft, 'lb');
  assert.ok(Math.abs(saved.weight - 70) < .01);
  assert.equal(saved.water, 2000);
  assert.equal(saved.caloriesIn, null);
  draft.weight = ''; assert.equal(parseGoalsDraft(draft, 'lb').weight, null);
  draft.weeklyWorkouts = '15'; assert.throws(() => parseGoalsDraft(draft, 'lb'), /1 and 14/);
  draft.weeklyWorkouts = '3'; draft.water = '0'; assert.throws(() => parseGoalsDraft(draft, 'lb'), /water target/);
});
test('goals use completed workouts this week and daily corrections without fabricated check-ins', () => {
  const goals = { ...model.defaultGoals(3), water: 2000, protein: 100, weight: 70 };
  const events = [event('water', 500, '2026-11-14'), event('water', 1000), { ...event('water', 2000), id: 'correction', observedAt: '2026-11-15T13:00:00Z' }, event('weight', 76, '2026-11-14')];
  const rows = goalStatuses(goals, events, [workout('old', '2026-11-08'), workout('one', '2026-11-09'), workout('two', '2026-11-15'), workout('active', '2026-11-15', 'active'), workout('future', '2026-11-16')], 'kg', '2026-11-15');
  assert.equal(rows.find(row => row.key === 'weeklyWorkouts').value, 2);
  assert.equal(rows.find(row => row.key === 'water').value, 2000);
  assert.equal(rows.find(row => row.key === 'water').reached, true);
  assert.equal(rows.find(row => row.key === 'protein').value, null);
  assert.equal(rows.find(row => row.key === 'protein').ratio, null);
  assert.equal(rows.find(row => row.key === 'weight').ratio, null);
  assert.equal(rows.find(row => row.key === 'weight').reached, false);
});
const react = { createElement: (type, props, ...children) => typeof type === 'function' ? type({ ...props, children }) : { type, props: props ?? {}, children }, Fragment: 'fragment' };
const component = name => props => ({ type: name, props, children: props.children ?? [] });
const { GoalsSummary } = load('../src/features/progress/goals-summary.tsx', { react, 'react-native': { ActivityIndicator: 'Loading', View: 'View' }, '@/src/components/ui': { Txt: 'Text' }, '@/src/components/motion': { ProgressFill: 'Bar' }, './editors': { Sheet: component('Sheet') }, './visuals': { Icon: 'Icon', SmallButton: component('Button') }, './goal-status': { goalStatuses } });
function nodes(n) { return Array.isArray(n) ? n.flatMap(nodes) : n && typeof n === 'object' ? [n, ...nodes(n.children)] : []; }
test('summary is read-only and offers setup or editing according to confirmed goals', () => {
  let edits = 0;
  const props = { goals: model.defaultGoals(3), events: [], workouts: [], unit: 'kg', loading: false, error: '', onEdit: () => edits++, onClose() {}, onRetry() {} };
  const unset = nodes(GoalsSummary({ ...props, hasGoals: false }));
  unset.find(n => n.props.label === 'Set my goals').props.onPress();
  assert.equal(unset.some(n => n.type === 'Bar'), false);
  const saved = nodes(GoalsSummary({ ...props, hasGoals: true }));
  saved.find(n => n.props.label === 'Edit goals').props.onPress();
  assert.equal(saved.some(n => n.type === 'TextInput'), false);
  assert.equal(edits, 2);
});
function homeHarness({ seen = false, deferred = false } = {}) {
  const state = []; let cursor = 0; let callback; let cleanup; const routes = []; const writes = []; const reads = [];
  let resolveRead;
  const deferredRead = new Promise(resolve => { resolveRead = resolve; });
  const react = { ...globalReact(), useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], next => { state[index] = next; }]; }, useCallback(fn, deps) { fn.deps = deps; return fn; } };
  function globalReact() { return { createElement: (type, props, ...children) => typeof type === 'function' ? type({ ...props, children }) : { type, props: props ?? {}, children }, Fragment: 'fragment' }; }
  const module = load('../src/features/progress/home-goals.tsx', { react, 'react-native': { View: 'View' }, '@react-native-async-storage/async-storage': { getItem: key => { reads.push(key); return deferred ? deferredRead : Promise.resolve(seen ? 'seen' : null); }, setItem: (key, value) => { writes.push([key, value]); return Promise.resolve(); } }, 'expo-router': { useRouter: () => ({ push: route => routes.push(route) }), useFocusEffect: fn => { if (!callback || JSON.stringify(fn.deps) !== JSON.stringify(callback.deps)) { cleanup?.(); callback = fn; cleanup = fn(); } } }, '@/src/components/ui': { Txt: 'Text' }, '@/src/components/motion': { MotionPressable: 'Pressable' }, './editors': { Sheet: component('Sheet') }, './goals-summary': { GoalsSummary: component('Summary') }, './visuals': { Icon: 'Icon', SmallButton: component('Button') } });
  const props = { ownerId: 'alice', hasGoals: false, ready: true, activeWorkout: false, goals: model.defaultGoals(), events: [], workouts: [], unit: 'kg', completed: 0, onRetry() {} };
  return { render(extra = {}) { cursor = 0; return nodes(module.HomeGoals({ ...props, ...extra })); }, blur() { cleanup?.(); callback = null; }, routes, writes, reads, resolveRead, key: module.goalWelcomeKey };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
test('welcome appears once, persists per account, and leaves setup available after dismissal', async () => {
  const h = homeHarness(); h.render(); await flush();
  const open = h.render();
  assert.equal(open.some(n => n.props.title === 'Make it your own'), true);
  assert.deepEqual(h.writes, [[h.key('alice'), 'seen']]);
  open.find(n => n.props.title === 'Make it your own').props.onClose();
  h.blur(); assert.equal(h.render().some(n => n.props.title === 'Make it your own'), false);
  const card = h.render().find(n => n.props.accessibilityLabel === 'Set my goals');
  card.props.onPress(); assert.deepEqual(h.routes, ['/goals']);
});
test('welcome waits for resolved data, skips active workouts and saved goals', async () => {
  for (const props of [{ ready: false }, { hasGoals: true }, { activeWorkout: true }]) {
    const h = homeHarness(); h.render(props); await flush();
    assert.equal(h.reads.length, 0);
    assert.equal(h.render(props).some(n => n.props.title === 'Make it your own'), false);
  }
  const h = homeHarness({ seen: true }); h.render(); await flush();
  assert.equal(h.render().some(n => n.props.title === 'Make it your own'), false);
});
test('async welcome lookup cannot display after blur or account change', async () => {
  const h = homeHarness({ deferred: true }); h.render(); h.blur(); h.resolveRead(null); await flush();
  assert.equal(h.writes.length, 0);
  const account = homeHarness({ deferred: true }); account.render(); account.render({ ownerId: 'bob', hasGoals: true }); account.resolveRead(null); await flush();
  assert.equal(account.writes.length, 0);
  assert.equal(account.render({ ownerId: 'bob', hasGoals: true }).some(n => n.props.title === 'Make it your own'), false);
});
