
import React from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type Props = {
  title: string;
  description?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
};

export function OptionCard({
  title,
  description,
  icon,
  selected,
  onPress
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-3 flex-row items-center rounded-[21px] border px-4 py-4 ${selected ? "border-brand bg-[#292019]" : "border-border bg-panel"}`}
    >
      {icon ? (
        <View className={`mr-4 h-12 w-12 items-center justify-center rounded-2xl ${selected ? "bg-brand" : "bg-elevated"}`}>
          <MaterialCommunityIcons name={icon} size={25} color={selected ? C.bg : C.ink}/>
        </View>
      ) : null}

      <View className="flex-1">
        <Txt weight="bold" className="text-[16px]">{title}</Txt>
        {description ? (
          <Txt className="mt-1 text-[12px] leading-5 text-muted">{description}</Txt>
        ) : null}
      </View>

      <MaterialCommunityIcons
        name={selected ? "check-circle" : "circle-outline"}
        size={24}
        color={selected ? C.brand : C.muted}
      />
    </Pressable>
  );
}
