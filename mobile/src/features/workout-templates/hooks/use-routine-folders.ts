import { useCallback, useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { useAuthStore } from "@/features/auth/store";
import { listLocalFolders } from "../local-folder-repository";
import type { LocalFolderRecord } from "../types";

export function useRoutineFolders() {
  const database = useSQLiteContext();
  const userId = useAuthStore((state) => state.user?.id);
  const [items, setItems] = useState<LocalFolderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      setItems(await listLocalFolders(database, userId));
    } finally {
      setLoading(false);
    }
  }, [database, userId]);
  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    return () => clearTimeout(timer);
  }, [reload]);
  return { items, loading, reload };
}
