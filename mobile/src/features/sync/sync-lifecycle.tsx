import { useEffect } from "react";

import { useSQLiteContext } from "expo-sqlite";

import { useAuthStore } from "@/features/auth/store";

import { syncAppData } from "./app-sync";

import { useSyncOnAppState } from "./use-sync-on-app-state";

import { useSyncOnReconnect } from "./use-sync-on-reconnect";

export function SyncLifecycle() {
  const database = useSQLiteContext();

  const user = useAuthStore((state) => state.user);

  useSyncOnReconnect();

  useSyncOnAppState();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    /*
     * Initial foreground sync after authentication.
     */
    void syncAppData(database, user.id);
  }, [database, user?.id]);

  return null;
}
