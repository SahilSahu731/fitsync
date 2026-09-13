import { useEffect, useState } from "react";

import * as Network from "expo-network";

export function useNetworkStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    void Network.getNetworkStateAsync().then((state) => {
      if (!mounted) {
        return;
      }

      setOnline(
        state.isConnected !== false && state.isInternetReachable !== false,
      );
    });

    const subscription = Network.addNetworkStateListener((state) => {
      setOnline(
        state.isConnected !== false && state.isInternetReachable !== false,
      );
    });

    return () => {
      mounted = false;

      subscription.remove();
    };
  }, []);

  return online;
}
