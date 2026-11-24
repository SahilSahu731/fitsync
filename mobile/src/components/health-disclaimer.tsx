import React from "react";
import { View } from "react-native";
import { Txt } from "./ui";

export function HealthDisclaimer() {
  return (
    <View className="my-4 rounded-2xl bg-panel p-4">
      <Txt className="text-xs leading-5 text-muted">
        General fitness and nutrition guidance, not medical advice. Meal ideas, weight goals and
        training recommendations are not a medical treatment plan. Consult a qualified healthcare
        professional for individual medical or dietary needs.
      </Txt>
    </View>
  );
}
