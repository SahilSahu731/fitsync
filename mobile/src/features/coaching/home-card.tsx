import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, Platform, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useBilling } from "@/src/features/billing/billing-context";
import { nextSession, displayDate } from "./model";
import { useCoaching } from "./use-coaching";

import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const GOLD = "#D29C21";

/** Frosted glass backdrop: blur + tint + top gloss + optional shimmer sweep. */
function GlassSurface({
  accent = GOLD,
  intensity = 60,
  shimmerDelay = 2200,
}: {
  accent?: string; // must be 6-digit hex
  intensity?: number;
  shimmerDelay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withDelay(shimmerDelay, withTiming(0, { duration: 0 }))
      ),
      -1
    );
  }, [reduceMotion, shimmer, shimmerDelay]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -120 + shimmer.value * (width + 240) },
      { skewX: "-20deg" },
    ],
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      <BlurView
        intensity={intensity}
        tint="dark"
        experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
        style={StyleSheet.absoluteFill}
      />

      {/* Accent tint with top-left light falloff */}
      <LinearGradient
        colors={[`${accent}40`, `${accent}10`, "rgba(255,255,255,0.04)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Glossy top highlight */}
      <LinearGradient
        colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55%" }}
      />

      {/* Shimmer sweep */}
      {!reduceMotion && (
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: 90 }, shimmerStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(255,255,255,0.28)", "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  );
}

export function CoachHomeButton() {
  const { isPro, loading } = useBilling();
  const reduceMotion = useReducedMotion();

  const pulse = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    glow.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [glow, pulse, reduceMotion]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + pulse.value * 0.12 },
      { rotate: `${pulse.value * 20 - 10}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + glow.value * 0.35,
    transform: [{ scale: 1 + glow.value * 0.15 }],
  }));

  return (
    <Animated.View entering={FadeInDown.duration(500).springify().damping(16)} className="mb-4">
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={isPro ? "Open your Pro personal coach" : "Explore personal coaching with Pro"}
        accessibilityState={{ disabled: loading, busy: loading }}
        disabled={loading}
        onPress={() => {
          if (!loading) router.push(isPro ? "/coach" : "/pro");
        }}
        className={`min-h-16 overflow-hidden rounded-[22px] border border-white/10 ${loading ? "opacity-60" : ""}`}
      >
        <GlassSurface />

        <View className="min-h-16 flex-row items-center gap-3 px-4 py-3">
          <View className="h-10 w-10 items-center justify-center">
            <Animated.View
              style={[
                {
                  position: "absolute",
                  height: 40,
                  width: 40,
                  borderRadius: 20,
                  backgroundColor: GOLD,
                },
                glowStyle,
              ]}
            />
            <View className="h-10 w-10 items-center justify-center rounded-full border border-yellow-500 bg-white/10">
              <Animated.View style={iconStyle}>
                <MaterialCommunityIcons name="crown" size={22} color="yellow" />
              </Animated.View>
            </View>
          </View>

          <Txt weight="semibold" className="flex-1 text-[15px]">
            Personal coach
          </Txt>

          <View className="rounded-full bg-yellow-400 px-2.5 py-1">
            <Txt weight="semibold" className="text-[10px] tracking-wider text-black">
              PRO
            </Txt>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="yellow" />
        </View>
      </MotionPressable>
    </Animated.View>
  );
}

export function CoachHomeCard({ compact = false }: { compact?: boolean }) {
  const { data, loading, error } = useCoaching();
  const { isPro } = useBilling();
  const reduceMotion = useReducedMotion();
  const next = nextSession(data?.plan ?? null);

  const float = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    float.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [float, reduceMotion]);

  // arrow nudges toward the top-right, inviting a tap
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: float.value * 2 },
      { translateY: float.value * -2 },
    ],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(120).duration(550).springify().damping(16)}
      className={compact ? "mb-3" : "mb-5"}
    >
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel="Open your personal plan"
        onPress={() => router.push("/coach")}
        className={
          compact
            ? "overflow-hidden rounded-[22px] border border-white/10 p-4"
            : "overflow-hidden rounded-[26px] border border-white/10 p-5"
        }
      >
        <GlassSurface accent="#FFFFFF" intensity={50} shimmerDelay={4200} />

        <View className={`${compact ? "mb-2" : "mb-4"} flex-row items-center gap-2`}>
          <MaterialCommunityIcons name="star-four-points-outline" size={18} color={C.ink} />
          <Txt weight="semibold" className="flex-1 text-xs tracking-[1.5px] text-ink">
            YOUR PERSONAL PLAN
          </Txt>
          {isPro && (
            <Txt weight="semibold" className="text-[11px] text-ink">
              PRO
            </Txt>
          )}
        </View>

        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Txt
              weight="semibold"
              className={compact ? "text-base leading-6" : "text-[23px] leading-7"}
            >
              {next?.name ?? (data?.plan ? "Every session counts." : "Your next step starts here.")}
            </Txt>
            <Txt className={`${compact ? "mt-1 text-xs" : "mt-2 text-sm"} leading-5 text-muted`}>
              {error
                ? "Open your plan to reconnect."
                : next
                  ? `${next.prescription.minutes} min · ${next.status === "active" ? "Ready to resume" : displayDate(next.date)}`
                  : loading
                    ? "Loading your plan…"
                    : data?.plan
                      ? "Review your progress and choose your next plan."
                      : "Build a starting plan around your goal, time and equipment."}
            </Txt>
          </View>

          <View className="h-11 w-11 items-center justify-center rounded-full bg-ink">
            <Animated.View style={arrowStyle}>
              <MaterialCommunityIcons name="arrow-top-right" size={23} color={C.bg} />
            </Animated.View>
          </View>
        </View>
      </MotionPressable>
    </Animated.View>
  );
}