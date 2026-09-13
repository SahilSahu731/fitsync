import { Ionicons } from "@expo/vector-icons";

import { Pressable } from "react-native";

interface Props {
  completed: boolean;

  disabled?: boolean;

  onPress: () => void;
}

export function SetCompletionButton({
  completed,
  disabled = false,
  onPress,
}: Props) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={
        completed ? "Mark set incomplete" : "Mark set complete"
      }
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full"
      style={{
        opacity: disabled ? 0.4 : 1,

        backgroundColor: completed ? "#2563EB" : "rgba(255,255,255,.065)",
      }}
    >
      <Ionicons
        name="checkmark"
        size={19}
        color={completed ? "#FFFFFF" : "rgba(255,255,255,.24)"}
      />
    </Pressable>
  );
}
