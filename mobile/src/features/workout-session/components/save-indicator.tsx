import { Text, View } from "react-native";

import type { LocalSaveState } from "../local/use-local-workout-persistence";

import type { WorkoutSyncStatus } from "../local/types";

interface Props {
  localStatus: LocalSaveState;

  syncStatus: WorkoutSyncStatus | null;

  online: boolean;
}

export function SaveIndicator({ localStatus, syncStatus, online }: Props) {
  if (localStatus === "error") {
    return (
      <Text className="text-[10px] font-semibold text-red-300">
        Local save failed
      </Text>
    );
  }

  if (localStatus === "saving" || localStatus === "unsaved") {
    return <Text className="text-[10px] text-white/30">Saving on device…</Text>;
  }

  if (syncStatus === "CONFLICT") {
    return (
      <View className="flex-row items-center">
        <View className="h-1.5 w-1.5 rounded-full bg-amber-400" />

        <Text className="ml-2 text-[10px] font-semibold text-amber-300">
          Sync conflict
        </Text>
      </View>
    );
  }

  if (syncStatus === "SYNCING") {
    return (
      <Text className="text-[10px] text-white/30">
        Saved on device · syncing…
      </Text>
    );
  }

  if (syncStatus === "SYNCED") {
    return <Text className="text-[10px] text-white/25">Synced</Text>;
  }

  if (!online) {
    return (
      <Text className="text-[10px] text-white/30">
        Offline · saved on device
      </Text>
    );
  }

  if (syncStatus === "ERROR") {
    return (
      <Text className="text-[10px] text-amber-300/80">
        Saved on device · sync pending
      </Text>
    );
  }

  return <Text className="text-[10px] text-white/30">Saved on device</Text>;
}
