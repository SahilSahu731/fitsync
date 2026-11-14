import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { AccessibilityInfo, Platform, StyleSheet, View } from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

const GlassContext = createContext<{ target: RefObject<View | null>; opaque: boolean } | null>(
  null,
);

export function WorkoutGlassScene({ children }: { children: React.ReactNode }) {
  const target = useRef<View | null>(null);
  const [opaque, setOpaque] = useState(false);
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
  const value = useMemo(() => ({ target, opaque }), [opaque]);
  return (
    <GlassContext.Provider value={value}>
      <View style={{ flex: 1, backgroundColor: "#080A0E" }}>
        <BlurTargetView
          ref={target}
          collapsable={false}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <LinearGradient
            colors={["#252A35", "#10141C", "#080A0E", "#1A2029"]}
            locations={[0, 0.3, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </BlurTargetView>
        {children}
      </View>
    </GlassContext.Provider>
  );
}

// Every surface samples one static backdrop. Rows themselves do not create blur views.
export const WorkoutGlassSurface = React.memo(function WorkoutGlassSurface() {
  const glass = useContext(GlassContext);
  const canBlur =
    glass && !glass.opaque && (Platform.OS !== "android" || Number(Platform.Version) >= 31);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: canBlur ? "rgba(22,25,32,0.4)" : "#20242C" },
      ]}
    >
      {canBlur && (
        <BlurView
          blurTarget={glass.target}
          intensity={35}
          blurReductionFactor={2}
          tint={Platform.OS === "ios" ? "systemUltraThinMaterialDark" : "dark"}
          blurMethod="dimezisBlurViewSdk31Plus"
          style={StyleSheet.absoluteFill}
        />
      )}
      {!glass?.opaque && (
        <LinearGradient
          colors={["rgba(255,255,255,0.09)", "rgba(255,255,255,0.015)", "rgba(255,255,255,0.035)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
});
