import { useCallback, useId, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { requireOptionalNativeModule } from "expo";
import { useExperience } from "./experience-context";

export function useWorkoutAwake(active: boolean) {
  const { preferences } = useExperience();
  const id = useId();
  const sequence = useRef(0);
  useFocusEffect(useCallback(() => {
    if (!active || !preferences.keepAwake || !requireOptionalNativeModule("ExpoKeepAwake")) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const awake = require("expo-keep-awake") as typeof import("expo-keep-awake");
    let cancelled = false;
    const tag = `fitsync-live-workout-${id}-${++sequence.current}`;
    void awake.activateKeepAwakeAsync(tag).then(() => { if (cancelled) void awake.deactivateKeepAwake(tag).catch(() => {}); }).catch(() => {});
    return () => { cancelled = true; void awake.deactivateKeepAwake(tag).catch(() => {}); };
  }, [active, id, preferences.keepAwake]));
}
