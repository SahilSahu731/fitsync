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
  type ProgramDetail
} from "@/src/features/training-catalog/api";

export default function ProgramDetailScreen() {
  const Alert = useAppAlert();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    let active = true;

    async function load() {
      try {
        const [detail, mine] = await Promise.all([
          catalogApi.program(id),
          catalogApi.myPrograms()
        ]);

        if (!active) return;

        setProgram(detail);
        setSaved(
          mine.some(item => item.training_programs?.id === id)
        );
      } catch {
        if (active) setError("Could not load this program.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  const handleSave = async () => {
    if (!program || saving || saved) return;

    setSaving(true);

    try {
      await catalogApi.saveProgram(program.id);
      setSaved(true);

      Alert.alert(
        "Program saved!",
        "Your program and its routines are saved in Train. Choose a routine there to start a workout.",
        [
          { text: "Stay here" },
          {
            text: "Go to Train",
            onPress: () => router.push("/(tabs)/train")
          }
        ],
        "success"
      );
    } catch (error) {
      Alert.alert(
        "Could not save",
        error instanceof Error ? error.message : "Please try again."
      );
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

  if (!program) {
    return (
      <View className="flex-1 items-center justify-center bg-bg p-6">
        <Txt className="text-muted">{error || "Program not found."}</Txt>
      </View>
    );
  }

  const days = [...program.training_program_days]
    .sort((a, b) => a.day_number - b.day_number);

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View className="relative">
          {program.cover_url ? (
            <Image
              source={{ uri: program.cover_url }}
              className="h-64 w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-52 items-center justify-center bg-panel">
              <MaterialCommunityIcons
                name="weight-lifter"
                size={72}
                color={C.brand}
              />
            </View>
          )}

          <Pressable
            onPress={() => router.back()}
            className="absolute left-5 top-5 h-11 w-11 items-center justify-center rounded-full bg-bg/80"
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={25}
              color={C.ink}
            />
          </Pressable>
        </View>

        <View className="px-5 pt-6">
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="check-decagram"
              size={19}
              color={C.brand}
            />

            <Txt weight="semibold" className="ml-2 text-xs text-brand">
              CREATED BY {program.author.toUpperCase()}
            </Txt>
          </View>

          <Txt weight="extra" className="mt-3 text-[34px]">
            {program.name}
          </Txt>

          <Txt className="mt-2 text-base text-muted">
            {program.tagline}
          </Txt>

          <View className="mt-6 flex-row flex-wrap gap-2">
            {[
              program.level,
              program.goal.replace("_", " "),
              program.equipment,
              `${program.days_per_week} days/week`,
              `${program.duration_weeks} weeks`
            ].map(item => (
              <View key={item} className="rounded-xl bg-panel px-3 py-2">
                <Txt weight="semibold" className="text-xs capitalize">
                  {item}
                </Txt>
              </View>
            ))}
          </View>

          <Txt weight="bold" className="mb-3 mt-8 text-xl">
            About this program
          </Txt>

          <Txt className="text-[15px] leading-6 text-muted">
            {program.description}
          </Txt>

          <Txt weight="bold" className="mb-2 mt-8 text-xl">
            Weekly schedule
          </Txt>

          <Txt className="mb-5 text-sm text-muted">
            Your training week, day by day.
          </Txt>

          {days.map(day => {
            const routine = day.training_routines;

            return (
              <Pressable
                key={day.id}
                disabled={!routine}
                onPress={() => {
                  if (!routine) return;

                  router.push({
                    pathname: "/explore/routines/[id]",
                    params: { id: routine.id }
                  });
                }}
                className="mb-3 rounded-2xl border border-border bg-panel p-4"
              >
                <View className="flex-row items-center">
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-elevated">
                    <Txt weight="extra" className="text-lg text-brand">
                      {day.day_number}
                    </Txt>
                  </View>

                  <View className="ml-3 flex-1">
                    <Txt weight="bold" className="text-base">
                      {day.label}
                    </Txt>

                    <Txt className="mt-1 text-xs text-muted">
                      {routine
                        ? `${routine.estimated_minutes} min · ${routine.level}`
                        : "Recovery day"}
                    </Txt>
                  </View>

                  <MaterialCommunityIcons
                    name={routine ? "chevron-right" : "weather-night"}
                    size={23}
                    color={C.muted}
                  />
                </View>

                {routine?.training_routine_exercises && (
                  <View className="mt-4 border-t border-border pt-3">
                    {[...routine.training_routine_exercises]
                      .sort((a, b) => a.position - b.position)
                      .map(item => (
                        <View
                          key={item.id}
                          className="flex-row justify-between py-1.5"
                        >
                          <Txt className="flex-1 text-xs text-muted">
                            {item.exercises.name}
                          </Txt>

                          <Txt weight="semibold" className="text-xs">
                            {item.sets} × {item.min_reps}–{item.max_reps}
                          </Txt>
                        </View>
                      ))}
                  </View>
                )}
              </Pressable>
            );
          })}
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
              {saved ? "✓ SAVED TO MY TRAINING" : "SAVE PROGRAM"}
            </Txt>
          )}
        </Pressable>
      </View>
    </View>
  );
}