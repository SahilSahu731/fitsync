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

import {
  workoutApi,
  type SetType,
  type TemplateInput,
} from "@/src/features/workouts/api";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

type DraftExercise = TemplateInput["exercises"][number] & {
  name: string;
};

const SET_TYPES: SetType[] = ["warmup", "normal", "heavy", "failure", "drop"];

const emptySet = () => ({
  setType: "normal" as SetType,
  targetReps: 10,
  targetWeight: null as number | null,
});

export default function CreateWorkoutScreen() {
  const Alert = useAppAlert();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");

  const [catalog, setCatalog] = useState<Exercise[]>([]);
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const timer = setTimeout(async () => {
      try {
        const result = await getExercises({
          q: search,
          page: 1,
          pageSize: 30,
        });

        if (active) setCatalog(result.items);
      } catch (error) {
        console.warn(error);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  const addExercise = (item: Exercise) => {
    setExercises((current) => [
      ...current,
      {
        exerciseId: item.id,
        name: item.name,
        notes: "",
        restSeconds: 90,
        sets: [emptySet(), emptySet(), emptySet()],
      },
    ]);
  };

  const updateExercise = (index: number, change: Partial<DraftExercise>) => {
    setExercises((current) =>
      current.map((item, i) => (i === index ? { ...item, ...change } : item)),
    );
  };

  const updateTarget = (
    exerciseIndex: number,
    setIndex: number,
    field: "targetReps" | "targetWeight" | "setType",
    value: number | null | SetType,
  ) => {
    setExercises((current) =>
      current.map((exercise, i) => {
        if (i !== exerciseIndex) return exercise;

        return {
          ...exercise,
          sets: exercise.sets.map((set, j) =>
            j === setIndex ? { ...set, [field]: value } : set,
          ),
        };
      }),
    );
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Routine name", "Enter a name for this reusable session.");
      return;
    }

    if (!exercises.length) {
      Alert.alert("Add exercises", "Choose at least one exercise.");
      return;
    }

    setLoading(true);

    try {
      await workoutApi.createTemplate({
        name: name.trim(),
        description,
        exercises: exercises.map(({ name: _name, ...rest }) => rest),
      });

      router.replace("/(tabs)/train");
    } catch (error) {
      Alert.alert(
        "Could not save",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-5 py-5">
        <Pressable onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={C.ink} />
        </Pressable>

        <Txt weight="bold" className="text-lg">
          Create Routine
        </Txt>

        <Pressable onPress={() => void save()} disabled={loading}>
          <Txt weight="medium" className="text-brand">
            Save
          </Txt>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 100 }}>
        <Txt weight="bold" className="text-[34px]">
          Build Your Session.
        </Txt>

        <Txt className="mb-6 mt-2 text-muted">
          Plan one session you can repeat. Saving does not start a workout.
        </Txt>

        <Txt weight="semibold" className="mb-2">
          Routine name
        </Txt>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Push Day"
          placeholderTextColor={C.muted}
          className="mb-4 h-14 rounded-2xl bg-panel px-4 text-ink"
        />

        <Txt weight="semibold" className="mb-2">
          Description
        </Txt>

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          placeholderTextColor={C.muted}
          className="mb-7 min-h-16 rounded-2xl bg-panel px-4 py-3 text-ink"
          multiline
        />

        {exercises.map((exercise, index) => (
          <View
            key={`${exercise.exerciseId}-${index}`}
            className="mb-4 rounded-[24px] bg-panel p-4"
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Txt weight="semibold" className="flex-1 text-lg">
                {exercise.name}
              </Txt>

              <Pressable
                onPress={() =>
                  setExercises((current) =>
                    current.filter((_, i) => i !== index),
                  )
                }
              >
                <MaterialCommunityIcons
                  name="close-circle-outline"
                  size={24}
                  color={C.muted}
                />
              </Pressable>
            </View>

            <Txt className="mb-3 text-xs text-muted">REST BETWEEN SETS</Txt>

            <View className="mb-4 flex-row gap-2">
              {[60, 90, 120, 180].map((seconds) => (
                <Pressable
                  key={seconds}
                  onPress={() =>
                    updateExercise(index, { restSeconds: seconds })
                  }
                  className={`rounded-xl px-3 py-2 ${
                    exercise.restSeconds === seconds
                      ? "bg-brand"
                      : "bg-elevated"
                  }`}
                >
                  <Txt
                    weight="semibold"
                    className={
                      exercise.restSeconds === seconds
                        ? "text-bg"
                        : "text-muted"
                    }
                  >
                    {seconds}s
                  </Txt>
                </Pressable>
              ))}
            </View>

            {exercise.sets.map((set, setIndex) => (
              <View key={setIndex} className="mb-3 rounded-xl bg-elevated p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <Txt weight="semibold" className="text-xs">
                    SET {setIndex + 1}
                  </Txt>

                  <Pressable
                    onPress={() =>
                      updateExercise(index, {
                        sets: exercise.sets.filter((_, i) => i !== setIndex),
                      })
                    }
                    disabled={exercise.sets.length <= 1}
                  >
                    <MaterialCommunityIcons
                      name="minus-circle-outline"
                      size={20}
                      color={C.muted}
                    />
                  </Pressable>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-3"
                >
                  {SET_TYPES.map((type) => (
                    <Pressable
                      key={type}
                      onPress={() =>
                        updateTarget(index, setIndex, "setType", type)
                      }
                      className={`mr-2 rounded-lg px-3 py-2 ${
                        set.setType === type ? "bg-brand" : "bg-panel"
                      }`}
                    >
                      <Txt
                        weight="semibold"
                        className={`text-xs capitalize ${
                          set.setType === type ? "text-bg" : "text-muted"
                        }`}
                      >
                        {type}
                      </Txt>
                    </Pressable>
                  ))}
                </ScrollView>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Txt className="mb-1 text-xs text-muted">TARGET KG</Txt>

                    <TextInput
                      value={set.targetWeight?.toString() ?? ""}
                      onChangeText={(value) =>
                        updateTarget(
                          index,
                          setIndex,
                          "targetWeight",
                          value.trim() === "" ? null : Number(value),
                        )
                      }
                      keyboardType="decimal-pad"
                      placeholder="Weight"
                      placeholderTextColor={C.muted}
                      className="rounded-xl bg-panel px-3 py-3 text-ink"
                    />
                  </View>

                  <View className="flex-1">
                    <Txt className="mb-1 text-xs text-muted">TARGET REPS</Txt>

                    <TextInput
                      value={set.targetReps?.toString() ?? ""}
                      onChangeText={(value) =>
                        updateTarget(
                          index,
                          setIndex,
                          "targetReps",
                          value.trim() === "" ? null : Number(value),
                        )
                      }
                      keyboardType="number-pad"
                      placeholder="Reps"
                      placeholderTextColor={C.muted}
                      className="rounded-xl bg-panel px-3 py-3 text-ink"
                    />
                  </View>
                </View>
              </View>
            ))}

            <Pressable
              onPress={() =>
                updateExercise(index, {
                  sets: [...exercise.sets, emptySet()],
                })
              }
              className="items-center rounded-xl border border-dashed border-border py-3"
            >
              <Txt weight="semibold" className="text-brand">
                + Add Set
              </Txt>
            </Pressable>
          </View>
        ))}

        <Txt weight="bold" className="mb-3 mt-4 text-xl">
          Add exercises
        </Txt>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercise library..."
          placeholderTextColor={C.muted}
          className="mb-3 h-14 rounded-2xl border border-border bg-panel px-4 text-ink"
        />

        {catalog.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => addExercise(item)}
            className="mb-2 flex-row items-center justify-between rounded-xl bg-panel px-4 py-4"
          >
            <View className="flex-1">
              <Txt weight="semibold">{item.name}</Txt>
              <Txt className="mt-1 text-xs text-muted">{item.regionLabel}</Txt>
            </View>

            <MaterialCommunityIcons
              name="plus-circle"
              size={25}
              color={C.brand}
            />
          </Pressable>
        ))}

        <Pressable
          onPress={() => void save()}
          disabled={loading}
          className="mt-6 items-center rounded-2xl bg-brand py-5"
        >
          {loading ? (
            <ActivityIndicator color={C.bg} />
          ) : (
            <Txt weight="bold" className="text-bg">
              SAVE WORKOUT
            </Txt>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
