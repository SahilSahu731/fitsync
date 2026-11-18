import React from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import type { Href } from "expo-router";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

export function HomeQuickLog({
  disabled,
  onWater,
  onSteps,
  onFood,
  onMore,
}: {
  disabled: boolean;
  onWater: () => void;
  onSteps: () => void;
  onFood: () => void;
  onMore: () => void;
}) {
  const items: {
    label: string;
    accessibilityLabel: string;
    icon: IconName;
    onPress: () => void;
  }[] = [
    { label: "Water", accessibilityLabel: "Log water", icon: "water-outline", onPress: onWater },
    { label: "Steps", accessibilityLabel: "Log steps", icon: "shoe-print", onPress: onSteps },
    {
      label: "Food",
      accessibilityLabel: "Log food and nutrition",
      icon: "silverware-fork-knife",
      onPress: onFood,
    },
    { label: "More", accessibilityLabel: "More daily check-ins", icon: "plus", onPress: onMore },
  ];
  return (
    <View className="flex-row gap-2">
      {items.map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="button"
          accessibilityLabel={item.accessibilityLabel}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={item.onPress}
          className="min-w-0 flex-1 items-center gap-2 rounded-[22px] border border-white/5 bg-panel px-1 py-4"
          style={{ opacity: disabled ? 0.4 : 1 }}
        >
          <MaterialCommunityIcons name={item.icon} size={24} color="#FFFFFF" />
          <Txt weight="medium" className="text-[11px]">
            {item.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

const ESSENTIALS: { title: string; detail: string; icon: IconName; route: Href }[] = [
  {
    title: "Calendar",
    detail: "Your training days",
    icon: "calendar-month-outline",
    route: "/calendar",
  },
  { title: "Goals", detail: "Set your own pace", icon: "bullseye-arrow", route: "/goals" },
  {
    title: "Exercises",
    detail: "Find your next move",
    icon: "weight-lifter",
    route: "/explore/exercises",
  },
  { title: "Health sync", detail: "Connect your data", icon: "heart-pulse", route: "/health-sync" },
  {
    title: "Fitness tools",
    detail: "Calculate & prepare",
    icon: "tune-variant",
    route: "/explore/tools",
  },
  {
    title: "Your Pro",
    detail: "Training & daily care",
    icon: "star-four-points-outline",
    route: "/(tabs)/pro",
  },
];

export function HomeEssentials({ onNavigate }: { onNavigate: (route: Href) => void }) {
  return (
    <View className="gap-3">
      {[ESSENTIALS.slice(0, 2), ESSENTIALS.slice(2, 4), ESSENTIALS.slice(4, 6)].map(
        (row, index) => (
          <View key={index} className="flex-row gap-3">
            {row.map((item) => (
              <Pressable
                key={item.title}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onPress={() => onNavigate(item.route)}
                className="min-w-0 flex-1 rounded-[22px] bg-panel p-4"
              >
                <View className="mb-4 flex-row items-center justify-between">
                  <MaterialCommunityIcons name={item.icon} size={23} color="#FFFFFF" />
                  <MaterialCommunityIcons name="arrow-top-right" size={15} color="#777777" />
                </View>
                <Txt weight="medium" className="text-xs">
                  {item.title}
                </Txt>
                <Txt className="mt-1 text-[10px] leading-4 text-muted">{item.detail}</Txt>
              </Pressable>
            ))}
          </View>
        ),
      )}
    </View>
  );
}
