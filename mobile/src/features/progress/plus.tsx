import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { MotionPressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useBilling } from "@/src/features/billing/billing-context";
import { Icon } from "./visuals";

export function PlusPreview() {
  const { isPro } = useBilling();
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={isPro ? "Manage FitSync Pro" : "Explore FitSync Pro"}
      onPress={() => router.push("/pro")}
      className="flex-row items-center gap-3 rounded-[22px] p-4"
    >
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-panel">
        <Icon name="star-four-points-outline" color={C.ink} />
      </View>
      <View className="flex-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Txt weight="semibold" className="text-sm">
            FitSync Pro
          </Txt>
          {isPro && <Txt className="text-[11px] text-ink">Active</Txt>}
        </View>
        <Txt className="mt-1 text-xs leading-5 text-muted">
          {isPro
            ? "Your weekly review and next steps are ready."
            : "A plan that adapts. A clearer next step."}
        </Txt>
      </View>
      <Icon name="chevron-right" color={C.muted} size={20} />
    </MotionPressable>
  );
}
