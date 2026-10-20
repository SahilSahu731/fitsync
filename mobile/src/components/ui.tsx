
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type TextProps
} from "react-native";
import { C } from "@/src/constants/theme";

type TxtProps = TextProps & {
  weight?: "regular" | "medium" | "semibold" | "bold" | "extra";
  className?: string;
};

const fonts = {
  regular: "Outfit_400Regular",
  medium: "Outfit_500Medium",
  semibold: "Outfit_600SemiBold",
  bold: "Outfit_700Bold",
  extra: "Outfit_800ExtraBold"
};

export function Txt({
  weight = "regular",
  style,
  className = "",
  ...props
}: TxtProps) {
  const hasColor =
    /\btext-(?:ink|bg|brand|muted|white|black|\[#)/.test(className);

  return (
    <Text
      {...props}
      className={hasColor ? className : `text-ink ${className}`}
      style={[{ fontFamily: fonts[weight] }, style]}
    />
  );
}

export function Card({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-card border border-border bg-panel p-5 ${className}`}>
      {children}
    </View>
  );
}

export function Pill({
  label,
  active = false,
  onPress
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-4 py-2.5 ${active ? "border-brand bg-brand" : "border-border bg-panel"}`}
    >
      <Txt
        weight="semibold"
        className="text-sm"
        style={{ color: active ? C.bg : C.ink }}
      >
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
  dark = false
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
      className={`h-14 flex-row items-center justify-center rounded-2xl ${dark ? "bg-ink" : "bg-brand"} ${disabled || loading ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={C.bg} />
      ) : (
        <Txt
          weight="bold"
          className="text-base"
          style={{ color: C.bg }}
        >
          {title}
        </Txt>
      )}
    </Pressable>
  );
}

export function SectionHeading({
  title,
  action,
  onAction
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <Txt weight="bold" className="text-[20px]">
        {title}
      </Txt>

      {action ? (
        <Pressable onPress={onAction}>
          <Txt weight="semibold" className="text-sm text-brand">
            {action} →
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
