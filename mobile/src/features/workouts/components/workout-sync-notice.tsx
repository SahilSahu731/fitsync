import React from "react";
import { View } from "react-native";
import { MotionPressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { useWorkout } from "../workout-context";
export function WorkoutSyncNotice() {
  const { pendingCompletion, pendingSaves, syncError, refresh } = useWorkout();
  if (!pendingCompletion && !pendingSaves) return null;
  return (
    <View className="mb-2 rounded-2xl bg-panel p-4">
      <Txt weight="semibold" className="text-sm">
        {pendingCompletion
          ? "Workout saved on this device"
          : "Your workout edits are saved on this device"}
      </Txt>
      <Txt className="mt-2 text-xs leading-5 text-muted">
        {syncError
          ? "We’ll retry when the connection is available. Keep this account signed in until the upload finishes."
          : "Syncing to your account. Progress and coaching update after the upload finishes."}
      </Txt>
      <MotionPressable
        accessibilityRole="button"
        onPress={() => void refresh().catch(() => {})}
        className="mt-2 min-h-11 justify-center"
      >
        <Txt weight="semibold" className="text-sm text-ink">
          Retry sync
        </Txt>
      </MotionPressable>
    </View>
  );
}
