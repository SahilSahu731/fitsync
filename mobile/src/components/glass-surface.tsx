import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export const GOLD = "#D29C21";

export function GlassSurface({
  accent = GOLD, // must be 6-digit hex
  intensity = 60,
  shimmer = true,
  shimmerDelay = 2200,
}: {
  accent?: string;
  intensity?: number;
  shimmer?: boolean;
  shimmerDelay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const sweep = useSharedValue(0);
  const animate = shimmer && !reduceMotion;

  useEffect(() => {
    if (!animate) return;
    sweep.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withDelay(shimmerDelay, withTiming(0, { duration: 0 }))
      ),
      -1
    );
  }, [animate, shimmerDelay, sweep]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -120 + sweep.value * (width + 240) }, { skewX: "-20deg" }],
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
      <LinearGradient
        colors={[`${accent}40`, `${accent}10`, "rgba(255,255,255,0.04)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55%" }}
      />
      {animate && (
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: 90 }, sweepStyle]}>
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