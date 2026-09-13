import { useEffect } from "react";

import * as Network from "expo-network";

import { useSQLiteContext } from "expo-sqlite";

import { useAuthStore } from "@/features/auth/store";

import { syncAppData } from "./app-sync";

export function useSyncOnReconnect() {
  const database = useSQLiteContext();

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const subscription = Network.addNetworkStateListener((state) => {
      const online =
        state.isConnected !== false && state.isInternetReachable !== false;

      if (online) {
        void syncAppData(database, user.id);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [database, user?.id]);
}
