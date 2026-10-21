import React from "react";
import { Pressable, View } from "react-native";
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

export function OptionCard({
  title,
  description,
  icon,
  selected,
  onPress,
}: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={title}
      onPress={onPress}
      className={`mb-3 flex-row items-center gap-3.5 rounded-[20px] p-[18px] active:scale-[0.98] active:opacity-80 ${selected ? "border-brand bg-[#442c20]" : "border-border bg-panel"}`}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={26}
          color={selected ? C.brand : C.muted}
        />
      )}
      <View className="flex-1">
        <Txt weight="semibold" className="text-[17px]">
          {title}
        </Txt>
        {description && (
          <Txt className="text-[13px] leading-[19px] text-muted mt-[4px]">
            {description}
          </Txt>
        )}
      </View>
      <MaterialCommunityIcons
        name={selected ? "check-circle" : "circle-outline"}
        size={22}
        color={selected ? C.brand : "#626267"}
      />
    </Pressable>
  );
}
