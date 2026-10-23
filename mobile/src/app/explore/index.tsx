import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
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
  type Equipment,
} from "@/src/features/training-catalog/api";

import { ProgramCard } from "@/src/features/training-catalog/components/program-card";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const LEVELS: { label: string; value?: Level }[] = [
  { label: "All" },
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const GOALS: { label: string; value?: Goal }[] = [
  { label: "All" },
  { label: "Muscle", value: "muscle" },
  { label: "Strength", value: "strength" },
  { label: "Fat loss", value: "fat_loss" },
  { label: "Endurance", value: "endurance" },
  { label: "General", value: "general" },
];

const EQUIPMENT: { label: string; value?: Equipment }[] = [
  { label: "All" },
  { label: "Gym", value: "gym" },
  { label: "Dumbbells", value: "dumbbells" },
  { label: "Bodyweight", value: "bodyweight" },
  { label: "Bands", value: "bands" },
  { label: "Mixed", value: "mixed" },
];

const PAGE_SIZE = 5;

function FilterRow<T extends string>({
  icon,
  label,
  options,
  value,
  onChange,
}: {
  icon: IconName;
  label: string;
  options: { label: string; value?: T }[];
  value?: T;
  onChange: (value?: T) => void;
}) {
  return (
    <View className="mb-6">
      <View className="mb-3 flex-row items-center">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-brand/15">
          <MaterialCommunityIcons name={icon} size={15} color={C.brand} />
        </View>
        <Txt weight="bold" className="ml-2.5 text-[15px]">
          {label}
        </Txt>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option.value;

          return (
            <Pressable
              key={option.label}
              onPress={() => onChange(option.value)}
              className={`rounded-full px-4 py-2.5 ${
                active ? "bg-brand" : "bg-elevated"
              }`}
            >
              <Txt
                weight="semibold"
                className={`text-[13px] ${active ? "text-bg" : "text-ink"}`}
              >
                {option.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function FilterDrawer({
  visible,
  filters,
  onClose,
  onApply,
}: {
  visible: boolean;
  filters: Filters;
  onClose: () => void;
  onApply: (next: Filters) => void;
}) {
  const [draft, setDraft] = useState<Filters>(filters);

  // Every time the drawer opens, start from the filters currently applied
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visible) setDraft(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const draftCount = [draft.level, draft.goal, draft.equipment].filter(
    Boolean,
  ).length;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end bg-black/70">
        <Pressable
          className="flex-1"
          accessibilityLabel="Close filters"
          onPress={onClose}
        />

        <View
          className="rounded-t-[28px] bg-panel"
          style={{ maxHeight: "85%" }}
        >
          <View className="items-center pt-2.5">
            <View className="h-1.5 w-11 rounded-full bg-white/25" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pb-4 pt-3">
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name="tune-variant"
                size={22}
                color={C.brand}
              />
              <Txt weight="bold" className="ml-2.5 text-xl">
                Filters
              </Txt>
              {draftCount > 0 ? (
                <View className="ml-2 h-6 min-w-[24px] items-center justify-center rounded-full bg-brand px-1.5">
                  <Txt weight="bold" className="text-xs text-bg">
                    {draftCount}
                  </Txt>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="h-9 w-9 items-center justify-center rounded-full bg-elevated"
            >
              <MaterialCommunityIcons name="close" size={20} color={C.ink} />
            </Pressable>
          </View>

          {/* Options */}
          <ScrollView
            style={{ flexShrink: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4 }}
          >
            <FilterRow
              icon="signal-cellular-3"
              label="Experience"
              options={LEVELS}
              value={draft.level}
              onChange={(level) => setDraft((d) => ({ ...d, level }))}
            />

            <FilterRow
              icon="target"
              label="Goal"
              options={GOALS}
              value={draft.goal}
              onChange={(goal) => setDraft((d) => ({ ...d, goal }))}
            />

            <FilterRow
              icon="dumbbell"
              label="Equipment"
              options={EQUIPMENT}
              value={draft.equipment}
              onChange={(equipment) => setDraft((d) => ({ ...d, equipment }))}
            />
          </ScrollView>

          {/* Buttons */}
          <SafeAreaView
            edges={["bottom"]}
            className="border-t border-border px-5 pt-3"
          >
            <View className="mb-2 flex-row gap-3">
              <Pressable
                onPress={() => setDraft({})}
                disabled={draftCount === 0}
                className="h-14 items-center justify-center rounded-full bg-elevated px-6"
                style={{ opacity: draftCount === 0 ? 0.5 : 1 }}
              >
                <Txt weight="bold">Reset</Txt>
              </Pressable>

              <Pressable
                onPress={() => onApply(draft)}
                className="h-14 flex-1 flex-row items-center justify-center rounded-full bg-brand"
              >
                <MaterialCommunityIcons name="check" size={20} color={C.bg} />
                <Txt weight="bold" className="ml-2 text-base text-bg">
                  Show programs
                </Txt>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View className="mb-4 flex-row items-end justify-between">
      <View className="flex-1 pr-3">
        <Txt weight="bold" className="text-[22px]">
          {title}
        </Txt>
        {subtitle ? (
          <Txt className="mt-0.5 text-sm text-muted">{subtitle}</Txt>
        ) : null}
      </View>
      {right}
    </View>
  );
}

function CategoryTile({
  category,
  onPress,
}: {
  category: Category;
  onPress: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(category.image_url) && !failed;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${category.name}`}
      android_ripple={{ color: "rgba(255,255,255,0.06)" }}
      className="mb-3 w-[48.5%] flex-row items-center overflow-hidden rounded-[22px] bg-panel p-2.5 active:opacity-80"
      style={{ minHeight: 80 }}
    >
      {/* Image on the left */}
      <View
        className="items-center justify-center overflow-hidden rounded-xl bg-elevated"
        style={{ width: 56, height: 56 }}
      >
        {showImage ? (
          <Image
            source={{ uri: category.image_url as string }}
            resizeMode="cover"
            style={{ width: "100%", height: "100%" }}
            onError={() => setFailed(true)}
          />
        ) : (
          <MaterialCommunityIcons
            name="dumbbell"
            size={26}
            color={C.brand}
            style={{ opacity: 0.5 }}
          />
        )}
      </View>

      {/* Name + description on the right */}
      <View className="ml-2.5 min-w-0 flex-1">
        <Txt
          weight="bold"
          className="text-[14px] leading-[18px] text-ink"
          numberOfLines={2}
        >
          {category.name}
        </Txt>
        {category.description ? (
          <Txt className="mt-0.5 text-[11px] text-muted" numberOfLines={1}>
            {category.description}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

function ProgramSkeleton() {
  return (
    <View
      className="mb-4 rounded-[26px] bg-panel"
      style={{ height: 250, opacity: 0.6 }}
    />
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
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [programData, categoryData] = await Promise.all([
        catalogApi.programs(filters),
        catalogApi.categories(),
      ]);

      setPrograms(programData);
      setCategories(categoryData);
    } catch {
      setError("Could not load the training library.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.level, filters.goal, filters.equipment]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const matched = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return programs;

    return programs.filter((program) =>
      `${program.name} ${program.description}`.toLowerCase().includes(query),
    );
  }, [programs, search]);

  const visible = showAll ? matched : matched.slice(0, PAGE_SIZE);

  const activeFilters = [filters.level, filters.goal, filters.equipment].filter(
    Boolean,
  ).length;

  return (
    <>
      <ScrollView
        className="flex-1 bg-bg"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <View className="px-4 pt-2">
          <Txt weight="semibold" className="mt-2 text-[34px] leading-[40px]">
            Find your training
          </Txt>

          <Txt className="mt-1.5 text-sm text-white/90">
            Discover a plan that fits your life.
          </Txt>

          {/* Search + filter button */}
          <View className="mt-6 flex-row items-center gap-3">
            <View className="h-14 flex-1 flex-row items-center rounded-2xl bg-panel px-4">
              <MaterialCommunityIcons
                name="magnify"
                size={24}
                color={"white"}
              />

              <TextInput
                value={search}
                onChangeText={(text) => {
                  setSearch(text);
                  setShowAll(false);
                }}
                placeholder="Search programs..."
                placeholderTextColor={C.muted}
                returnKeyType="search"
                className="h-14 flex-1 px-3 text-ink"
              />

              {search.length > 0 ? (
                <Pressable
                  onPress={() => setSearch("")}
                  hitSlop={10}
                  accessibilityLabel="Clear search"
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={20}
                    color={C.muted}
                  />
                </Pressable>
              ) : null}
            </View>

            <Pressable
              onPress={() => setShowFilters(true)}
              accessibilityRole="button"
              accessibilityLabel="Open filters"
              className={`h-14 w-14 items-center justify-center rounded-2xl ${
                activeFilters > 0 ? "bg-brand" : "bg-panel"
              }`}
            >
              <MaterialCommunityIcons
                name="tune-variant"
                size={22}
                color={activeFilters > 0 ? C.bg : C.ink}
              />

              {activeFilters > 0 ? (
                <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-white">
                  <Txt weight="bold" className="text-[11px] text-bg">
                    {activeFilters}
                  </Txt>
                </View>
              ) : null}
            </Pressable>
          </View>

          {/* Programs */}
          <View className="mt-9">
            <SectionTitle
              title={showAll ? "All programs" : "Top programs"}
              subtitle={
                loading
                  ? "Loading..."
                  : `${matched.length} ${matched.length === 1 ? "program" : "programs"} found`
              }
            />

            {loading ? (
              <>
                <ProgramSkeleton />
                <ProgramSkeleton />
              </>
            ) : error ? (
              <View className="items-center rounded-[22px] bg-panel p-6">
                <MaterialCommunityIcons
                  name="cloud-off-outline"
                  size={34}
                  color={C.muted}
                />
                <Txt className="mt-3 text-center text-muted">{error}</Txt>
                <Pressable
                  onPress={() => void load()}
                  className="mt-4 rounded-full bg-brand px-6 py-3"
                >
                  <Txt weight="bold" className="text-bg">
                    Try again
                  </Txt>
                </Pressable>
              </View>
            ) : visible.length === 0 ? (
              <View className="items-center rounded-[22px] border border-dashed border-border p-8">
                <MaterialCommunityIcons
                  name="magnify-close"
                  size={38}
                  color={C.muted}
                />
                <Txt weight="bold" className="mt-3">
                  No matching programs
                </Txt>
                <Txt className="mt-1 text-center text-sm text-muted">
                  Try a different search, level, goal or equipment.
                </Txt>
              </View>
            ) : (
              visible.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  onPress={() =>
                    router.push({
                      pathname: "/explore/programs/[id]",
                      params: { id: program.id },
                    })
                  }
                />
              ))
            )}

            {!loading && !error && matched.length > PAGE_SIZE ? (
              <Pressable
                onPress={() => setShowAll((current) => !current)}
                className="mt-1 flex-row items-center justify-center rounded-full bg-panel py-4"
              >
                <Txt weight="bold" className="text-brand">
                  {showAll
                    ? "Show less"
                    : `Show all ${matched.length} programs`}
                </Txt>
                <MaterialCommunityIcons
                  name={showAll ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={C.brand}
                />
              </Pressable>
            ) : null}
          </View>

          {/* Routine categories */}
          <View className="mt-11">
            <SectionTitle
              title="Explore routines"
              subtitle="One workout. Any place. Your pace."
            />

            {loading ? (
              <ActivityIndicator color={C.brand} />
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {categories.map((category) => (
                  <CategoryTile
                    key={category.id}
                    category={category}
                    onPress={() =>
                      router.push({
                        pathname: "/explore/categories/[slug]",
                        params: { slug: category.slug },
                      })
                    }
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <FilterDrawer
        visible={showFilters}
        filters={filters}
        onClose={() => setShowFilters(false)}
        onApply={(next) => {
          setFilters(next);
          setShowAll(false);
          setShowFilters(false);
        }}
      />
    </>
  );
}
