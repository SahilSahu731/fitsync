import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, apiSessionKey } from "@/src/services/api";
import {
  createEventBase,
  emptyJournal,
  latestMetrics,
  validMetric,
  mergeEvents,
  type Metric,
  type MetricEvent,
  type Goals,
  type Journal,
  type ProgressEvent,
  type ProgressWorkout,
} from "./model";

const locks = new Map<string, Promise<unknown>>();
const snapshots = new Map<string, Journal>();
const diskReads = new Map<string, Promise<Journal>>();
const ownerRevisions = new Map<string, number>();
const deletedOwners = new Set<string>();
let snapshotSession = apiSessionKey();
function sessionScope() {
  const session = apiSessionKey();
  if (session !== snapshotSession) {
    snapshots.clear();
    diskReads.clear();
    snapshotSession = session;
  }
  return session;
}
const listeners = new Set<(ownerId: string, journal: Journal) => void>();
export function subscribeJournal(listener: (ownerId: string, journal: Journal) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const key = (userId: string) => `fitsync.progress.v1.${userId}`;
export async function readJournal(userId: string): Promise<Journal> {
  const session = sessionScope();
  const revision = ownerRevisions.get(userId) ?? 0;
  const cached = snapshots.get(userId);
  if (cached) return cached;
  const reading = diskReads.get(userId);
  if (reading) return reading;
  const request = readFromDisk(userId)
    .then((journal) => {
      if (sessionScope() === session && (ownerRevisions.get(userId) ?? 0) === revision)
        snapshots.set(userId, journal);
      return journal;
    })
    .finally(() => {
      if (diskReads.get(userId) === request) diskReads.delete(userId);
    });
  diskReads.set(userId, request);
  return request;
}
async function readFromDisk(userId: string): Promise<Journal> {
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return emptyJournal();
  const value = JSON.parse(raw);
  if (
    value.version !== 1 ||
    !Array.isArray(value.events) ||
    !Array.isArray(value.pending) ||
    !Array.isArray(value.workouts)
  )
    throw new Error(
      "Could not read your saved progress. Your saved data has been kept; retry before adding entries.",
    );
  return value;
}
export function updateJournal(userId: string, update: (value: Journal) => Journal) {
  const next = (locks.get(userId) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      if (deletedOwners.has(userId))
        throw new Error("This account’s saved progress has been removed.");
      const session = sessionScope();
      const revision = ownerRevisions.get(userId) ?? 0;
      const previous = await readJournal(userId);
      const value = update(previous);
      if (value === previous) return previous;
      await AsyncStorage.setItem(key(userId), JSON.stringify(value));
      if (sessionScope() !== session || (ownerRevisions.get(userId) ?? 0) !== revision)
        return value;
      snapshots.set(userId, value);
      for (const listener of listeners) {
        // A view subscriber must not turn a durable write into a failed save or
        // prevent other screens from receiving the same committed journal.
        try {
          listener(userId, value);
        } catch {
          /* The next refresh reconciles the view. */
        }
      }
      return value;
    });
  locks.set(userId, next);
  return next;
}
export function deleteProgressJournal(userId: string): Promise<void> {
  deletedOwners.add(userId);
  ownerRevisions.set(userId, (ownerRevisions.get(userId) ?? 0) + 1);
  const deleting = (locks.get(userId) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      await AsyncStorage.removeItem(key(userId));
      ownerRevisions.set(userId, (ownerRevisions.get(userId) ?? 0) + 1);
      snapshots.delete(userId);
      diskReads.delete(userId);
    });
  locks.set(userId, deleting);
  return deleting;
}
export function appendEvent(userId: string, event: ProgressEvent) {
  return updateJournal(userId, (value) => ({
    ...value,
    events: mergeEvents(value.events, [event]),
    pending: [...new Set([...value.pending, event.id])],
  }));
}
type Sync = {
  listeners: Set<() => boolean>;
  again: boolean;
  operation: Promise<Journal>;
};
const synchronizations = new Map<string, Sync>();
function synchronize(
  kind: "events" | "workouts",
  userId: string,
  isCurrent: () => boolean,
  run: (current: () => boolean) => Promise<Journal>,
  rerun: boolean,
) {
  if (!isCurrent()) return Promise.reject(new Error("Account changed."));
  const session = apiSessionKey();
  const revision = ownerRevisions.get(userId) ?? 0;
  const key = JSON.stringify([session, userId, revision, kind]);
  let shared = synchronizations.get(key);
  if (shared) shared.again ||= rerun;
  else {
    const next: Sync = {
      listeners: new Set(),
      again: false,
      operation: Promise.resolve(emptyJournal()),
    };
    const current = () =>
      apiSessionKey() === session &&
      !deletedOwners.has(userId) &&
      (ownerRevisions.get(userId) ?? 0) === revision &&
      [...next.listeners].some((valid) => valid());
    next.operation = Promise.resolve().then(async () => {
      try {
        let result: Journal;
        do {
          next.again = false;
          result = await run(current);
        } while (next.again && current());
        return result;
      } finally {
        // Remove before resolution: a local edit must not join a finished pass.
        if (synchronizations.get(key) === next) synchronizations.delete(key);
      }
    });
    synchronizations.set(key, next);
    shared = next;
  }
  shared.listeners.add(isCurrent);
  const operation = shared;
  return operation.operation
    .then((journal) => {
      if (!isCurrent()) throw new Error("Account changed.");
      return journal;
    })
    .finally(() => operation.listeners.delete(isCurrent));
}
export function syncJournal(userId: string, isCurrent: () => boolean, rerun = false) {
  return synchronize(
    "events",
    userId,
    isCurrent,
    (current) => downloadJournal(userId, current),
    rerun,
  );
}
async function downloadJournal(userId: string, isCurrent: () => boolean) {
  const ensureCurrent = () => {
    if (!isCurrent()) throw new Error("Account changed.");
  };
  const saved = await readJournal(userId);
  const pending = saved.events.filter((event) => saved.pending.includes(event.id));
  for (let index = 0; index < pending.length; index += 20) {
    ensureCurrent();
    const batch = pending.slice(index, index + 20);
    const response = await apiRequest<{ accepted: string[] }>("/progress/events", {
      method: "POST",
      json: { ownerId: userId, events: batch },
    });
    ensureCurrent();
    // Persist acknowledgements only; entries appended during upload remain queued.
    await updateJournal(userId, (value) => {
      ensureCurrent();
      return { ...value, pending: value.pending.filter((id) => !response.accepted.includes(id)) };
    });
  }
  let after: string | null = null;
  const events: ProgressEvent[] = [];
  do {
    ensureCurrent();
    const response: { events: ProgressEvent[]; next: string | null } = await apiRequest(
      `/progress/events?ownerId=${userId}${after ? `&after=${encodeURIComponent(after)}` : ""}`,
    );
    events.push(...response.events);
    after = response.next;
  } while (after);
  ensureCurrent();
  return updateJournal(userId, (value) => {
    ensureCurrent();
    return { ...value, events: mergeEvents(value.events, events) };
  });
}
export function syncWorkouts(userId: string, isCurrent: () => boolean, rerun = false) {
  return synchronize(
    "workouts",
    userId,
    isCurrent,
    (current) => downloadWorkouts(userId, current),
    rerun,
  );
}
async function downloadWorkouts(userId: string, isCurrent: () => boolean) {
  const workouts: ProgressWorkout[] = [];
  let cursor: { before: string; beforeId: string } | null = null;
  do {
    if (!isCurrent()) throw new Error("Account changed.");
    const response: {
      workouts: ProgressWorkout[];
      next: { before: string; beforeId: string } | null;
    } = await apiRequest(
      `/progress/workouts?ownerId=${userId}${cursor ? `&before=${encodeURIComponent(cursor.before)}&beforeId=${cursor.beforeId}` : ""}`,
    );
    workouts.push(...response.workouts);
    cursor = response.next;
  } while (cursor);
  if (!isCurrent()) throw new Error("Account changed.");
  return updateJournal(userId, (value) => {
    if (!isCurrent()) throw new Error("Account changed.");
    return {
      ...value,
      workouts: [...new Map(workouts.map((workout) => [workout.id, workout])).values()],
      workoutsUpdatedAt: new Date().toISOString(),
    };
  });
}

export function saveMetric(
  userId: string,
  metric: Metric,
  date: string,
  amount: number | null,
  notes: string,
  source: "manual" | "pedometer",
  increment = false,
) {
  return updateJournal(userId, (value) => {
    const previous = latestMetrics(value.events).find(
      (entry) => entry.metric === metric && entry.date === date,
    );
    const total = increment ? (previous?.value ?? 0) + (amount ?? 0) : amount;
    if (!validMetric(metric, total)) throw new Error("This total is outside the allowed range.");
    let stepBreakdown: MetricEvent["stepBreakdown"];
    const protectedStepTotal =
      previous &&
      !previous.stepBreakdown &&
      previous.source !== "healthconnect" &&
      previous.source !== "healthkit";
    if (metric === "steps" && total !== null && source !== "pedometer" && !protectedStepTotal) {
      const automaticSource = previous?.stepBreakdown
        ? previous.stepBreakdown.source
        : previous?.source === "healthconnect" || previous?.source === "healthkit"
          ? previous.source
          : null;
      const automatic = previous?.stepBreakdown
        ? previous.stepBreakdown.automatic
        : automaticSource
          ? (previous?.value ?? null)
          : null;
      if (automatic !== null && total < automatic)
        throw new Error(
          `Your total includes ${automatic.toLocaleString()} automatic steps. Add only steps that were missed, or clear the day to remove its reading.`,
        );
      stepBreakdown = { automatic, manual: total - (automatic ?? 0), source: automaticSource };
    }
    const event: ProgressEvent = {
      ...createEventBase(value.events),
      kind: "metric",
      metric,
      date,
      value: total,
      notes,
      source,
      ...(stepBreakdown ? { stepBreakdown } : {}),
    };
    return {
      ...value,
      events: mergeEvents(value.events, [event]),
      pending: [...value.pending, event.id],
    };
  });
}
export function saveGoalsEvent(userId: string, goals: Goals) {
  return updateJournal(userId, (value) => {
    const event: ProgressEvent = { ...createEventBase(value.events), kind: "goals", goals };
    return {
      ...value,
      events: mergeEvents(value.events, [event]),
      pending: [...value.pending, event.id],
    };
  });
}
