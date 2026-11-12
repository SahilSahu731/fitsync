import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { AccessibilityInfo, Platform, View } from "react-native";
import { BlurTargetView, BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { cssInterop } from "nativewind";

const GlassTarget = cssInterop(BlurTargetView, { className: "style" });
const GlassBlur = cssInterop(BlurView, { className: "style" });
const GlassShine = cssInterop(LinearGradient, { className: "style" });

type BlurContext = {
  target: RefObject<View | null> | undefined;
  setTarget: (value: RefObject<View | null>) => void;
};
const Context = createContext<BlurContext | null>(null);

export function TabGlassProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<RefObject<View | null>>();
  const value = useMemo(() => ({ target, setTarget }), [target]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

// The bar samples only the screen, so the blur never includes itself.
export function TabGlassScene({ children }: { children: React.ReactNode }) {
  const target = useRef<View | null>(null);
  const context = useContext(Context);
  const setTarget = context?.setTarget;
  useFocusEffect(
    useCallback(() => {
      setTarget?.(target);
    }, [setTarget]),
  );
  return (
    <GlassTarget ref={target} className="flex-1" collapsable={false}>
      {children}
    </GlassTarget>
  );
}

export function TabGlassSurface() {
  const context = useContext(Context);
  const [reduceTransparency, setReduceTransparency] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let active = true;
    let preferenceChanged = false;
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => {
        if (active && !preferenceChanged) setReduceTransparency(value);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceTransparencyChanged", (value) => {
      preferenceChanged = true;
      if (active) setReduceTransparency(value);
    });
    return () => {
      active = false;
      listener.remove();
    };
  }, []);

  const canBlur = !reduceTransparency && (Platform.OS !== "android" || Boolean(context?.target));

  return (
    <View
      pointerEvents="none"
      className="absolute inset-0"
      style={{ backgroundColor: canBlur ? "rgba(18,20,24,0.18)" : "#24262B" }}
    >
      {canBlur && (
        <GlassBlur
          blurTarget={context?.target}
          blurMethod={
            Number(Platform.Version) >= 31 ? "dimezisBlurViewSdk31Plus" : "dimezisBlurView"
          }
          blurReductionFactor={2}
          intensity={60}
          tint={Platform.OS === "ios" ? "systemUltraThinMaterialDark" : "dark"}
          className="absolute inset-0"
        />
      )}
      {!reduceTransparency && (
        <GlassShine
          colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0.025)", "rgba(255,255,255,0.07)"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          className="absolute inset-0"
        />
      )}
    </View>
  );
}
