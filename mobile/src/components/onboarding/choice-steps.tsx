import React from "react";
import { View } from "react-native";
import { OptionCard } from "./option-card";
import { GOALS, EXPERIENCE, EQUIPMENT, type StepProps } from "./config";

export function GoalStep({ draft, update }: StepProps) {
  return (
    <View accessibilityRole="radiogroup">
      {GOALS.map((option) => (
        <OptionCard
          key={option.value}
          {...option}
          selected={draft.goal === option.value}
          onPress={() => update({ goal: option.value })}
        />
      ))}
    </View>
  );
}
export function ExperienceStep({ draft, update }: StepProps) {
  return (
    <View accessibilityRole="radiogroup">
      {EXPERIENCE.map((option) => (
        <OptionCard
          key={option.value}
          {...option}
          selected={draft.experience === option.value}
          onPress={() => update({ experience: option.value })}
        />
      ))}
    </View>
  );
}
export function EquipmentStep({ draft, update }: StepProps) {
  return (
    <View accessibilityRole="radiogroup">
      {EQUIPMENT.map((option) => (
        <OptionCard
          key={option.value}
          {...option}
          selected={draft.equipment === option.value}
          onPress={() => update({ equipment: option.value })}
        />
      ))}
    </View>
  );
}
