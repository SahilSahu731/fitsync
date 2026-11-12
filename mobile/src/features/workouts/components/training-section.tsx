import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

export function TrainingSection({
  title,
  subtitle,
  count,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View className="mb-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${count} saved`}
        accessibilityHint={expanded ? "Collapse section" : "Expand section"}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        className="min-h-20 flex-row items-center gap-3 rounded-[22px] bg-panel px-4 py-4"
      >
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-elevated">
          <MaterialCommunityIcons name={icon} size={23} color={C.ink} />
        </View>
        <View className="min-w-0 flex-1">
          <Txt weight="medium" className="text-base">
            {title}
          </Txt>
          <Txt className="mt-1 text-xs text-muted">{subtitle}</Txt>
        </View>
        <Txt className="text-sm text-muted">{count}</Txt>
        <MaterialCommunityIcons
          name={expanded ? "chevron-down" : "chevron-right"}
          size={24}
          color={C.ink}
        />
      </Pressable>
      {expanded && <View className="pt-4">{children}</View>}
    </View>
  );
}
