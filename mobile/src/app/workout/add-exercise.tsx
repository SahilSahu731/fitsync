import { useAppAlert } from "@/src/components/app-dialog";
import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { getExercises, type Exercise } from "@/src/features/exercises/api";
import { useWorkout } from "@/src/features/workouts/workout-context";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

export default function AddWorkoutExercise() {
  const Alert = useAppAlert();
  const router = useRouter();
  const { addExercise, busy } = useWorkout();

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const timeout = setTimeout(async () => {
      setLoading(true);

      try {
        const response = await getExercises({
          q: query,
          page: 1,
          pageSize: 50,
        });

        if (active) setItems(response.items);
      } catch (error) {
        console.warn(error);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  const handleAdd = async (exercise: Exercise) => {
    try {
      await addExercise(exercise.id);
      router.back();
    } catch {
      Alert.alert("Error", "Could not add this exercise.");
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center px-5 py-5">
        <Pressable onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
        </Pressable>

        <Txt weight="bold" className="ml-4 text-2xl">
          Add Exercise
        </Txt>
      </View>

      <View className="mx-5 mb-5 flex-row items-center rounded-2xl border border-border bg-panel px-4">
        <MaterialCommunityIcons name="magnify" size={22} color={C.muted} />

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises..."
          placeholderTextColor={C.muted}
          className="h-14 flex-1 px-3 text-ink"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={C.brand} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => void handleAdd(item)}
              disabled={busy}
              className="mb-3 flex-row items-center rounded-2xl border border-border bg-panel p-4"
            >
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-elevated">
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={23}
                  color={C.brand}
                />
              </View>

              <View className="ml-3 flex-1">
                <Txt weight="semibold" className="text-base">
                  {item.name}
                </Txt>

                <Txt className="mt-1 text-xs text-muted">
                  {item.regionLabel} · {item.equipment.join(", ")}
                </Txt>
              </View>

              <MaterialCommunityIcons
                name="plus-circle"
                size={26}
                color={C.brand}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
