import React from "react";
import { Image, Pressable, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import type { Routine } from "../api";

export function RoutineCard({
  routine,
  onPress
}: {
  routine: Routine;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row overflow-hidden rounded-2xl bg-panel"
    >
      {routine.image_url ? (
        <Image
          source={{ uri: routine.image_url }}
          className="h-28 w-28"
          resizeMode="cover"
        />
      ) : (
        <View className="h-28 w-28 items-center justify-center bg-elevated">
          <MaterialCommunityIcons
            name="dumbbell"
            size={32}
            color={C.brand}
          />
        </View>
      )}

      <View className="flex-1 justify-center p-3">
        <Txt weight="bold" className="text-xl">
          {routine.name}
        </Txt>

        <Txt className="mt-1 text-sm text-white/80" numberOfLines={2}>
          {routine.description}
        </Txt>

        <Txt weight="semibold" className="mt-2 text-sm capitalize text-green-400">
          {routine.level} · {routine.estimated_minutes} min
        </Txt>
      </View>
    </Pressable>
  );
}