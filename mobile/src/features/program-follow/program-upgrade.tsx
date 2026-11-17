import React from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { PrimaryButton, Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

export function ProgramUpgrade({
  coach = false,
  onUpgrade,
}: {
  coach?: boolean;
  onUpgrade?: () => void;
}) {
  return (
    <View className="rounded-[26px] border border-brand/20 bg-panel p-6">
      <View className="mb-6 h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
        <MaterialCommunityIcons name="calendar-check-outline" size={28} color={C.brand} />
      </View>
      <Txt className="mb-2 text-[10px] tracking-[2px] text-brand">FITSYNC PRO</Txt>
      <Txt weight="semibold" className="text-[28px] leading-9 tracking-[-0.5px]">
        {coach ? "A program built around you." : "Give your training a direction."}
      </Txt>
      <Txt className="mb-6 mt-3 text-sm leading-6 text-muted">
        {coach
          ? "Build a personal program around your goals, equipment and schedule with Pro. Review your next session, targets and weekly progress together."
          : "Choose and follow a program with Pro. Get your weekly schedule, session guidance and progress connected in one place."}
      </Txt>
      <PrimaryButton
        title="Choose my program with Pro"
        onPress={onUpgrade ?? (() => router.push("/pro"))}
      />
      <Txt className="mt-4 text-xs leading-5 text-muted">
        You can keep logging workouts and viewing your saved workout history with Free.
      </Txt>
    </View>
  );
}
