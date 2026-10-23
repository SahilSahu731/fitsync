import React from "react";
import { Image, Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import type { Program } from "../api";

export function ProgramCard({
  program,
  onPress
}: {
  program: Program;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 overflow-hidden rounded-[24px] bg-panel"
    >
      {program.cover_url ? (
        <Image
          source={{ uri: program.cover_url }}
          resizeMode="cover"
          className="h-40 w-full"
        />
      ) : (
        <View className="h-28 items-center justify-center bg-elevated">
          <MaterialCommunityIcons
            name="dumbbell"
            size={42}
            color={C.brand}
          />
        </View>
      )}

      <View className="p-4">
        <View className="flex-row items-center justify-between">
          <Txt weight="bold" className="flex-1 text-[24px]">
            {program.name}
          </Txt>
        </View>

        <Txt className="mt-1 text-sm text-white">
          {program.tagline}
        </Txt>

        <View className="mt-4 flex-row flex-wrap gap-1">
          {[
            program.level,
            `${program.days_per_week} days`,
            program.equipment,
            `${program.duration_weeks} weeks`
          ].map(label => (
            <View key={label} className="rounded-lg bg-elevated px-3 py-2">
              <Txt weight="semibold" className="text-xs capitalize">
                {label}
              </Txt>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}