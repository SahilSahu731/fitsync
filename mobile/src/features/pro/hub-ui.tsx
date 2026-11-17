import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";

// This treatment belongs to the Pro tab. The companion and other screens keep their own UI.
export { Reveal, ProStat } from "./ui";
export const PRO = {
  accent: "#C5F460",
  cyan: "#A9DDE3",
  violet: "#C6BAF2",
  gold: "#ECD7A8",
  muted: "#A3A3A3",
  surface: "#111111",
};
export type ProIcon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
const GlassContext = createContext<{ target: RefObject<View | null>; opaque: boolean } | null>(
  null,
);

export function ProScene({ children }: { children: React.ReactNode }) {
  const target = useRef<View | null>(null);
  const [opaque, setOpaque] = useState(Platform.OS === "ios");
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let active = true;
    let changed = false;
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => {
        if (active && !changed) setOpaque(value);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceTransparencyChanged", (value) => {
      changed = true;
      if (active) setOpaque(value);
    });
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  return (
    <GlassContext.Provider value={{ target, opaque }}>
      <View className="flex-1 bg-black">
        <BlurTargetView
          ref={target}
          collapsable={false}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <LinearGradient
            colors={["#191919", "#050505", "#000000"]}
            locations={[0, 0.32, 0.65]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </BlurTargetView>
        {children}
      </View>
    </GlassContext.Provider>
  );
}

export function GlassCard({
  children,
  style,
  accent = false,
  blur = true,
  className = "",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: boolean;
  blur?: boolean;
  className?: string;
}) {
  const glass = useContext(GlassContext);
  const canBlur =
    blur && glass && !glass.opaque && (Platform.OS !== "android" || Number(Platform.Version) >= 31);
  return (
    <View
      className={`overflow-hidden rounded-[26px] ${className}`}
      style={[
        {
          backgroundColor: canBlur ? "#FFFFFF05" : PRO.surface,
          borderWidth: 1,
          borderColor: accent ? "#FFFFFF24" : "#FFFFFF12",
        },
        style,
      ]}
    >
      {canBlur && (
        <BlurView
          pointerEvents="none"
          blurTarget={glass.target}
          blurMethod="dimezisBlurViewSdk31Plus"
          intensity={28}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}
      {!glass?.opaque && (
        <LinearGradient
          pointerEvents="none"
          colors={accent ? ["#FFFFFF15", "#FFFFFF03", "#FFFFFF08"] : ["#FFFFFF08", "#FFFFFF02"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View className="p-5">{children}</View>
    </View>
  );
}

export function ProSection({
  title,
  eyebrow,
  description,
  action,
  onAction,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mb-4 mt-7">
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          {eyebrow && <Txt className="mb-1 text-[10px] text-muted">{eyebrow}</Txt>}
          <Txt accessibilityRole="header" weight="medium" className="text-xl tracking-[-0.5px]">
            {title}
          </Txt>
        </View>
        {action && (
          <MotionPressable
            accessibilityRole="button"
            onPress={onAction}
            className="min-h-11 justify-center px-2"
          >
            <Txt className="text-xs text-muted">{action} ↗</Txt>
          </MotionPressable>
        )}
      </View>
      {description && <Txt className="mt-2 text-xs leading-5 text-muted">{description}</Txt>}
    </View>
  );
}

export function ProAction({
  title,
  subtitle,
  icon,
  onPress,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  icon: ProIcon;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="min-h-20 flex-row items-center gap-3 rounded-[22px] border border-white/5 bg-white/5 p-4"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/5">
        <MaterialCommunityIcons name={icon} size={22} color="white" />
      </View>
      <View className="min-w-0 flex-1">
        <Txt weight="medium" className="text-sm">
          {title}
        </Txt>
        {subtitle && <Txt className="mt-1 text-[11px] leading-[18px] text-muted">{subtitle}</Txt>}
      </View>
      <MaterialCommunityIcons name="chevron-right" color={PRO.muted} size={19} />
    </MotionPressable>
  );
}

export function ProPill({
  label,
  selected = false,
  onPress,
  disabled = false,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className="min-h-11 items-center justify-center rounded-full px-4"
      style={{ backgroundColor: selected ? "#FFFFFF" : "#FFFFFF0A", opacity: disabled ? 0.4 : 1 }}
    >
      <Txt weight="medium" className="text-xs" style={{ color: selected ? "#000000" : "#A3A3A3" }}>
        {label}
      </Txt>
    </MotionPressable>
  );
}

export function ProButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      className="min-h-14 flex-row items-center justify-center gap-3 rounded-full px-5"
      style={{ backgroundColor: secondary ? "#FFFFFF0B" : "#FFFFFF", opacity: disabled ? 0.4 : 1 }}
    >
      <Txt
        weight="semibold"
        className="text-sm"
        style={{ color: secondary ? "#FFFFFF" : "#000000" }}
      >
        {loading ? "Working…" : title}
      </Txt>
      {!loading && (
        <MaterialCommunityIcons
          name="arrow-right"
          size={18}
          color={secondary ? "#FFFFFF" : "#000000"}
        />
      )}
    </MotionPressable>
  );
}
