import { Text, View } from "react-native";

import {
  EQUIPMENT_OPTIONS,
  MUSCLE_OPTIONS,
  prettifyEnum,
} from "../../constants";

import type {
  Equipment,
  ExerciseMechanic,
  MovementPattern,
  MuscleGroup,
} from "../../types";

import { ToggleChip } from "./toggle-chip";

const MOVEMENT_PATTERNS: MovementPattern[] = [
  "HORIZONTAL_PUSH",
  "VERTICAL_PUSH",
  "HORIZONTAL_PULL",
  "VERTICAL_PULL",
  "SQUAT",
  "HINGE",
  "LUNGE",
  "CARRY",
  "ROTATION",
  "CORE",
  "OTHER",
];

const MECHANICS: ExerciseMechanic[] = ["COMPOUND", "ISOLATION"];

interface Props {
  primaryMuscles: MuscleGroup[];

  secondaryMuscles: MuscleGroup[];

  equipment: Equipment[];

  mechanic: ExerciseMechanic;

  movementPattern: MovementPattern;

  onTogglePrimaryMuscle: (value: MuscleGroup) => void;

  onToggleSecondaryMuscle: (value: MuscleGroup) => void;

  onToggleEquipment: (value: Equipment) => void;

  onMechanicChange: (value: ExerciseMechanic) => void;

  onMovementPatternChange: (value: MovementPattern) => void;
}

export function ClassificationSection({
  primaryMuscles,
  secondaryMuscles,
  equipment,
  mechanic,
  movementPattern,
  onTogglePrimaryMuscle,
  onToggleSecondaryMuscle,
  onToggleEquipment,
  onMechanicChange,
  onMovementPatternChange,
}: Props) {
  return (
    <>
      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Primary muscles
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {MUSCLE_OPTIONS.map((option) => (
          <ToggleChip
            key={option.value}
            label={option.label}
            selected={primaryMuscles.includes(option.value)}
            onPress={() => {
              onTogglePrimaryMuscle(option.value);
            }}
          />
        ))}
      </View>

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Secondary muscles
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {MUSCLE_OPTIONS.map((option) => (
          <ToggleChip
            key={option.value}
            label={option.label}
            selected={secondaryMuscles.includes(option.value)}
            onPress={() => {
              onToggleSecondaryMuscle(option.value);
            }}
          />
        ))}
      </View>

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Equipment
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {EQUIPMENT_OPTIONS.map((option) => (
          <ToggleChip
            key={option.value}
            label={option.label}
            selected={equipment.includes(option.value)}
            onPress={() => {
              onToggleEquipment(option.value);
            }}
          />
        ))}
      </View>

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Exercise type
      </Text>

      <View className="mt-3 flex-row gap-2">
        {MECHANICS.map((value) => (
          <ToggleChip
            key={value}
            label={prettifyEnum(value)}
            selected={mechanic === value}
            onPress={() => {
              onMechanicChange(value);
            }}
          />
        ))}
      </View>

      <Text className="mt-8 text-[12px] font-bold uppercase tracking-[1.8px] text-white/35">
        Movement
      </Text>

      <View className="mt-3 flex-row flex-wrap gap-2">
        {MOVEMENT_PATTERNS.map((value) => (
          <ToggleChip
            key={value}
            label={prettifyEnum(value)}
            selected={movementPattern === value}
            onPress={() => {
              onMovementPatternChange(value);
            }}
          />
        ))}
      </View>
    </>
  );
}
