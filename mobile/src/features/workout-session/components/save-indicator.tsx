import { Text } from "react-native";

import type { SaveState } from "../hooks/use-workout-autosave";

export function SaveIndicator({ status }: { status: SaveState }) {
  if (status === "saving") {
    return <Text className="text-[10px] text-white/25">Saving…</Text>;
  }

  if (status === "error") {
    return (
      <Text className="text-[10px] text-red-300/70">
        Not saved · check connection
      </Text>
    );
  }

  if (status === "unsaved") {
    return <Text className="text-[10px] text-white/25">Unsaved changes</Text>;
  }

  return <Text className="text-[10px] text-white/20">Saved</Text>;
}
