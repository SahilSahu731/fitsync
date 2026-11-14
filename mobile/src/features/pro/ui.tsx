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
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable, useReducedAppMotion } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

export const PRO = {
  accent: "#D4F89A",
  cyan: "#A9DDE3",
  violet: "#C6BAF2",
  gold: "#ECD7A8",
  muted: "#989DA5",
  surface: "#181D23",
};
type Icon = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
const GlassContext = createContext<{ target?: RefObject<View | null>; reduced: boolean }>({
  reduced: true,
});
export function ProScene({ children }: { children: React.ReactNode }) {
  const target = useRef<View | null>(null);
  const [reduced, setReduced] = useState(() => Platform.OS === "ios");
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let active = true;
    let changed = false;
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => {
        if (active && !changed) setReduced(value);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceTransparencyChanged", (value) => {
      changed = true;
      if (active) setReduced(value);
    });
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  return (
    <GlassContext.Provider value={{ target, reduced }}>
      <View className="flex-1" style={{ backgroundColor: "#0B0F13" }}>
        <BlurTargetView
          ref={target}
          collapsable={false}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <LinearGradient
            colors={["#1B2927", "#10151C", "#0B0F13"]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={{
              position: "absolute",
              top: -120,
              right: -150,
              width: 400,
              height: 420,
              borderRadius: 210,
              backgroundColor: "#99C77B12",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 380,
              left: -160,
              width: 320,
              height: 400,
              borderRadius: 200,
              backgroundColor: "#9BA6E510",
            }}
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
  className = "",
  blur = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: boolean;
  className?: string;
  blur?: boolean;
}) {
  const { target, reduced } = useContext(GlassContext);
  const canBlur = blur && !reduced && (Platform.OS !== "android" || !!target);
  return (
    <View
      className={`overflow-hidden rounded-[28px] ${className}`}
      style={[
        {
          backgroundColor: canBlur ? "#FFFFFF07" : PRO.surface,
          borderWidth: 1,
          borderColor: accent ? "#D4F89A35" : "#FFFFFF12",
        },
        style,
      ]}
    >
      {canBlur && (
        <BlurView
          pointerEvents="none"
          blurTarget={target}
          blurMethod={
            Platform.OS === "android"
              ? Number(Platform.Version) >= 31
                ? "dimezisBlurViewSdk31Plus"
                : "none"
              : "none"
          }
          intensity={35}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        pointerEvents="none"
        colors={accent ? ["#D4F89A12", "#FFFFFF02", "#A9DDE306"] : ["#FFFFFF08", "#FFFFFF01"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View className="p-5">{children}</View>
    </View>
  );
}
export function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduced = useReducedAppMotion();
  const [value] = useState(() => new Animated.Value(reduced ? 1 : 0));
  useEffect(() => {
    if (reduced) {
      value.setValue(1);
      return;
    }
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [value, reduced, delay]);
  return (
    <Animated.View
      style={{
        opacity: value,
        transform: [
          { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
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
    <View className="mb-4 mt-8">
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          {eyebrow && (
            <Txt
              weight="medium"
              className="mb-2 text-[10px] tracking-[2px]"
              style={{ color: PRO.accent }}
            >
              {eyebrow.toUpperCase()}
            </Txt>
          )}
          <Txt
            accessibilityRole="header"
            weight="medium"
            className="text-[24px] leading-[30px] tracking-[-0.7px]"
          >
            {title}
          </Txt>
        </View>
        {action && (
          <MotionPressable
            accessibilityRole="button"
            onPress={onAction}
            className="min-h-11 justify-center px-2"
          >
            <Txt className="text-xs" style={{ color: PRO.accent }}>
              {action} ↗
            </Txt>
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
  icon: Icon;
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
      className="min-h-20 flex-row items-center gap-4 rounded-[22px] border border-white/5 bg-white/5 px-4 py-4"
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-2xl"
        style={{ backgroundColor: "#D4F89A0D" }}
      >
        <MaterialCommunityIcons name={icon} size={24} color={PRO.accent} />
      </View>
      <View className="min-w-0 flex-1">
        <Txt weight="medium" className="text-sm">
          {title}
        </Txt>
        {subtitle && <Txt className="mt-1 text-[11px] leading-[17px] text-muted">{subtitle}</Txt>}
      </View>
      <MaterialCommunityIcons name="arrow-top-right" color={PRO.muted} size={19} />
    </MotionPressable>
  );
}
export function ProPill({
  label,
  selected,
  onPress,
  disabled = false,
}: {
  label: string;
  selected: boolean;
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
      style={{ backgroundColor: selected ? PRO.accent : "#FFFFFF08", opacity: disabled ? 0.4 : 1 }}
    >
      <Txt weight="medium" className="text-xs" style={{ color: selected ? "#11180C" : "#B4BBC4" }}>
        {label}
      </Txt>
    </MotionPressable>
  );
}
export function ProStat({
  label,
  value,
  unit,
  detail,
}: {
  label: string;
  value: string | number;
  unit?: string;
  detail?: string;
}) {
  return (
    <View className="min-w-0 flex-1">
      <Txt className="text-[10px] tracking-wide text-muted">{label}</Txt>
      <Txt weight="medium" className="mt-2 text-[28px] leading-9 tracking-[-1px]">
        {value}
        {unit && <Txt className="text-xs tracking-normal text-muted"> {unit}</Txt>}
      </Txt>
      {detail && <Txt className="mt-1 text-[10px] leading-4 text-muted">{detail}</Txt>}
    </View>
  );
}
export function ProButton({
  title,
  onPress,
  disabled = false,
  loading = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      className="min-h-14 flex-row items-center justify-center gap-2 rounded-full px-5"
      style={{ backgroundColor: PRO.accent, opacity: disabled ? 0.4 : 1 }}
    >
      <Txt weight="semibold" className="text-sm" style={{ color: C.bg }}>
        {loading ? "Working…" : title}
      </Txt>
      {!loading && <MaterialCommunityIcons name="arrow-right" size={19} color={C.bg} />}
    </MotionPressable>
  );
}
