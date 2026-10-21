import React from "react";
import { View } from "react-native";
import { Txt } from "@/src/components/ui";
import { Segments } from "./segments";
import type { StepProps } from "./config";

export function RoutineStep({ draft, update }: StepProps) {
  return <View className="gap-[28px]">
    <View>
      <Txt weight="semibold" className="text-[17px] mb-[14px]">Days per week</Txt>
      <Segments label="Training days per week" value={draft.trainingDays} options={[1, 2, 3, 4, 5, 6, 7].map(value => ({ value, label: String(value) }))} onChange={trainingDays => update({ trainingDays })} />
    </View>
    <View>
      <Txt weight="semibold" className="text-[17px] mb-[14px]">Time for each workout</Txt>
      <Segments label="Workout duration" value={draft.minutesPerWorkout} options={([30, 45, 60] as const).map(value => ({ value, label: `${value} min` }))} onChange={minutesPerWorkout => update({ minutesPerWorkout })} />
    </View>
    <View className="border-t border-border pt-[24px]" accessibilityLiveRegion="polite">
      <Txt weight="medium" className="text-[26px]">{draft.trainingDays * draft.minutesPerWorkout}<Txt className="text-[15px] text-muted"> minutes a week for you</Txt></Txt>
      <Txt className="text-muted text-[14px] leading-[21px] mt-[8px]">Start with what feels doable. You can adjust your routine anytime.</Txt>
    </View>
  </View>;
}
