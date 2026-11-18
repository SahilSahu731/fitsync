import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSession } from "@/src/context/session";
import {
  addFoodToLibrary,
  emptyDiary,
  storeFoodEntry,
  validateEntry,
  type FoodDiary,
  type FoodEntry,
} from "./model";
import { readFoodDiary, subscribeFoodDiary, updateFoodDiary } from "./storage";

type Snapshot = { ownerId: string; diary: FoodDiary };
type Operation = { ownerId: string; pending: number; error: string };

export function useFoodDiary() {
  const { user } = useSession();
  const ownerId = user?.id ?? "";
  const owner = useRef(ownerId);
  const alive = useRef(true);
  const sequence = useRef(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [reading, setReading] = useState({ ownerId: "", loading: false });
  const [operation, setOperation] = useState<Operation>({ ownerId: "", pending: 0, error: "" });
  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);

  useLayoutEffect(() => {
    owner.current = ownerId;
    alive.current = true;
    invalidate();
    return () => {
      owner.current = "";
      alive.current = false;
      invalidate();
    };
  }, [ownerId, invalidate]);

  const current = useCallback(() => alive.current && owner.current === ownerId, [ownerId]);
  const refresh = useCallback(async () => {
    if (!ownerId || !current()) return;
    const request = ++sequence.current;
    setReading({ ownerId, loading: true });
    try {
      const diary = await readFoodDiary(ownerId);
      if (current() && request === sequence.current) {
        setSnapshot({ ownerId, diary });
        setOperation((previous) => ({
          ownerId,
          pending: previous.ownerId === ownerId ? previous.pending : 0,
          error: "",
        }));
      }
    } catch (failure) {
      if (current() && request === sequence.current) {
        setOperation((previous) => ({
          ownerId,
          pending: previous.ownerId === ownerId ? previous.pending : 0,
          error:
            failure instanceof Error
              ? failure.message
              : "Could not open your food diary. Please retry.",
        }));
      }
    } finally {
      if (current() && request === sequence.current) setReading({ ownerId, loading: false });
    }
  }, [ownerId, current]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        sequence.current++;
      };
    }, [refresh]),
  );

  useEffect(
    () =>
      subscribeFoodDiary((changedOwner, diary) => {
        if (changedOwner !== ownerId || !current()) return;
        sequence.current++;
        setSnapshot({ ownerId, diary });
        setReading({ ownerId, loading: false });
        setOperation((previous) => ({
          ownerId,
          pending: previous.ownerId === ownerId ? previous.pending : 0,
          error: "",
        }));
      }),
    [ownerId, current],
  );

  const mutate = useCallback(
    async (update: (diary: FoodDiary) => FoodDiary) => {
      if (!ownerId) throw new Error("Sign in to save food to your diary.");
      if (!current()) throw new Error("Your account changed. Reopen your food diary.");
      sequence.current++;
      setOperation((previous) => ({
        ownerId,
        pending: previous.ownerId === ownerId ? previous.pending + 1 : 1,
        error: "",
      }));
      try {
        const diary = await updateFoodDiary(ownerId, (value) => {
          if (!current()) throw new Error("Your account changed. Reopen your food diary.");
          return update(value);
        });
        if (!current()) throw new Error("Your account changed. Reopen your food diary.");
        setSnapshot({ ownerId, diary });
        setReading({ ownerId, loading: false });
      } catch (failure) {
        if (current())
          setOperation((previous) => ({
            ownerId,
            pending: previous.ownerId === ownerId ? previous.pending : 1,
            error:
              failure instanceof Error ? failure.message : "Your food was not saved. Please retry.",
          }));
        throw failure;
      } finally {
        if (current()) {
          setReading({ ownerId, loading: false });
          setOperation((previous) =>
            previous.ownerId === ownerId
              ? { ...previous, pending: Math.max(0, previous.pending - 1) }
              : previous,
          );
        }
      }
    },
    [ownerId, current],
  );

  const saveEntry = useCallback(
    (entry: FoodEntry) => mutate((diary) => storeFoodEntry(diary, entry)),
    [mutate],
  );
  const removeEntry = useCallback(
    (id: string) =>
      mutate((diary) => ({ ...diary, entries: diary.entries.filter((entry) => entry.id !== id) })),
    [mutate],
  );
  const saveToLibrary = useCallback(
    (entry: FoodEntry) =>
      mutate((diary) => {
        validateEntry(entry);
        return addFoodToLibrary(diary, entry);
      }),
    [mutate],
  );

  const hasSnapshot = snapshot?.ownerId === ownerId;
  return {
    ownerId,
    diary: hasSnapshot ? snapshot.diary : emptyDiary(),
    loading: !!ownerId && (reading.ownerId === ownerId ? reading.loading : !hasSnapshot),
    busy: operation.ownerId === ownerId && operation.pending > 0,
    error: operation.ownerId === ownerId ? operation.error : "",
    refresh,
    saveEntry,
    removeEntry,
    saveToLibrary,
  };
}
