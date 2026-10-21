import React from "react";
import { View } from "react-native";
import { HeightPicker } from "./height-picker";
import { WeightPicker } from "./weight-picker";
import { Segments } from "./segments";
import type { StepProps } from "./config";

export function MeasurementStep({
  draft,
  update,
  kind,
  weightUnit,
  onUnitChange,
}: StepProps & {
  kind: "height" | "weight";
  weightUnit: "kg" | "lb";
  onUnitChange: (unit: "kg" | "lb") => void;
}) {
  if (kind === "height")
    return (
      <HeightPicker value={draft.heightCm} onChange={heightCm => update({ heightCm })} />
    );
  const pounds = weightUnit === "lb";
  return (
    <View>
      <View className="items-center mb-[12px]">
        <Segments
          label="Weight unit"
          value={weightUnit}
          options={
            [
              { value: "kg", label: "kg" },
              { value: "lb", label: "lb" },
            ] as const
          }
          onChange={onUnitChange}
        />
      </View>
      <WeightPicker
        key={weightUnit}
        value={pounds ? draft.weightKg * 2.2046226218 : draft.weightKg}
        onChange={(value) =>
          update({
            weightKg: Math.max(
              25,
              Math.min(
                350,
                Number((pounds ? value / 2.2046226218 : value).toFixed(4)),
              ),
            ),
          })
        }
        min={pounds ? 55.1 : 25}
        max={pounds ? 771.6 : 350}
        unit={weightUnit}
      />
    </View>
  );
}
