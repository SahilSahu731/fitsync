import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  View
} from "react-native";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

import {
  catalogApi,
  type Category,
  type Program,
  type Filters,
  type Level,
  type Goal,
  type Equipment
} from "@/src/features/training-catalog/api";

import { ProgramCard } from "@/src/features/training-catalog/components/program-card";

const LEVELS: Array<{ label: string; value?: Level }> = [
  { label: "All levels" },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" }
];

const GOALS: Array<{ label: string; value?: Goal }> = [
  { label: "All goals" },
  { label: "Muscle", value: "muscle" },
  { label: "Strength", value: "strength" },
  { label: "Fat loss", value: "fat_loss" },
  { label: "Endurance", value: "endurance" },
  { label: "General", value: "general" }
];

const EQUIPMENT: Array<{ label: string; value?: Equipment }> = [
  { label: "All equipment" },
  { label: "Gym", value: "gym" },
  { label: "Dumbbells", value: "dumbbells" },
  { label: "Bodyweight", value: "bodyweight" },
  { label: "Bands", value: "bands" },
  { label: "Mixed", value: "mixed" }
];

function FilterRow<T extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: Array<{ label: string; value?: T }>;
  value?: T;
  onChange: (value?: T) => void;
}) {
  return (
    <View className="mb-3">
      <Txt weight="semibold" className="mb-2 text-xs text-muted">
        {label}
      </Txt>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map(option => (
          <Pressable
            key={option.label}
            onPress={() => onChange(option.value)}
            className={`mr-2 rounded-full border px-4 py-2.5 ${
              value === option.value
                ? "border-brand bg-brand"
                : "border-border bg-panel"
            }`}
          >
            <Txt
              weight="semibold"
              className={`text-xs ${
                value === option.value ? "text-bg" : "text-ink"
              }`}
            >
              {option.label}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function ExploreTrainingScreen() {
  const router = useRouter();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [programData, categoryData] = await Promise.all([
        catalogApi.programs(filters),
        catalogApi.categories()
      ]);

      setPrograms(programData);
      setCategories(categoryData);
    } catch {
      setError("Could not load the training library.");
    } finally {
      setLoading(false);
    }
  }, [filters.level, filters.goal, filters.equipment]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const matched = programs.filter(program =>
      `${program.name} ${program.description}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    );

    return showAll ? matched : matched.slice(0, 5);
  }, [programs, search, showAll]);

  const matchingCount = programs.filter(program =>
    `${program.name} ${program.description}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  ).length;

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingBottom: 130 }}
    >
      <View className="px-5 pt-6">
        <Txt weight="semibold" className="text-xs tracking-[2px] text-brand">
          FITSYNC EXPLORE
        </Txt>

        <Txt weight="extra" className="mt-2 text-[36px]">
          FIND YOUR TRAINING.
        </Txt>

        <Txt className="mt-2 text-sm text-muted">
          Discover a plan that fits your life.
        </Txt>

        <View className="mt-6 flex-row items-center rounded-2xl border border-border bg-panel px-4">
          <MaterialCommunityIcons
            name="magnify"
            size={23}
            color={C.muted}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search programs..."
            placeholderTextColor={C.muted}
            className="h-14 flex-1 px-3 text-ink"
          />
        </View>

        <Txt weight="bold" className="mb-4 mt-8 text-2xl">
          Programs
        </Txt>

        <FilterRow
          label="EXPERIENCE"
          options={LEVELS}
          value={filters.level}
          onChange={level => {
            setFilters(current => ({ ...current, level }));
            setShowAll(false);
          }}
        />

        <FilterRow
          label="GOAL"
          options={GOALS}
          value={filters.goal}
          onChange={goal => {
            setFilters(current => ({ ...current, goal }));
            setShowAll(false);
          }}
        />

        <FilterRow
          label="EQUIPMENT"
          options={EQUIPMENT}
          value={filters.equipment}
          onChange={equipment => {
            setFilters(current => ({ ...current, equipment }));
            setShowAll(false);
          }}
        />

        <View className="mb-4 mt-6 flex-row items-center justify-between">
          <Txt weight="bold" className="text-lg">
            {showAll ? "All programs" : "Top programs"}
          </Txt>

          <Txt className="text-xs text-muted">
            {matchingCount} found
          </Txt>
        </View>

        {loading ? (
          <ActivityIndicator color={C.brand} />
        ) : error ? (
          <View className="rounded-2xl bg-panel p-5">
            <Txt className="text-muted">{error}</Txt>
            <Pressable onPress={() => void load()} className="mt-3">
              <Txt weight="bold" className="text-brand">
                TRY AGAIN
              </Txt>
            </Pressable>
          </View>
        ) : visible.length === 0 ? (
          <View className="rounded-2xl bg-panel p-6">
            <Txt weight="bold">No matching programs</Txt>
            <Txt className="mt-2 text-sm text-muted">
              Try a different level, goal, or equipment option.
            </Txt>
          </View>
        ) : (
          visible.map(program => (
            <ProgramCard
              key={program.id}
              program={program}
              onPress={() => router.push({
                pathname: "/explore/programs/[id]",
                params: { id: program.id }
              })}
            />
          ))
        )}

        {!loading && !error && matchingCount > 5 && (
          <Pressable
            onPress={() => setShowAll(current => !current)}
            className="mt-3 items-center rounded-2xl border border-border bg-panel py-4"
          >
            <Txt weight="bold" className="text-brand">
              {showAll ? "SHOW LESS" : `SHOW ALL ${matchingCount} PROGRAMS`}
            </Txt>
          </Pressable>
        )}

        <Txt weight="extra" className="mb-2 mt-10 text-[28px]">
          EXPLORE ROUTINES.
        </Txt>

        <Txt className="mb-5 text-sm text-muted">
          One workout. Any place. Your pace.
        </Txt>

        <View className="flex-row flex-wrap justify-between">
          {categories.map(category => (
            <Pressable
              key={category.id}
              onPress={() => router.push({
                pathname: "/explore/categories/[slug]",
                params: { slug: category.slug }
              })}
              className="mb-3 w-[48%] overflow-hidden rounded-[22px] bg-panel"
            >
              {category.image_url ? (
                <Image
                  source={{ uri: category.image_url }}
                  resizeMode="cover"
                  className="h-28 w-full"
                />
              ) : (
                <View className="h-28 items-center justify-center bg-elevated">
                  <MaterialCommunityIcons
                    name="dumbbell"
                    size={34}
                    color={C.brand}
                  />
                </View>
              )}

              <View className="p-3">
                <Txt weight="bold" className="text-sm">
                  {category.name}
                </Txt>
                <Txt className="mt-1 text-[11px] text-muted" numberOfLines={2}>
                  {category.description}
                </Txt>
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}