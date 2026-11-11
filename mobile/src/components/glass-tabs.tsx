import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { AccessibilityInfo, Platform, View } from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";

type BlurContextValue = { target: RefObject<View | null> | undefined; setTarget: (value: RefObject<View | null>) => void };
const Context = createContext<BlurContextValue | null>(null);
export function TabGlassProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<RefObject<View | null>>();
  const value = useMemo(() => ({ target, setTarget }), [target]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

// Only the screen content is sampled. The floating bar is outside the target,
// which avoids a recursive blur and keeps scrolling lists live on Android.
export function TabGlassScene({ children }: { children: React.ReactNode }) {
  const local = useRef<View | null>(null);
  const context = useContext(Context);
  const setTarget = context?.setTarget;
  useFocusEffect(useCallback(() => { setTarget?.(local); }, [setTarget]));
  return <BlurTargetView ref={local} style={{ flex: 1 }} collapsable={false}>{children}</BlurTargetView>;
}

export function TabGlassSurface() {
  const context = useContext(Context);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (active) setReduceTransparency(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduceTransparency);
    return () => { active = false; listener.remove(); };
  }, []);
  const canBlur = !reduceTransparency && (Platform.OS !== "android" || Number(Platform.Version) >= 31);
  return <View pointerEvents="none" className={`absolute inset-0 ${canBlur ? "bg-[#000000]/35" : "bg-panel"}`}>
    {canBlur && <BlurView blurTarget={context?.target} blurMethod="dimezisBlurViewSdk31Plus" intensity={65} tint="systemUltraThinMaterialDark" style={{ position: "absolute", inset: 0 }} />}
    <LinearGradient colors={["#FFFFFF12", "#FFFFFF02", "#00000020"]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ position: "absolute", inset: 0 }} />

  </View>;
}
