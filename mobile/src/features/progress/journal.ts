import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "@/src/services/api";
import { createEventBase, emptyJournal, latestMetrics, validMetric, mergeEvents, type Metric, type Goals, type Journal, type ProgressEvent, type ProgressWorkout } from "./model";

const locks = new Map<string, Promise<unknown>>();
const key = (userId: string) => `fitsync.progress.v1.${userId}`;
export async function readJournal(userId: string): Promise<Journal> {
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return emptyJournal();
  const value = JSON.parse(raw);
  if (value.version !== 1 || !Array.isArray(value.events) || !Array.isArray(value.pending) || !Array.isArray(value.workouts)) throw new Error("Could not read your saved progress. Your saved data has been kept; retry before adding entries.");
  return value;
}
export function updateJournal(userId: string, update: (value: Journal) => Journal) {
  const next = (locks.get(userId) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const value = update(await readJournal(userId));
    await AsyncStorage.setItem(key(userId), JSON.stringify(value));
    return value;
  });
  locks.set(userId, next);
  return next;
}
export function appendEvent(userId: string, event: ProgressEvent) {
  return updateJournal(userId, value => ({ ...value, events: mergeEvents(value.events, [event]), pending: [...new Set([...value.pending, event.id])] }));
}
export async function syncJournal(userId: string, isCurrent: () => boolean) {
  const ensureCurrent = () => { if (!isCurrent()) throw new Error("Account changed."); };
  const saved = await readJournal(userId);
  const pending = saved.events.filter(event => saved.pending.includes(event.id));
  for (let index = 0; index < pending.length; index += 20) {
    ensureCurrent(); const batch = pending.slice(index, index + 20);
    const response = await apiRequest<{ accepted: string[] }>("/progress/events", { method: "POST", json: { ownerId: userId, events: batch } });
    // Persist acknowledgements only; entries appended during upload remain queued.
    await updateJournal(userId, value => ({ ...value, pending: value.pending.filter(id => !response.accepted.includes(id)) }));
  }
  let after: string | null = null;
  const events: ProgressEvent[] = [];
  do {
    ensureCurrent();
    const response: { events: ProgressEvent[]; next: string | null } = await apiRequest(`/progress/events?ownerId=${userId}${after ? `&after=${encodeURIComponent(after)}` : ""}`);
    events.push(...response.events); after = response.next;
  } while (after);
  return updateJournal(userId, value => ({ ...value, events: mergeEvents(value.events, events) }));
}
export async function syncWorkouts(userId: string, isCurrent: () => boolean) {
  const workouts: ProgressWorkout[] = [];
  let cursor: { before: string; beforeId: string } | null = null;
  do {
    if (!isCurrent()) throw new Error("Account changed.");
    const response: { workouts: ProgressWorkout[]; next: { before: string; beforeId: string } | null } = await apiRequest(`/progress/workouts?ownerId=${userId}${cursor ? `&before=${encodeURIComponent(cursor.before)}&beforeId=${cursor.beforeId}` : ""}`);
    workouts.push(...response.workouts); cursor = response.next;
  } while (cursor);
  return updateJournal(userId, value => ({ ...value, workouts: [...new Map(workouts.map(workout => [workout.id, workout])).values()], workoutsUpdatedAt: new Date().toISOString() }));
}

export function saveMetric(userId: string, metric: Metric, date: string, amount: number | null, notes: string, source: "manual" | "pedometer", increment = false) {
  return updateJournal(userId, value => {
    const previous = latestMetrics(value.events).find(entry => entry.metric === metric && entry.date === date)?.value ?? 0;
    const total = increment ? previous + (amount ?? 0) : amount;
    if (!validMetric(metric, total)) throw new Error("This total is outside the allowed range.");
    const event: ProgressEvent = { ...createEventBase(value.events), kind: "metric", metric, date, value: total, notes, source };
    return { ...value, events: mergeEvents(value.events, [event]), pending: [...value.pending, event.id] };
  });
}
export function saveGoalsEvent(userId: string, goals: Goals) {
  return updateJournal(userId, value => {
    const event: ProgressEvent = { ...createEventBase(value.events), kind: "goals", goals };
    return { ...value, events: mergeEvents(value.events, [event]), pending: [...value.pending, event.id] };
  });
}
