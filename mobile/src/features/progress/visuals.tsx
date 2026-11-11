import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
export function Icon({
  name,
  color = C.ink,
  size = 22,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  return <MaterialCommunityIcons name={name} color={color} size={size} />;
}
export function PanelCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View className="mb-4 rounded-[28px] bg-panel p-6" style={style}>
      {children}
    </View>
  );
}
export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-4 mt-8 flex-row items-center justify-between gap-4">
      <Txt accessibilityRole="header" weight="medium" className="flex-1 text-xl tracking-[-0.5px]">
        {title}
      </Txt>
      {action && (
        <MotionPressable
          accessibilityRole="button"
          onPress={onAction}
          className="min-h-11 justify-center"
        >
          <Txt weight="medium" className="text-xs text-muted">
            {action}
          </Txt>
        </MotionPressable>
      )}
    </View>
  );
}
export function SmallButton({
  label,
  icon = "plus",
  color = C.ink,
  onPress,
  disabled = false,
}: {
  label: string;
  icon?: IconName;
  color?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-full bg-elevated px-5 py-3 ${disabled ? "opacity-40" : ""}`}
    >
      <Icon name={icon} color={color} size={18} />
      <Txt weight="medium" className="text-xs" style={{ color }}>
        {label}
      </Txt>
    </MotionPressable>
  );
}
export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`h-11 w-11 items-center justify-center rounded-full bg-panel ${disabled ? "opacity-30" : ""}`}
    >
      <Icon name={icon} size={21} />
    </MotionPressable>
  );
}
