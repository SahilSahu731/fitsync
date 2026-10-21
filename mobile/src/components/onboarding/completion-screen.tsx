import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeInDown, FadeOut, ReduceMotion, ZoomIn } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { C } from "@/src/constants/theme";
import { PrimaryButton, Txt } from "@/src/components/ui";
import { useReducedMotion } from "./motion";
import type { Draft } from "./config";

// Stable builders run through Reanimated's layout lifecycle, not NativeWind's
// render-time CSS animation adapter. All visual styling stays in className.
const checkEntrance = ZoomIn.springify().damping(14).reduceMotion(ReduceMotion.System);
const copyEntrance = FadeInDown.duration(350).delay(400).reduceMotion(ReduceMotion.System);
const burstEntrance = ZoomIn.duration(650).reduceMotion(ReduceMotion.System);
const burstExit = FadeOut.duration(350).reduceMotion(ReduceMotion.System);
const particles = [
  "-translate-y-28", "translate-x-20 -translate-y-20", "translate-x-28",
  "translate-x-20 translate-y-20", "translate-y-28", "-translate-x-20 translate-y-20",
  "-translate-x-28", "-translate-x-20 -translate-y-20",
];

export function CompletionScreen({ draft, onContinue }: { draft: Draft; onContinue: () => void }) {
  const reduced = useReducedMotion();
  const [showBurst, setShowBurst] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowBurst(false), 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="grow items-center justify-center p-7">
        <View className="h-[260px] w-[260px] items-center justify-center" accessible={false} importantForAccessibility="no-hide-descendants">
          {!reduced && showBurst && <Animated.View entering={burstEntrance} exiting={burstExit} className="absolute h-[260px] w-[260px] items-center justify-center">
            <View className="absolute h-48 w-48 rounded-full border border-brand/40" />
            {particles.map((position, i) => <View key={position} className={`absolute ${position}`}>
              <View className={`rounded-sm ${i % 2 ? "h-3 w-[5px] bg-ink" : "h-2 w-2 bg-brand"}`} />
            </View>)}
          </Animated.View>}
          <Animated.View entering={checkEntrance} className="h-28 w-28 items-center justify-center rounded-full bg-brand">
            <MaterialCommunityIcons name="check" color={C.bg} size={58} />
          </Animated.View>
        </View>
        <Animated.View entering={copyEntrance} className="items-center">
          <Txt accessibilityRole="header" weight="semibold" className="text-center text-4xl tracking-[-1px]">You showed up.</Txt>
          <Txt className="mt-3 text-center text-base leading-[25px] text-muted">Your setup is saved. Now take it{"\n"}one workout at a time.</Txt>
          <View className="mt-7 rounded-full bg-panel px-5 py-3"><Txt weight="medium" className="text-sm text-brand">{draft.trainingDays} days a week · {draft.minutesPerWorkout} minutes for you</Txt></View>
        </Animated.View>
      </ScrollView>
      <View className="px-6 pb-5"><PrimaryButton title="Let’s get moving" onPress={onContinue} /></View>
    </SafeAreaView>
  );
}
