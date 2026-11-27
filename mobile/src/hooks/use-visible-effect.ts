import { useCallback } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useFocusEffect } from "expo-router";

/** Run screen work only while its route is focused and the app is active. */
export function useVisibleEffect(effect: () => void | (() => void)) {
  useFocusEffect(
    useCallback(() => {
      let active = false;
      let cleanup: void | (() => void);
      const update = (state: AppStateStatus | null) => {
        const visible = state === "active";
        if (active === visible) return;
        active = visible;
        if (visible) cleanup = effect();
        else cleanup?.();
      };
      const listener = AppState.addEventListener("change", update);
      update(AppState.currentState);
      return () => {
        listener.remove();
        if (active) cleanup?.();
      };
    }, [effect]),
  );
}
