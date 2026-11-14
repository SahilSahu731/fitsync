import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { apiRequest } from "@/src/services/api";
import type { MuscleMetadata } from "./analytics";
export function useProCatalog(ownerId: string) {
  const [items, setItems] = useState<MuscleMetadata[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const alive = useRef(true),
    sequence = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    const id = ++sequence.current,
      key = `fitsync.pro.muscles.v1.${ownerId}`;
    const current = () => alive.current && sequence.current === id;
    setLoading(true);
    setError("");
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw && current()) {
        const cache: unknown = JSON.parse(raw);
        if (
          Array.isArray(cache) &&
          cache.every(
            (e) =>
              e &&
              typeof e.id === "string" &&
              Array.isArray(e.primaryMuscles) &&
              Array.isArray(e.secondaryMuscles) &&
              e.primaryMuscles.every((m: unknown) => typeof m === "string") &&
              e.secondaryMuscles.every((m: unknown) => typeof m === "string"),
          )
        )
          setItems(cache);
      }
    } catch {
      /* Metadata can be refreshed independently of the saved journal. */
    }
    try {
      const rows: MuscleMetadata[] = [];
      for (let page = 1; ; page++) {
        if (!current()) return;
        const value = await apiRequest<{ items: MuscleMetadata[]; hasMore: boolean }>(
          `/exercises/muscle-index?page=${page}`,
          { expectedOwnerId: ownerId },
        );
        rows.push(...value.items);
        if (!value.hasMore) break;
      }
      if (current()) {
        setItems(rows);
        void AsyncStorage.setItem(key, JSON.stringify(rows)).catch(() => {});
      }
    } catch (e) {
      if (current())
        setError(e instanceof Error ? e.message : "Could not update exercise muscle labels.");
    } finally {
      if (current()) setLoading(false);
    }
  }, [ownerId]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {};
    }, [refresh]),
  );
  return { items, loading, error, refresh };
}
