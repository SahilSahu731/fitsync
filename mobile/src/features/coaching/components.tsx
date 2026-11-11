import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

export function CoachHeader({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 px-5 py-3">
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/train"))}
        className="h-11 w-11 items-center justify-center rounded-full bg-panel"
      >
        <MaterialCommunityIcons name="arrow-left" size={23} color={C.ink} />
      </MotionPressable>
      <View className="flex-1">
        <Txt weight="semibold" className="text-xl">
          {title}
        </Txt>
        {subtitle && <Txt className="mt-0.5 text-xs text-muted">{subtitle}</Txt>}
      </View>
      {action && (
        <MotionPressable
          accessibilityRole="button"
          onPress={onAction}
          className="min-h-11 justify-center px-2"
        >
          <Txt weight="semibold" className="text-sm text-muted">
            {action}
          </Txt>
        </MotionPressable>
      )}
    </View>
  );
}
export function CoachLink({
  label,
  onPress,
  icon = "chevron-right",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  disabled?: boolean;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      className="min-h-12 flex-row items-center justify-between gap-3 py-3"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Txt weight="semibold" className="flex-1 text-sm text-ink">
        {label}
      </Txt>
      <MaterialCommunityIcons name={icon} size={20} color={C.ink} />
    </MotionPressable>
  );
}
export function Notes({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((text, index) => (
        <View key={`${index}:${text}`} className="mt-2 flex-row items-start gap-2">
          <Txt className="mt-0.5 text-sm text-ink">·</Txt>
          <Txt className="flex-1 text-sm leading-6 text-muted">{text}</Txt>
        </View>
      ))}
    </View>
  );
}
export function Choice<T extends string | number>({
  value,
  label,
  selected,
  onSelect,
  disabled = false,
}: {
  value: T;
  label: string;
  selected: boolean;
  onSelect: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <MotionPressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={() => onSelect(value)}
      className={`min-h-12 justify-center rounded-2xl  px-4 py-3 ${selected ? "bg-ink" : "bg-panel"}`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Txt weight="semibold" className={`text-sm ${selected ? "text-black" : "text-ink"}`}>
        {label}
      </Txt>
    </MotionPressable>
  );
}
