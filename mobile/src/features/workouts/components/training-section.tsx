import React, { useState } from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

export function TrainingSection({
  title,
  count,
  icon,
  accent = C.brand,
  children,
}: {
  title: string;
  count: number;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  accent?: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View className="mb-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${count}`}
        accessibilityHint={expanded ? "Collapse section" : "Expand section"}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        className="min-h-16 flex-row items-center gap-2.5 rounded-[20px] border px-4 py-3"
        style={{
          backgroundColor: expanded ? `${accent}0D` : C.panel,
          borderColor: expanded ? `${accent}55` : C.border,
        }}
      >
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}18` }}
        >
          <MaterialCommunityIcons name={icon} size={20} color={accent} accessible={false} />
        </View>
        <Txt weight="semibold" className="text-sm" style={{ color: accent }}>
          {`(${count})`}
        </Txt>
        <Txt weight="semibold" className="min-w-0 flex-1 text-[15px]">
          {title}
        </Txt>
        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={21}
          color={expanded ? accent : C.muted}
          accessible={false}
        />
      </Pressable>
      {expanded && <View className="pt-3">{children}</View>}
    </View>
  );
}
