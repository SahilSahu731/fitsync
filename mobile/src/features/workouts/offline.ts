import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkoutSession, workoutApi } from "./api";
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
export async function readWorkoutDraft(ownerId: string): Promise<WorkoutDraft | null> {
  const raw = await AsyncStorage.getItem(key(ownerId));
  if (!raw) return null;
  const value = JSON.parse(raw) as WorkoutDraft;
  if (
    value.version !== 1 ||
    value.ownerId !== ownerId ||
    !value.session?.id ||
    !value.sets ||
    !Number.isFinite(value.revision)
  )
    throw new Error("Your saved workout could not be opened. It has been kept on this device.");
  return value;
}
export function changeWorkoutDraft(
  ownerId: string,
  update: (draft: WorkoutDraft | null) => WorkoutDraft | null,
) {
  const operation = (locks.get(ownerId) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const result = update(await readWorkoutDraft(ownerId));
      if (result) await AsyncStorage.setItem(key(ownerId), JSON.stringify(result));
      else await AsyncStorage.removeItem(key(ownerId));
      return result;
    });
  locks.set(ownerId, operation);
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
