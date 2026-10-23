import { useAppAlert } from "@/src/components/app-dialog";
import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  View
} from "react-native";

import {
  useLocalSearchParams,
  useRouter
} from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

import {
  catalogApi,
  type Routine
} from "@/src/features/training-catalog/api";

export default function RoutineDetailScreen() {
  const Alert = useAppAlert();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!id) return;

    let active = true;

    void catalogApi.routine(id)
      .then(data => {
        if (active) setRoutine(data);
      })
      .catch(console.warn)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const handleSave = async () => {
    if (!routine || saving) return;

    setSaving(true);

    try {
      await catalogApi.saveRoutine(routine.id);
      setSaved(true);

      Alert.alert(
        "Routine saved",
        "This reusable session is saved in Train. Start it there when you are ready to log a workout.",
        [
          { text: "OK" },
          {
            text: "Open Train",
            onPress: () => router.push("/(tabs)/train")
          }
        ],
        "success"
      );
    } catch {
      Alert.alert("Error", "Could not save the routine.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={C.brand} />
      </View>
    );
  }

  if (!routine) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Txt>Routine unavailable.</Txt>
      </View>
    );
  }

  const exercises = [...(routine.training_routine_exercises ?? [])]
    .sort((a, b) => a.position - b.position);

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {routine.image_url ? (
          <Image
            source={{ uri: routine.image_url }}
            className="h-56 w-full"
            resizeMode="cover"
          />
        ) : (
          <View className="h-48 items-center justify-center bg-panel">
            <MaterialCommunityIcons
              name="dumbbell"
              size={65}
              color={C.brand}
            />
          </View>
        )}

        <View className="px-5 pt-6">
          <Pressable onPress={() => router.back()} className="mb-5">
            <MaterialCommunityIcons
              name="arrow-left"
              size={26}
              color={C.ink}
            />
          </Pressable>

          <Txt weight="semibold" className="text-xs text-brand">
            CREATED BY {routine.author.toUpperCase()}
          </Txt>

          <Txt weight="extra" className="mt-2 text-[34px]">
            {routine.name}
          </Txt>

          <Txt className="mt-3 text-[15px] leading-6 text-muted">
            {routine.description}
          </Txt>

          <View className="mt-5 flex-row gap-2">
            {[
              routine.level,
              routine.equipment,
              `${routine.estimated_minutes} min`
            ].map(value => (
              <View key={value} className="rounded-xl bg-panel px-3 py-2">
                <Txt weight="semibold" className="text-xs capitalize">
                  {value}
                </Txt>
              </View>
            ))}
          </View>

          <Txt weight="bold" className="mb-4 mt-9 text-xl">
            Exercises ({exercises.length})
          </Txt>

          {exercises.map((item, index) => (
            <View
              key={item.id}
              className="mb-3 rounded-[22px] border border-border bg-panel p-4"
            >
              <View className="flex-row items-start">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-elevated">
                  <Txt weight="extra" className="text-brand">
                    {index + 1}
                  </Txt>
                </View>

                <View className="ml-3 flex-1">
                  <Txt weight="bold" className="text-[17px]">
                    {item.exercises.name}
                  </Txt>

                  <Txt weight="semibold" className="mt-2 text-sm text-brand">
                    {item.sets} sets × {item.min_reps}–{item.max_reps}
                  </Txt>

                  <Txt className="mt-1 text-xs text-muted">
                    Rest {item.rest_seconds} seconds
                  </Txt>
                </View>
              </View>

              {Boolean(item.notes) && (
                <View className="mt-4 rounded-xl bg-elevated p-3">
                  <Txt className="text-sm leading-5 text-muted">
                    {item.notes}
                  </Txt>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-bg px-5 pb-8 pt-4">
        <Pressable
          onPress={() => void handleSave()}
          disabled={saving || saved}
          className={`items-center rounded-2xl py-5 ${
            saved ? "bg-panel" : "bg-brand"
          }`}
        >
          {saving ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <Txt
              weight="bold"
              className={saved ? "text-brand" : "text-bg"}
            >
              {saved ? "✓ ROUTINE SAVED" : "SAVE ROUTINE"}
            </Txt>
          )}
        </Pressable>
      </View>
    </View>
  );
}