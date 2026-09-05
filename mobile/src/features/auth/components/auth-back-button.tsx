import {
  Ionicons,
} from "@expo/vector-icons";

import * as Haptics
  from "expo-haptics";

import {
  Pressable,
} from "react-native";

interface AuthBackButtonProps {
  onPress: () => void;
}

export function AuthBackButton({
  onPress,
}: AuthBackButtonProps) {
  async function handlePress() {
    await Haptics.selectionAsync();

    onPress();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={12}
      onPress={() => {
        void handlePress();
      }}
      className="h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/25 active:bg-white/10"
    >
      <Ionicons
        name="arrow-back"
        size={21}
        color="#FFFFFF"
      />
    </Pressable>
  );
}