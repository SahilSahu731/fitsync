import { Text, View } from "react-native";

import {
  LATERALITY_OPTIONS,
  LOAD_MODE_OPTIONS,
  REST_OPTIONS,
  TRACKING_OPTIONS,
} from "../../constants";

import { TRACKING_DESCRIPTIONS, usesWeight } from "../../tracking";

import type {
  ExerciseLaterality,
  ExerciseLoadMode,
  ExerciseTrackingType,
} from "../../types";

import { ToggleChip } from "./toggle-chip";

interface Props {
  trackingType: ExerciseTrackingType;

  laterality: ExerciseLaterality;

  loadMode: ExerciseLoadMode;

  defaultRestSeconds: number;

  onTrackingTypeChange: (value: ExerciseTrackingType) => void;

  onLateralityChange: (value: ExerciseLaterality) => void;

  onLoadModeChange: (value: ExerciseLoadMode) => void;

  onDefaultRestChange: (value: number) => void;
}

export function TrackingSection({
  trackingType,
  laterality,
  loadMode,
  defaultRestSeconds,
  onTrackingTypeChange,
  onLateralityChange,
  onLoadModeChange,
  onDefaultRestChange,
}: Props) {
  return (
    <>
      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        How do you track it?
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {TRACKING_OPTIONS.map((option) => (
          <ToggleChip
            key={option.value}
            label={option.label}
            selected={trackingType === option.value}
            onPress={() => {
              onTrackingTypeChange(option.value);
            }}
          />
        ))}
      </View>

      <View className="mt-3 rounded-2xl bg-brand-muted px-4 py-3">
        <Text className="text-[12px] leading-5 text-brand-bright">
          {TRACKING_DESCRIPTIONS[trackingType]}
        </Text>
      </View>

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Movement style
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {LATERALITY_OPTIONS.map((option) => (
          <ToggleChip
            key={option.value}
            label={option.label}
            selected={laterality === option.value}
            onPress={() => {
              onLateralityChange(option.value);
            }}
          />
        ))}
      </View>

      {usesWeight(trackingType) ? (
        <>
          <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
            Weight entry
          </Text>

          <View className="mt-3 flex-row flex-wrap gap-2">
            {LOAD_MODE_OPTIONS.map((option) => (
              <ToggleChip
                key={option.value}
                label={option.label}
                selected={loadMode === option.value}
                onPress={() => {
                  onLoadModeChange(option.value);
                }}
              />
            ))}
          </View>
        </>
      ) : null}

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Default rest
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {REST_OPTIONS.map((seconds) => (
          <ToggleChip
            key={seconds}
            label={seconds >= 60 ? `${seconds / 60} min` : `${seconds} sec`}
            selected={defaultRestSeconds === seconds}
            onPress={() => {
              onDefaultRestChange(seconds);
            }}
          />
        ))}
      </View>
    </>
  );
}
