
import React, {
  useMemo,
  useState
} from "react";

import {
  Pressable,
  ScrollView,
  TextInput,
  View
} from "react-native";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { exercises } from "@/data/sample";
import { Txt } from "@/src/components/ui";

const muscles = [
  "All",
  "Chest",
  "Back",
  "Shoulders",
  "Legs",
  "Arms",
  "Core"
];

export default function LibraryScreen() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("All");

  const filtered = useMemo(() => {
    return exercises.filter(exercise => {
      const matchesMuscle =
        muscle === "All" || exercise.muscle === muscle;

      const matchesQuery = (
        exercise.name + exercise.equipment
      )
        .toLowerCase()
        .includes(query.toLowerCase());

      return matchesMuscle && matchesQuery;
    });
  }, [query, muscle]);

  return (
    <View className="flex-1 bg-bg">
      <View className="px-6 pb-3 pt-6">
        <Txt
          weight="medium"
          className="text-xs tracking-[2px] text-brand"
        >
          KNOW YOUR MOVEMENT
        </Txt>

        <Txt weight="extra" className="mt-1 text-[34px]">
          EXERCISE LIBRARY.
        </Txt>

        <Txt className="mt-1 text-xs text-muted">
          12 sample entries · 100 curated exercises coming next
        </Txt>

        {/* Search */}

        <View className="mt-5 flex-row items-center rounded-2xl border border-border bg-panel px-4">
          <MaterialCommunityIcons
            name="magnify"
            color={C.muted}
            size={23}
          />

          <TextInput
            className="ml-3 h-12 flex-1 text-ink"
            style={{
              fontFamily: "Outfit_400Regular"
            }}
            placeholder="Search exercise or equipment"
            placeholderTextColor={C.muted}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {/* Muscle filters */}

      <View className="h-14">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            gap: 9,
            alignItems: "center"
          }}
        >
          {muscles.map(item => (
            <Pressable
              key={item}
              onPress={() => setMuscle(item)}
              className={`rounded-full border px-4 py-2.5 ${item === muscle ? "border-brand bg-brand" : "border-border bg-panel"}`}
            >
              <Txt
                weight="semibold"
                className="text-xs"
                style={{
                  color: item === muscle ? C.bg : C.ink
                }}
              >
                {item}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Exercise list */}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 10,
          paddingBottom: 35
        }}
      >
        <Txt
          weight="semibold"
          className="mb-3 text-xs tracking-[1px] text-muted"
        >
          {filtered.length} MATCHING EXERCISES
        </Txt>

        {filtered.map((exercise, index) => (
          <Pressable
            key={exercise.id}
            onPress={() =>
              router.push(`/exercise/${exercise.id}`)
            }
            className="mb-2.5 flex-row items-center rounded-2xl border border-border bg-panel p-3"
          >
            <View className="mr-4 h-14 w-14 items-center justify-center rounded-xl bg-elevated">
              <MaterialCommunityIcons
                name={
                  index % 3 === 0
                    ? "weight-lifter"
                    : index % 3 === 1
                      ? "dumbbell"
                      : "arm-flex"
                }
                size={28}
                color={C.brand}
              />
            </View>

            <View className="flex-1">
              <Txt
                weight="bold"
                className="text-[15px]"
              >
                {exercise.name}
              </Txt>

              <Txt className="mt-1 text-xs text-muted">
                {exercise.muscle} · {exercise.equipment}
              </Txt>
            </View>

            <MaterialCommunityIcons
              name="chevron-right"
              color={C.muted}
              size={24}
            />
          </Pressable>
        ))}

        {filtered.length === 0 ? (
          <View className="items-center py-12">
            <MaterialCommunityIcons
              name="magnify-close"
              size={36}
              color={C.muted}
            />

            <Txt className="mt-3 text-sm text-muted">
              No exercises match your filters.
            </Txt>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
