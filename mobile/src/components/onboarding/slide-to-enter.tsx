import React from "react";
import { View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Txt } from "@/src/components/ui";

const THUMB = 52;
const PAD = 6;
const HEIGHT = THUMB + PAD * 2;
const THRESHOLD = 0.8;

type Props = {
  label: string;
  busyLabel: string;
  busy?: boolean;
  onComplete: () => void;
};

/**
 * Drag right (from anywhere on the bar) or tap the bar. Both run the same
 * finish animation and call onComplete once. No spring or bounce.
 */
export function SlideToEnter({ label, busyLabel, busy = false, onComplete }: Props) {
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const max = useSharedValue(0);
  const fired = useSharedValue(false);

  const finish = () => {
    "worklet";
    if (fired.value) return;
    fired.value = true;
    x.value = withTiming(max.value, { duration: 180 }, (done) => {
      if (done) runOnJS(onComplete)();
    });
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-16, 16])
    .onBegin(() => {
      start.value = x.value;
    })
    .onUpdate((e) => {
      if (fired.value) return;
      x.value = Math.min(Math.max(start.value + e.translationX, 0), max.value);
    })
    .onEnd(() => {
      if (fired.value) return;
      if (max.value > 0 && x.value >= max.value * THRESHOLD) finish();
      else x.value = withTiming(0, { duration: 160 });
    });

  const tap = Gesture.Tap().onEnd((_e, success) => {
    if (success) finish();
  });

  const gesture = Gesture.Exclusive(pan, tap);

  const ratio = () => {
    "worklet";
    return max.value > 0 ? x.value / max.value : 0;
  };

  const fillStyle = useAnimatedStyle(() => ({ width: x.value + THUMB + PAD * 2 }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ratio(), [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ratio(), [0.75, 1], [1, 0], Extrapolation.CLAMP),
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ratio(), [0.75, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <GestureHandlerRootView style={{ width: "100%" }}>
      <GestureDetector gesture={gesture}>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={busy ? busyLabel : label}
          accessibilityHint="Double tap to continue"
          accessibilityState={{ disabled: busy }}
          accessibilityActions={[{ name: "activate" }]}
          onAccessibilityAction={() => finish()}
          onLayout={(e) => {
            max.value = Math.max(e.nativeEvent.layout.width - THUMB - PAD * 2, 0);
          }}
          style={{ height: HEIGHT }}
          className="w-full justify-center overflow-hidden rounded-2xl border border-white/15 bg-black"
        >
          <Animated.View
            pointerEvents="none"
            style={[
              { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.14)" },
              fillStyle,
            ]}
          />

          <Animated.View
            pointerEvents="none"
            style={[{ paddingLeft: THUMB + PAD }, labelStyle]}
            className="flex-row items-center justify-center gap-2"
          >
            <Txt weight="semibold" className="text-[15px]">
              {busy ? busyLabel : label}
            </Txt>
            {!busy && (
              <View className="flex-row">
                <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" style={{ opacity: 0.35, marginRight: -9 }} />
                <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" style={{ opacity: 0.6, marginRight: -9 }} />
                <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
              </View>
            )}
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: PAD,
                top: PAD,
                width: THUMB,
                height: THUMB,
                borderRadius: 12,
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
              },
              thumbStyle,
            ]}
          >
            <Animated.View style={[{ position: "absolute" }, arrowStyle]}>
              <MaterialCommunityIcons name="arrow-right" size={24} color="#000000" />
            </Animated.View>
            <Animated.View style={[{ position: "absolute" }, checkStyle]}>
              <MaterialCommunityIcons name="check" size={24} color="#000000" />
            </Animated.View>
          </Animated.View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}