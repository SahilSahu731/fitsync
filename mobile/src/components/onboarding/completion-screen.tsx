import React, { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Txt } from "@/src/components/ui";
import { useSession } from "@/src/context/session";
import { CompletionIllustration } from "./completion-illustration";
import { SlideToEnter } from "./slide-to-enter";
import { armOnboardingWelcome } from "./welcome-state";
import type { Draft } from "./config";

// One plain fade for the whole screen. No scale, no spring, no stagger.
const entrance = FadeIn.duration(350).reduceMotion(ReduceMotion.System);

function Stat({ value, unit, label }: { value: number; unit: string; label: string }) {
  return (
    <View className="flex-1 items-center py-4">
      <Txt weight="semibold" className="text-2xl tracking-[-0.5px]">
        {value}
        <Txt className="text-sm text-muted"> {unit}</Txt>
      </Txt>
      <Txt className="mt-1 text-xs text-muted">{label}</Txt>
    </View>
  );
}

export function CompletionScreen({ draft, onContinue }: { draft: Draft; onContinue: () => void }) {
  const { user } = useSession();
  const [entering, setEntering] = useState(false);
  const lock = useRef(false);

  async function enter() {
    if (lock.current) return;
    lock.current = true;
    setEntering(true);
    // Only the explicit entry into Home arms its delayed, one-time introduction.
    if (user?.id) await armOnboardingWelcome(user.id);
    onContinue();
  }

  const weeklyMinutes = draft.trainingDays * draft.minutesPerWorkout;

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="grow items-center justify-center px-6 pb-10 pt-6"
      >
        <Animated.View entering={entrance} className="w-full max-w-[380px] items-center">
          <View
            className="w-full max-w-[270px]"
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            <CompletionIllustration trainingDays={draft.trainingDays} />
          </View>

          <View className="mt-6 flex-row items-center gap-1.5">
            <MaterialCommunityIcons name="check-circle-outline" size={16} color="#FFFFFF" />
            <Txt weight="medium" className="text-sm">
              Setup complete
            </Txt>
          </View>

          <Txt
            accessibilityRole="header"
            weight="semibold"
            className="mt-3 text-center text-[34px] leading-[40px] tracking-[-1.2px]"
          >
            Your plan is ready.
          </Txt>
          <Txt className="mt-2 text-center text-sm leading-6 text-muted">
            Small sessions, done consistently, add up.
          </Txt>

          <View className="mt-7 w-full flex-row items-center rounded-2xl border border-white/10">
            <Stat value={draft.minutesPerWorkout} unit="min" label="Per session" />
            <View className="h-9 w-px bg-white/10" />
            <Stat value={weeklyMinutes} unit="min" label="Per week" />
          </View>

          <View className="mt-8 w-full">
            <SlideToEnter
              label="Slide to enter FitSync"
              busyLabel="Opening FitSync…"
              busy={entering}
              onComplete={() => void enter()}
            />
            <Txt className="mt-3 text-center text-xs text-muted">or tap the bar</Txt>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}