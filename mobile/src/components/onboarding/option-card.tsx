import React from "react";
import { View } from "react-native";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

type Props = {
  title: string;
  description?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  selected: boolean;
  onPress: () => void;
};

export function OptionCard({ title, description, icon, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={title}
      onPress={onPress}
      className={`mb-3 flex-row items-center gap-3.5 rounded-[20px] p-[18px] active:scale-[0.98] active:opacity-80 ${selected ? "bg-ink" : "bg-panel"}`}
    >
      {icon && <MaterialCommunityIcons name={icon} size={26} color={selected ? C.bg : C.muted} />}
      <View className="flex-1">
        <Txt weight="semibold" className={`text-base ${selected ? "text-black" : "text-ink"}`}>
          {title}
        </Txt>
        {description && (
          <Txt className={`mt-1 text-xs leading-5 ${selected ? "text-black/60" : "text-muted"}`}>
            {description}
          </Txt>
        )}
      </View>
      <MaterialCommunityIcons
        name={selected ? "check-circle" : "circle-outline"}
        size={22}
        color={selected ? C.bg : C.muted}
      />
    </Pressable>
  );
}
