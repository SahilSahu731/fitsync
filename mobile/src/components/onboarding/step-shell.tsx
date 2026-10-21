import React from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";
import { STEPS } from "./config";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";

const stepEntrance = FadeInDown.duration(240).reduceMotion(ReduceMotion.System);

type Props = {
  step: number;
  editing: boolean;
  saving: boolean;
  transitioning: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  children: React.ReactNode;
};
export function StepShell({
  step,
  editing,
  saving,
  transitioning,
  onBack,
  onNext,
  onSkip,
  children,
}: Props) {
  const busy = saving || transitioning;
  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-bg">
      <View className="px-6 pb-5 pt-2.5">
        <View className="mb-[18px] flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editing ? "Back to review" : "Previous step"}
            disabled={busy || (step === 0 && !editing)}
            onPress={onBack}
            className={`h-11 w-11 justify-center active:opacity-50 ${step === 0 && !editing ? "opacity-0" : "opacity-100"}`}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={C.ink} />
          </Pressable>
          <Txt weight="semibold" className="text-base">
            Your starting point
          </Txt>
          <Txt className="w-11 text-right text-[13px] text-muted">
            {step + 1}/{STEPS.length}
          </Txt>
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: STEPS.length, now: step + 1 }}
          accessibilityLabel="Setup progress"
          className="flex-row gap-[5px]"
        >
          {STEPS.map((item, index) => (
            <View
              key={item.label}
              className={`h-[3px] flex-1 rounded-full ${index <= step ? "bg-brand" : "bg-border"}`}
            />
          ))}
        </View>
      </View>
      <ScrollView
        key={step}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-6 pb-8 pt-[18px]"
      >
        <Animated.View entering={stepEntrance}>
          {/* <Txt weight="medium" className="mb-3 text-[13px] text-brand">
            {STEPS[step].label}
          </Txt> */}
          <Txt
            accessibilityRole="header"
            weight="semibold"
            className="text-[32px] leading-[38px] tracking-[-0.8px]"
          >
            {STEPS[step].title}
          </Txt>
          <Txt className="mb-[30px] mt-2.5 text-[15px] leading-[23px] text-muted">
            {STEPS[step].subtitle}
          </Txt>
          {children}
        </Animated.View>
      </ScrollView>
      <View className="shrink-0 border-t border-[#242427] px-6 pb-[18px] pt-3.5">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy, busy }}
          disabled={busy}
          onPress={onNext}
          className="min-h-14 flex-row items-center justify-center gap-3 rounded-2xl bg-brand p-4 active:scale-[0.98] active:bg-[#E8682C]"
        >
          {busy && <ActivityIndicator size="small" color={C.bg} accessibilityLabel={saving ? "Saving setup" : "Opening next step"} />}
          <Txt accessibilityLiveRegion="polite" weight="semibold" className="text-[17px] text-bg">
            {saving
              ? "Saving your setup…"
              : transitioning
                ? "Continuing…"
              : editing
                ? "Save changes"
                : step === STEPS.length - 1
                  ? "Finish my setup"
                  : "Continue"}
          </Txt>
          {!busy && (
            <MaterialCommunityIcons name="arrow-right" size={20} color={C.bg} />
          )}
        </Pressable>
        {step === 6 && !editing && (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onSkip}
            className="items-center p-3.5 active:opacity-70"
          >
            <Txt className="text-sm text-muted">Skip for now</Txt>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
