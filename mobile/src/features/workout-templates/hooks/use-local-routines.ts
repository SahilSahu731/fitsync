import { useCallback, useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { useAuthStore } from "@/features/auth/store";
import { listLocalRoutines } from "../local-routine-repository";
import type { LocalRoutineRecord } from "../types";

export function useLocalRoutines(includeArchived = false) {
  const database = useSQLiteContext();
  const userId = useAuthStore((state) => state.user?.id);
  const [items, setItems] = useState<LocalRoutineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      setItems(await listLocalRoutines(database, userId, includeArchived));
    } finally {
      setLoading(false);
    }
  }, [database, includeArchived, userId]);
  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    return () => clearTimeout(timer);
  }, [reload]);
  return { items, loading, reload };
}
