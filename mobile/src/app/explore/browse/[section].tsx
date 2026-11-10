import React, { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import {
  exploreApi,
  EXPLORE_SECTIONS,
  type ExploreCard,
} from "@/src/features/explore/api";

import { SECTION_ICONS } from "@/src/features/explore/components";

import {
  EXPLORE_LABELS,
  openExploreCard,
} from "@/src/features/explore/navigation";

// ------------------------------------------------------------------
// Configuration
// ------------------------------------------------------------------

const PAGE_SIZE = 12;
const SIDE = 24;
const GAP = 12;

type FilterKey = "level" | "goal" | "equipment";

type FilterOption = {
  value: string;
  label: string;
};

type Filters = Record<FilterKey, string>;

const EMPTY_FILTERS: Filters = {
  level: "",
  goal: "",
  equipment: "",
};

const FILTER_CONFIG: Record<
  FilterKey,
  {
    label: string;
    allLabel: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    options: FilterOption[];
  }
> = {
  level: {
    label: "Level",
    allLabel: "All levels",
    icon: "chart-bar",
    options: [
      { value: "beginner", label: "Beginner" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
    ],
  },
  goal: {
    label: "Goal",
    allLabel: "All goals",
    icon: "target",
    options: [
      { value: "muscle", label: "Build muscle" },
      //   { value: "strength", label: "Get stronger" },
      //   { value: "fat_loss", label: "Fat loss" },
      { value: "endurance", label: "Endurance" },
      { value: "general", label: "General fitness" },
    ],
  },
  equipment: {
    label: "Equipment",
    allLabel: "All equipment",
    icon: "dumbbell",
    options: [
      { value: "gym", label: "Full gym" },
      { value: "dumbbells", label: "Dumbbells" },
      { value: "bodyweight", label: "Bodyweight" },
      //   { value: "bands", label: "Resistance bands" },
      //   { value: "mixed", label: "Mixed equipment" },
    ],
  },
};

// ------------------------------------------------------------------
// Filter dropdown
// ------------------------------------------------------------------

function FilterDropdown({
  filter,
  value,
  onPress,
}: {
  filter: FilterKey;
  value: string;
  onPress: () => void;
}) {
  const config = FILTER_CONFIG[filter];

  const selected = config.options.find((option) => option.value === value);

  const active = Boolean(value);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${config.label}`}
      className={`h-12 min-w-0 flex-1 flex-row items-center justify-between rounded-xl border px-3 ${
        active ? "border-brand bg-brand/10" : "border-border/40 bg-panel"
      }`}
    >
      <Txt
        weight="semibold"
        numberOfLines={1}
        className={`mr-1 flex-1 text-[13px] ${
          active ? "text-brand" : "text-ink"
        }`}
      >
        {selected?.label ?? config.label}
      </Txt>

      <MaterialCommunityIcons
        name="chevron-down"
        size={17}
        color={active ? C.brand : C.muted}
      />
    </Pressable>
  );
}

// ------------------------------------------------------------------
// Bottom sheet
// ------------------------------------------------------------------

function FilterSheet({
  filter,
  value,
  onSelect,
  onClose,
}: {
  filter: FilterKey | null;
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  const config = filter ? FILTER_CONFIG[filter] : null;

  const options = config
    ? [{ value: "", label: config.allLabel }, ...config.options]
    : [];

  return (
    <Modal
      visible={filter !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      >
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityLabel="Close filters"
        />

        <View className="rounded-t-[28px] bg-bg" style={{ maxHeight: "75%" }}>
          <View className="items-center pt-3">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>

          <View className="flex-row items-center justify-between px-6 pb-3 pt-5">
            <Txt weight="bold" className="text-[22px]">
              {config?.label ?? "Filter"}
            </Txt>

            <Pressable onPress={onClose} accessibilityLabel="Close">
              <MaterialCommunityIcons name="close" size={23} color={C.muted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            }}
          >
            {options.map((option) => {
              const selected = option.value === value;

              return (
                <Pressable
                  key={option.value || "__all"}
                  onPress={() => onSelect(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className="flex-row items-center justify-between border-b border-border/30 px-6 py-4"
                >
                  <Txt
                    weight={selected ? "bold" : "medium"}
                    className={`text-[15px] ${
                      selected ? "text-brand" : "text-ink"
                    }`}
                  >
                    {option.label}
                  </Txt>

                  <View
                    className={`h-6 w-6 items-center justify-center rounded-full border ${
                      selected ? "border-brand bg-brand" : "border-border"
                    }`}
                  >
                    {selected ? (
                      <MaterialCommunityIcons
                        name="check"
                        color={C.bg}
                        size={16}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ------------------------------------------------------------------
// Content card
// ------------------------------------------------------------------

function BrowseCard({
  card,
  width,
  onPress,
}: {
  card: ExploreCard;
  width: number;
  onPress: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const showImage = Boolean(card.imageUrl) && !imageFailed;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${card.title}`}
      style={{ width }}
      className="mb-3 overflow-hidden rounded-3xl border border-border/30 bg-panel active:opacity-80"
    >
      <View
        className="items-center justify-center overflow-hidden bg-elevated"
        style={{ height: width * 1.04 }}
      >
        {showImage ? (
          <Image
            source={{ uri: card.imageUrl! }}
            contentFit="cover"
            transition={180}
            onError={() => setImageFailed(true)}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <MaterialCommunityIcons
            name={SECTION_ICONS[card.section]}
            size={40}
            color={C.brand}
          />
        )}

        <View
          className="absolute bottom-2 left-2 right-2 self-start rounded-lg px-2.5 py-1.5"
          style={{ backgroundColor: "rgba(0,0,0,0.76)" }}
        >
          <Txt
            weight="semibold"
            numberOfLines={1}
            className="text-[10px] text-white"
          >
            {card.meta}
          </Txt>
        </View>
      </View>

      <View className="min-h-[83px] px-3 pb-3 pt-3">
        <Txt weight="bold" numberOfLines={2} className="text-[15px] leading-5">
          {card.title}
        </Txt>

        {card.subtitle ? (
          <Txt numberOfLines={1} className="mt-1.5 text-[11px] text-muted">
            {card.subtitle}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

// ------------------------------------------------------------------
// Main screen
// ------------------------------------------------------------------

export default function ExploreBrowseScreen() {
  const router = useRouter();

  const { width: screenWidth } = useWindowDimensions();

  const { section: raw, q: initialSearch } = useLocalSearchParams<{
    section: string;
    q?: string;
  }>();

  const section = EXPLORE_SECTIONS.find((item) => item === raw);

  const cardWidth = Math.floor((screenWidth - SIDE * 2 - GAP) / 2);

  const [search, setSearch] = useState(initialSearch ?? "");
  const [query, setQuery] = useState((initialSearch ?? "").trim());

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);

  const [items, setItems] = useState<ExploreCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);

  const [error, setError] = useState("");
  const [moreError, setMoreError] = useState("");
  const [retry, setRetry] = useState(0);

  const requestVersion = useRef(0);
  const loadMorePending = useRef(false);

  // Workouts/programs can use all three filters.
  // Exercises get Level; Mobility/Learn have no extra filters.
  const visibleFilters: FilterKey[] =
    section === "workouts" || section === "programs"
      ? ["level", "goal", "equipment"]
      : section === "exercises"
        ? ["level"]
        : [];

  const activeCount = visibleFilters.filter((key) =>
    Boolean(filters[key]),
  ).length;

  const effectiveLevel = visibleFilters.includes("level")
    ? filters.level || undefined
    : undefined;

  const effectiveGoal = visibleFilters.includes("goal")
    ? filters.goal || undefined
    : undefined;

  const effectiveEquipment = visibleFilters.includes("equipment")
    ? filters.equipment || undefined
    : undefined;

  const hasMore = items.length < total;

  // Debounced search.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(search.trim());
    }, 350);

    return () => clearTimeout(timeout);
  }, [search]);

  // Fetch first page when search or filters change.
  useEffect(() => {
    if (!section) return;

    const version = ++requestVersion.current;
    let active = true;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    setMoreError("");
    setMoreLoading(false);
    setItems([]);
    setTotal(0);
    setPage(1);

    void exploreApi
      .list(section, {
        page: 1,
        pageSize: PAGE_SIZE,
        q: query,
        level: effectiveLevel,
        goal: effectiveGoal,
        equipment: effectiveEquipment,
      })
      .then((result) => {
        if (!active || requestVersion.current !== version) return;

        setItems(result.items);
        setTotal(result.total);
      })
      .catch((e) => {
        if (!active || requestVersion.current !== version) return;

        setError(e instanceof Error ? e.message : "Unable to load content.");
      })
      .finally(() => {
        if (active && requestVersion.current === version) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    section,
    query,
    effectiveLevel,
    effectiveGoal,
    effectiveEquipment,
    retry,
  ]);

  const loadMore = async () => {
    if (!section || loading || loadMorePending.current || !hasMore) {
      return;
    }

    loadMorePending.current = true;

    const version = requestVersion.current;
    const nextPage = page + 1;

    setMoreLoading(true);
    setMoreError("");

    try {
      const result = await exploreApi.list(section, {
        page: nextPage,
        pageSize: PAGE_SIZE,
        q: query,
        level: effectiveLevel,
        goal: effectiveGoal,
        equipment: effectiveEquipment,
      });

      if (version !== requestVersion.current) return;

      setItems((previous) => {
        const seen = new Set(previous.map((item) => item.id));

        return [
          ...previous,
          ...result.items.filter((item) => !seen.has(item.id)),
        ];
      });

      setPage(nextPage);
      setTotal(result.total);
    } catch (e) {
      if (version === requestVersion.current) {
        setMoreError(e instanceof Error ? e.message : "Unable to load more.");
      }
    } finally {
      loadMorePending.current = false;

      if (version === requestVersion.current) {
        setMoreLoading(false);
      }
    }
  };

  const chooseFilter = (value: string) => {
    if (!activeFilter) return;

    setFilters((previous) => ({
      ...previous,
      [activeFilter]: value,
    }));

    setActiveFilter(null);
  };

  const clearFilters = () => {
    setFilters({ ...EMPTY_FILTERS });
  };

  if (!section) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Txt weight="bold" className="text-xl">
          Section not found
        </Txt>

        <Pressable onPress={() => router.back()} className="mt-4">
          <Txt className="text-brand">Go back</Txt>
        </Pressable>
      </View>
    );
  }

  const title = EXPLORE_LABELS[section];

  const header = (
    <View className="pb-5 pt-5">
      <View className="flex-row items-center gap-4">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-10 w-10 items-center justify-center rounded-full bg-panel"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.ink} />
        </Pressable>
        <View>

        <Txt weight="bold" className="text-[26px] leading-9">
          {title}
        </Txt>

        <Txt className="mt-1 text-sm text-muted">Find your next favorite.</Txt>
        </View>
      </View>

      {/* Search */}
      <View className="mt-5 h-14 flex-row items-center rounded-2xl bg-panel px-4">
        <MaterialCommunityIcons name="magnify" size={23} color={C.ink} />

        <TextInput
          value={search}
          onChangeText={(value) => setSearch(value.slice(0, 100))}
          placeholder={`Search ${title.toLowerCase()}`}
          placeholderTextColor={C.muted}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel={`Search ${title}`}
          className="ml-3 h-full flex-1 text-base text-ink"
        />

        {search.length > 0 ? (
          <Pressable
            onPress={() => setSearch("")}
            hitSlop={10}
            accessibilityLabel="Clear search"
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={19}
              color={C.muted}
            />
          </Pressable>
        ) : null}
      </View>

      {/* Compact dropdown filters */}
      {visibleFilters.length > 0 ? (
        <View className="mt-3 flex-row gap-2">
          {visibleFilters.map((filter) => (
            <FilterDropdown
              key={filter}
              filter={filter}
              value={filters[filter]}
              onPress={() => setActiveFilter(filter)}
            />
          ))}
        </View>
      ) : null}

      {/* Results and filter reset */}
      <View className="mt-5 flex-row items-center justify-between">
        <Txt className="text-sm text-muted">
          {loading
            ? "Finding content..."
            : `${total} ${total === 1 ? "result" : "results"}`}
        </Txt>

        {activeCount > 0 ? (
          <Pressable
            onPress={clearFilters}
            accessibilityRole="button"
            className="flex-row items-center gap-1"
          >
            <MaterialCommunityIcons
              name="close-circle-outline"
              size={16}
              color={C.brand}
            />

            <Txt weight="semibold" className="text-sm text-brand">
              Clear filters
            </Txt>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const empty = loading ? (
    <View className="items-center py-16">
      <ActivityIndicator size="large" color={C.brand} />
    </View>
  ) : error ? (
    <View className="items-center rounded-2xl bg-panel p-7">
      <MaterialCommunityIcons name="wifi-alert" size={34} color={C.muted} />

      <Txt weight="bold" className="mt-3 text-lg">
        Couldn&apos;t load {title.toLowerCase()}
      </Txt>

      <Txt className="mt-2 text-center text-sm text-muted">{error}</Txt>

      <Pressable
        onPress={() => setRetry((value) => value + 1)}
        className="mt-5 rounded-full bg-brand px-6 py-3"
      >
        <Txt weight="bold" className="text-bg">
          Try again
        </Txt>
      </Pressable>
    </View>
  ) : (
    <View className="items-center px-6 py-16">
      <MaterialCommunityIcons name="magnify-close" size={42} color={C.muted} />

      <Txt weight="bold" className="mt-4 text-xl">
        No results found
      </Txt>

      <Txt className="mt-2 text-center text-sm leading-6 text-muted">
        Try another search or change your filters.
      </Txt>

      {activeCount > 0 || search ? (
        <Pressable
          onPress={() => {
            setSearch("");
            clearFilters();
          }}
          className="mt-5 rounded-full bg-panel px-6 py-3"
        >
          <Txt weight="semibold" className="text-brand">
            Clear search & filters
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );

  const footer = (
    <View className="items-center pb-12 pt-5">
      {moreError ? (
        <View className="mb-4 w-full rounded-2xl bg-panel p-4">
          <Txt className="text-center text-sm text-muted">{moreError}</Txt>
        </View>
      ) : null}

      {!loading && items.length > 0 && hasMore ? (
        <Pressable
          onPress={() => void loadMore()}
          disabled={moreLoading}
          accessibilityRole="button"
          className="min-w-[160px] items-center rounded-full bg-panel px-7 py-3.5"
        >
          {moreLoading ? (
            <ActivityIndicator color={C.brand} />
          ) : (
            <Txt weight="semibold" className="text-brand">
              {moreError ? "Retry loading" : "Load more"}
            </Txt>
          )}
        </Pressable>
      ) : null}

      {!loading && items.length > 0 && !hasMore ? (
        <Txt className="text-xs text-muted">You&apos;ve reached the end</Txt>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-bg">
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SIDE,
          paddingBottom: 60,
        }}
        columnWrapperStyle={{ gap: GAP }}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        renderItem={({ item }) => (
          <BrowseCard
            card={item}
            width={cardWidth}
            onPress={() => openExploreCard(router, item)}
          />
        )}
      />

      <FilterSheet
        filter={activeFilter}
        value={activeFilter ? filters[activeFilter] : ""}
        onSelect={chooseFilter}
        onClose={() => setActiveFilter(null)}
      />
    </View>
  );
}
