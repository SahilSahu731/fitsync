
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View
} from "react-native";

import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import {
  Exercise,
  ExerciseTaxonomies,
  getExercises,
  getTaxonomies,
  pretty
} from "@/src/features/exercises/api";

type FilterStripProps = {
  title: string;
  items: { code: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
};

function FilterStrip({
  title,
  items,
  value,
  onChange
}: FilterStripProps) {
  return (
    <View className="mt-5">
      <Txt weight="semibold" className="mb-2 px-6 text-xs text-muted">
        {title.toUpperCase()}
      </Txt>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
        {[{ code: "", label: "All" }, ...items].map(item => {
          const selected = value === item.code;

          return (
            <Pressable
              key={item.code}
              onPress={() => onChange(item.code)}
              className={`rounded-full border px-4 py-2.5 ${selected ? "border-brand bg-brand" : "border-border bg-panel"}`}
            >
              <Txt weight="semibold" className={`text-xs ${selected ? "text-bg" : "text-ink"}`}>
                {item.label}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ExerciseCard({
  exercise,
  onPress
}: {
  exercise: Exercise;
  onPress: () => void;
}) {
  const image = exercise.media.find(
    media => media.kind === "image"
  );

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-2xl border border-border bg-panel p-3"
    >
      <View className="mr-4 h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-xl bg-elevated">
        {image ? (
          <Image
            source={{ uri: image.url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        ) : (
          <MaterialCommunityIcons
            name="dumbbell"
            size={28}
            color={C.brand}
          />
        )}
      </View>

      <View className="flex-1">
        <Txt weight="bold" numberOfLines={2} className="text-[16px]">
          {exercise.name}
        </Txt>

        <Txt className="mt-1 text-xs text-muted">
          {exercise.categoryLabel} · {pretty(exercise.difficulty)}
        </Txt>

        <Txt numberOfLines={1} className="mt-1 text-[11px] text-muted">
          {exercise.primaryMuscles.map(pretty).join(", ") || exercise.regionLabel}
        </Txt>

        <Txt numberOfLines={1} className="mt-1 text-[11px] text-muted">
          {exercise.equipment.map(pretty).join(", ") || "No equipment"}
        </Txt>

        {exercise.status !== "published" && (
          <Txt weight="semibold" className="mt-1 text-xs text-brand">
            {pretty(exercise.status)}
          </Txt>
        )}
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={C.muted}
      />
    </Pressable>
  );
}

export default function LibraryScreen() {
  const router = useRouter();

  const [tax, setTax] = useState<ExerciseTaxonomies | null>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [bodyRegion, setBodyRegion] = useState("");

  const [page, setPage] = useState(1);

  const [items, setItems] = useState<Exercise[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      getTaxonomies()
        .then(taxonomies => {
          if (!active) return;
          setTax(taxonomies);
        })
        .catch(error => {
          if (active) {
            setError(error.message);
          }
        });

      return () => {
        active = false;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      // Changing refreshKey intentionally retries the request after an error.
      void refreshKey;
      setLoading(true);
      setError("");

      getExercises({
        q: query.trim(),
        category,
        muscle,
        equipment,
        bodyRegion,
        page,
        pageSize: 20
      })
        .then(response => {
          if (!active) return;

          setItems(previous => {
            if (page === 1) return response.items;

            const ids = new Set(previous.map(item => item.id));

            return [
              ...previous,
              ...response.items.filter(item => !ids.has(item.id))
            ];
          });

          setTotal(response.total);
        })
        .catch(error => {
          if (active) setError(error.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [query, category, muscle, equipment, bodyRegion, page, refreshKey])
  );

  function changeFilter(
    setter: (value: string) => void,
    value: string
  ) {
    setter(value);
    setPage(1);
  }

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 55 }}
      >
        <View className="px-6 pt-7">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Txt weight="medium" className="text-xs tracking-[2px] text-brand">
                KNOW YOUR MOVEMENT
              </Txt>

              <Txt weight="extra" className="mt-1 text-[29px]">
                EXERCISE LIBRARY.
              </Txt>
            </View>

          </View>

          <Txt className="mt-2 text-xs text-muted">
            {total} exercises · Strength, movement and mindfulness
          </Txt>


          <View className="mt-5 flex-row items-center rounded-2xl border border-border bg-panel px-4">
            <MaterialCommunityIcons
              name="magnify"
              color={C.muted}
              size={23}
            />

            <TextInput
              value={query}
              onChangeText={value => changeFilter(setQuery, value)}
              placeholder="Search exercise"
              placeholderTextColor={C.muted}
              className="ml-3 h-12 flex-1 text-ink"
              style={{ fontFamily: "Outfit_400Regular" }}
            />
          </View>
        </View>

        <FilterStrip
          title="Category"
          items={tax?.categories ?? []}
          value={category}
          onChange={value => changeFilter(setCategory, value)}
        />

        <FilterStrip
          title="Body region"
          items={tax?.bodyRegions ?? []}
          value={bodyRegion}
          onChange={value => changeFilter(setBodyRegion, value)}
        />

        <FilterStrip
          title="Target muscle"
          items={tax?.muscleGroups ?? []}
          value={muscle}
          onChange={value => changeFilter(setMuscle, value)}
        />

        <FilterStrip
          title="Equipment"
          items={tax?.equipmentTypes ?? []}
          value={equipment}
          onChange={value => changeFilter(setEquipment, value)}
        />

        <View className="mt-7 px-6">
          <Txt weight="semibold" className="mb-4 text-xs text-muted">
            {total} MATCHING EXERCISES
          </Txt>

          {error ? (
            <View className="rounded-2xl border border-border bg-panel p-4">
              <Txt>{error}</Txt>

              <Pressable onPress={() => setRefreshKey(value => value + 1)}>
                <Txt className="mt-3 text-brand">
                  Try again
                </Txt>
              </Pressable>
            </View>
          ) : null}

          {items.map(item => (
            <ExerciseCard
              key={item.id}
              exercise={item}
              onPress={() => router.push({
                pathname: "/exercise/[id]",
                params: { id: item.id }
              })}
            />
          ))}

          {loading && (
            <ActivityIndicator
              className="my-8"
              color={C.brand}
            />
          )}

          {!loading && !error && items.length === 0 && (
            <View className="items-center py-14">
              <MaterialCommunityIcons
                name="dumbbell"
                size={40}
                color={C.muted}
              />

              <Txt className="mt-4 text-muted">
                No exercises found.
              </Txt>
            </View>
          )}

          {!loading && items.length < total && (
            <Pressable
              onPress={() => setPage(value => value + 1)}
              className="mt-3 items-center rounded-2xl border border-border bg-panel p-4"
            >
              <Txt weight="semibold" className="text-brand">
                LOAD MORE
              </Txt>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
