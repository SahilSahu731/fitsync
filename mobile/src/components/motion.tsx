import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { useFocusEffect } from "expo-router";
import { cssInterop } from "nativewind";

const MotionContext = createContext(true);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    let preferenceChanged = false;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", value => {
      preferenceChanged = true;
      if (active) setReduced(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active && !preferenceChanged) setReduced(value);
    }).catch(() => {});
    return () => { active = false; subscription.remove(); };
  }, []);
  return <MotionContext.Provider value={reduced}>{children}</MotionContext.Provider>;
}

export const useReducedAppMotion = () => useContext(MotionContext);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: "style" });

/** Keeps the original layout, hit area and callbacks while adding a short spring. */
export function MotionPressable({ style, onPressIn, onPressOut, onHoverIn, onHoverOut, disabled, ...props }: PressableProps & { className?: string }) {
  const reduced = useReducedAppMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (reduced || disabled) { scale.stopAnimation(); scale.setValue(1); }
    return () => scale.stopAnimation();
  }, [disabled, reduced, scale]);
  return <AnimatedPressable
    {...props}
    disabled={disabled}
    style={[typeof style === "function" ? style({ pressed, hovered }) : style, { transform: [{ scale }] }]}
    onHoverIn={event => { setHovered(true); onHoverIn?.(event); }}
    onHoverOut={event => { setHovered(false); onHoverOut?.(event); }}
    onPressIn={event => {
      setPressed(true);
      if (!reduced && !disabled) Animated.spring(scale, { toValue: 0.975, speed: 45, bounciness: 0, useNativeDriver: true }).start();
      onPressIn?.(event);
    }}
    onPressOut={event => {
      setPressed(false);
      if (!reduced) Animated.spring(scale, { toValue: 1, speed: 28, bounciness: 5, useNativeDriver: true }).start();
      onPressOut?.(event);
    }}
  />;
}

/** Runs on tab focus; no timers or continuous animations remain on hidden tabs. */
export function ScreenEntrance({ children, style, delay = 0 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; delay?: number }) {
  const reduced = useReducedAppMotion();
  const [progress] = useState(() => new Animated.Value(1));
  useFocusEffect(useCallback(() => {
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 320, delay, useNativeDriver: true });
    animation.start();
    return () => { animation.stop(); progress.setValue(1); };
  }, [delay, progress, reduced]));
  return <Animated.View style={[style, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>{children}</Animated.View>;
}

export function ProgressFill({ ratio, color, trackColor = "#FFFFFF12", height = 5 }: { ratio: number; color: string; trackColor?: string; height?: number }) {
  const reduced = useReducedAppMotion();
  const [fill] = useState(() => new Animated.Value(Math.min(1, Math.max(0, ratio))));
  useEffect(() => {
    const target = Math.min(1, Math.max(0, ratio));
    if (reduced) { fill.setValue(target); return; }
    const animation = Animated.timing(fill, { toValue: target, duration: 450, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [color, fill, ratio, reduced]);
  return <Animated.View style={{ height, borderRadius: height, overflow: "hidden", backgroundColor: trackColor }}><Animated.View style={{ height, borderRadius: height, width: fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }), backgroundColor: color }} /></Animated.View>;
}
