import { Ionicons } from "@expo/vector-icons";

import { Pressable, Text, View } from "react-native";

interface Props {
  icon: React.ComponentProps<typeof Ionicons>["name"];

  title: string;

  subtitle?: string;

  onPress: () => void;

  danger?: boolean;
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center px-4 py-4"
      style={({ pressed }) => ({
        backgroundColor: pressed ? "rgba(56,189,248,.10)" : "transparent",
      })}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{
          backgroundColor: danger
            ? "rgba(248,113,113,.10)"
            : "rgba(56,189,248,.12)",
        }}
      >
        <Ionicons
          name={icon}
          size={19}
          color={danger ? "#F87171" : "#38BDF8"}
        />
      </View>

      <View className="ml-3 flex-1">
        <Text
          className="text-[15px] font-semibold"
          style={{
            color: danger ? "#FCA5A5" : "#FFFFFF",
          }}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text className="mt-1 text-[12px] text-white/35">{subtitle}</Text>
        ) : null}
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="rgba(255,255,255,.25)"
      />
    </Pressable>
  );
}
