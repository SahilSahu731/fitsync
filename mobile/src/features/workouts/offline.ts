import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkoutSession, WorkoutSet, workoutApi } from "./api";
import { optimisticSet, replaceSet } from "./set-state";
type SetPatch = Parameters<typeof workoutApi.updateSet>[2];
export type WorkoutDraft = {
  version: 1;
  ownerId: string;
  session: WorkoutSession;
  revision: number;
  sets: Record<string, { revision: number; patch: SetPatch }>;
  notes: { revision: number; value: string } | null;
  finish: { elapsedSeconds: number; notes: string } | null;
};
const key = (ownerId: string) => `fitsync.workout.draft.v1.${ownerId}`;
const locks = new Map<string, Promise<unknown>>();
const flushes = new Map<string, Promise<WorkoutDraft | null>>();
const decoded = new Map<string, { raw: string; draft: WorkoutDraft }>();
const deletedOwners = new Set<string>();
const restWrites = new Map<string, Promise<void>>();
const restKey = (ownerId: string) => `fitsync.workout.rest.v2.${ownerId}`;
export function saveWorkoutRest(ownerId: string, value: unknown | null): Promise<void> {
  if (deletedOwners.has(ownerId)) return Promise.resolve();
  const operation = (restWrites.get(ownerId) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      if (deletedOwners.has(ownerId)) return;
      if (value === null) await AsyncStorage.removeItem(restKey(ownerId));
      else await AsyncStorage.setItem(restKey(ownerId), JSON.stringify(value));
    });
  restWrites.set(ownerId, operation);
  const clean = () => {
    if (restWrites.get(ownerId) === operation) restWrites.delete(ownerId);
  };
  void operation.then(clean, clean);
  return operation;
}
export async function readWorkoutDraft(ownerId: string): Promise<WorkoutDraft | null> {
  if (deletedOwners.has(ownerId)) return null;
  const raw = await AsyncStorage.getItem(key(ownerId));
  if (deletedOwners.has(ownerId)) return null;
  if (!raw) {
    decoded.delete(ownerId);
    return null;
  }
  const cached = decoded.get(ownerId);
  if (cached?.raw === raw) return cached.draft;
  const value = JSON.parse(raw) as WorkoutDraft;
  if (
    value.version !== 1 ||
    value.ownerId !== ownerId ||
    !value.session?.id ||
    !value.sets ||
    !Number.isFinite(value.revision)
  )
    throw new Error("Your saved workout could not be opened. It has been kept on this device.");
  decoded.set(ownerId, { raw, draft: value });
  return value;
}
export function changeWorkoutDraft(
  ownerId: string,
  update: (draft: WorkoutDraft | null) => WorkoutDraft | null,
) {
  if (deletedOwners.has(ownerId)) return Promise.reject(new Error("This account was deleted."));
  const operation = (locks.get(ownerId) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const previous = await readWorkoutDraft(ownerId);
      if (deletedOwners.has(ownerId)) throw new Error("This account was deleted.");
      const result = update(previous);
      if (result === previous) return previous;
      if (result) {
        const raw = JSON.stringify(result);
        await AsyncStorage.setItem(key(ownerId), raw);
        if (deletedOwners.has(ownerId)) throw new Error("This account was deleted.");
        decoded.set(ownerId, { raw, draft: result });
      } else {
        await AsyncStorage.removeItem(key(ownerId));
        decoded.delete(ownerId);
      }
      return result;
    });
  locks.set(ownerId, operation);
  const clean = () => {
    if (locks.get(ownerId) === operation) locks.delete(ownerId);
  };
  void operation.then(clean, clean);
  return operation;
}

/** An in-flight upload may finish, but it can never recreate a deleted local draft. */
export function deleteWorkoutDraft(ownerId: string): Promise<void> {
  if (!ownerId.trim()) return Promise.reject(new Error("Sign in to delete local workout data."));
  deletedOwners.add(ownerId);
  decoded.delete(ownerId);
  const operation = (locks.get(ownerId) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      await (restWrites.get(ownerId) ?? Promise.resolve()).catch(() => {});
      await Promise.all([
        AsyncStorage.removeItem(key(ownerId)),
        AsyncStorage.removeItem(restKey(ownerId)),
      ]);
    });
  locks.set(ownerId, operation);
  const clean = () => {
    if (locks.get(ownerId) === operation) locks.delete(ownerId);
  };
  void operation.then(clean, clean);
  return operation;
}
export const draftPending = (value: WorkoutDraft | null) =>
  value ? Object.keys(value.sets).length + Number(!!value.notes) + Number(!!value.finish) : 0;
export function cacheWorkout(
  ownerId: string,
  session: WorkoutSession | null,
  expectedRevision?: number,
) {
  return changeWorkoutDraft(ownerId, (old) => {
    if (expectedRevision !== undefined && (old?.revision ?? 0) !== expectedRevision) return old;
    if (old && draftPending(old)) {
      if (session && old.session.id !== session.id)
        throw new Error(
          "A saved workout still needs to sync. Finish syncing it before starting another.",
        );
      return old;
    }
    return session
      ? {
          version: 1,
          ownerId,
          session,
          revision: old?.session.id === session.id ? old.revision : 0,
          sets: {},
          notes: null,
          finish: null,
        }
      : null;
  });
}
export function queueSet(
  ownerId: string,
  setId: string,
  patch: SetPatch,
  expectedSessionId?: string,
) {
  return changeWorkoutDraft(ownerId, (old) => {
    if (!old || old.finish) throw new Error("Reopen your active workout before editing sets.");
    if (expectedSessionId && old.session.id !== expectedSessionId)
      throw new Error("This workout changed. Reopen it before editing.");
    const previous = old.session.workout_session_exercises
      .flatMap((e) => e.workout_logged_sets)
      .find((s) => s.id === setId);
    if (!previous) throw new Error("Set no longer exists.");
    const revision = old.revision + 1;
    return {
      ...old,
      revision,
      session: replaceSet(old.session, setId, optimisticSet(previous, patch)),
      sets: { ...old.sets, [setId]: { revision, patch: { ...old.sets[setId]?.patch, ...patch } } },
    };
  });
}
export function queueNotes(ownerId: string, value: string, expectedSessionId?: string) {
  return changeWorkoutDraft(ownerId, (old) => {
    if (!old || old.finish) throw new Error("Reopen your active workout before editing notes.");
    if (expectedSessionId && old.session.id !== expectedSessionId)
      throw new Error("This workout changed. Reopen it before editing.");
    const revision = old.revision + 1;
    return {
      ...old,
      revision,
      session: { ...old.session, notes: value },
      notes: { revision, value },
    };
  });
}

/** Merge only the created row; a server snapshot must never replace newer local edits. */
export function commitAddedSet(
  ownerId: string,
  sessionId: string,
  exerciseId: string,
  created: WorkoutSet,
  defaults: WorkoutSet,
) {
  return changeWorkoutDraft(ownerId, (old) => {
    if (!old || old.finish || old.session.id !== sessionId)
      throw new Error("This workout changed. Reopen it before adding sets.");
    const exercise = old.session.workout_session_exercises.find((item) => item.id === exerciseId);
    if (!exercise) throw new Error("Exercise no longer exists.");
    if (exercise.workout_logged_sets.some((set) => set.id === created.id)) return old;
    const patch: SetPatch = {};
    if (created.weight_kg !== defaults.weight_kg) patch.weightKg = defaults.weight_kg;
    if (created.reps !== defaults.reps) patch.reps = defaults.reps;
    if (created.duration_seconds !== defaults.duration_seconds)
      patch.durationSeconds = defaults.duration_seconds;
    if (created.distance_meters !== defaults.distance_meters)
      patch.distanceMeters = defaults.distance_meters;
    const revision = old.revision + 1;
    return {
      ...old,
      revision,
      session: {
        ...old.session,
        workout_session_exercises: old.session.workout_session_exercises.map((item) =>
          item.id === exerciseId
            ? {
                ...item,
                workout_logged_sets: [...item.workout_logged_sets, optimisticSet(created, patch)],
              }
            : item,
        ),
      },
      sets: Object.keys(patch).length
        ? { ...old.sets, [created.id]: { revision, patch } }
        : old.sets,
    };
  });
}
export function queueFinish(ownerId: string, elapsedSeconds: number, expectedSessionId?: string) {
  return changeWorkoutDraft(ownerId, (old) => {
    if (!old) throw new Error("No saved workout.");
    if (expectedSessionId && old.session.id !== expectedSessionId)
      throw new Error("This workout changed. Reopen it before finishing.");
    if (old.finish) return old;
    if (
      !old.session.workout_session_exercises.some((exercise) =>
        exercise.workout_logged_sets.some((set) => !!set.completed_at),
      )
    )
      throw new Error("Complete at least one set before finishing.");
    return {
      ...old,
      revision: old.revision + 1,
      finish: { elapsedSeconds, notes: old.session.notes },
    };
  });
}
export type DraftTransport = {
  set: (sessionId: string, setId: string, patch: SetPatch) => Promise<unknown>;
  notes: (sessionId: string, notes: string) => Promise<unknown>;
  finish: (sessionId: string, elapsed: number, notes: string) => Promise<unknown>;
};
export async function flushWorkoutDraft(
  ownerId: string,
  current: () => boolean,
  transport: DraftTransport,
) {
  const operation = (flushes.get(ownerId) ?? Promise.resolve())
    .catch(() => {})
    .then(() => drainWorkoutDraft(ownerId, current, transport));
  flushes.set(ownerId, operation);
  try {
    return await operation;
  } finally {
    if (flushes.get(ownerId) === operation) flushes.delete(ownerId);
  }
}
async function drainWorkoutDraft(
  ownerId: string,
  current: () => boolean,
  transport: DraftTransport,
) {
  const ensure = () => {
    if (!current()) throw new Error("Account changed. Your workout remains saved for its owner.");
  };
  for (let count = 0; count < 300; count++) {
    ensure();
    const draft = await readWorkoutDraft(ownerId);
    if (!draft) return null;
    const entry = Object.entries(draft.sets)[0];
    if (entry) {
      const [id, pending] = entry;
      ensure();
      await transport.set(draft.session.id, id, pending.patch);
      await changeWorkoutDraft(ownerId, (latest) => {
        if (
          !latest ||
          latest.session.id !== draft.session.id ||
          latest.sets[id]?.revision !== pending.revision
        )
          return latest;
        const sets = { ...latest.sets };
        delete sets[id];
        return { ...latest, sets };
      });
      continue;
    }
    if (draft.notes) {
      ensure();
      await transport.notes(draft.session.id, draft.notes.value);
      await changeWorkoutDraft(ownerId, (latest) =>
        latest?.session.id === draft.session.id && latest.notes?.revision === draft.notes!.revision
          ? { ...latest, notes: null }
          : latest,
      );
      continue;
    }
    if (draft.finish) {
      ensure();
      await transport.finish(draft.session.id, draft.finish.elapsedSeconds, draft.finish.notes);
      return changeWorkoutDraft(ownerId, (latest) =>
        latest?.session.id === draft.session.id ? null : latest,
      );
    }
    return draft;
  }
  throw new Error("New updates are still arriving. Your workout remains saved and will retry.");
}
