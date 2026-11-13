import React from "react";
import { ActivityIndicator, Text, View, type TextProps } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "./motion";
import { C } from "@/src/constants/theme";

type TxtProps = TextProps & {
  weight?: "regular" | "medium" | "semibold" | "bold" | "extra";
  className?: string;
};
const fonts = {
  regular: "font-poppins-regular",
  medium: "font-poppins-medium",
  semibold: "font-poppins-semibold",
  bold: "font-poppins-bold",
  extra: "font-poppins-extra",
};
export function Txt({ weight = "regular", className = "", ...props }: TxtProps) {
  const hasColor = /\btext-(?:ink|bg|brand|muted|white|black|\[#)/.test(className);
  return (
    <Text {...props} className={`${fonts[weight]} ${hasColor ? "" : "text-ink"} ${className}`} />
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`overflow-hidden rounded-card bg-panel p-6 ${className}`}>{children}</View>
  );
}

export function Pill({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`min-h-11 items-center justify-center rounded-full px-5 py-3 ${active ? "bg-ink" : "bg-panel"}`}
    >
      <Txt weight="medium" className={`text-xs ${active ? "text-bg" : "text-muted"}`}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  dark?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className={`min-h-14 flex-row items-center justify-center rounded-full px-6 py-4 ${disabled && !loading ? "bg-elevated" : "bg-ink active:bg-white/80"}`}
    >
      {loading ? (
        <ActivityIndicator color={C.bg} />
      ) : (
        <Txt weight="semibold" className={`text-sm ${disabled ? "text-muted" : "text-bg"}`}>
          {title}
        </Txt>
      )}
    </Pressable>
  );
}

export function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-4 flex-row items-center justify-between gap-4">
      <Txt accessibilityRole="header" weight="medium" className="flex-1 text-xl tracking-[-0.5px]">
        {title}
      </Txt>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          className="min-h-11 flex-row items-center justify-center gap-1"
        >
          <Txt weight="medium" className="text-xs text-muted">
            {action}
          </Txt>
          <MaterialCommunityIcons name="arrow-top-right" size={15} color={C.muted} />
        </Pressable>
      )}
    </View>
  );
}

export function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View className="mb-5">
      <View className="flex-row items-center justify-between gap-4">
        <View className="min-w-0 flex-1">
          {eyebrow && (
            <Txt weight="medium" className="mb-1 text-[12px] text-muted">
              {eyebrow}
            </Txt>
          )}
          <Txt
            accessibilityRole="header"
            weight="medium"
            className="text-[36px] leading-[44px] tracking-[-1.5px]"
          >
            {title}
          </Txt>
        </View>
        {action}
      </View>
      {subtitle && <Txt className="mt-1 max-w-sm text-sm leading-6 text-muted">{subtitle}</Txt>}
    </View>
  );
}
