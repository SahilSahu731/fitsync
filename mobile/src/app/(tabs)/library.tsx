import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import {
  Exercise,
  ExerciseTaxonomies,
  getExercises,
  getTaxonomies,
  pretty,
} from "@/src/features/exercises/api";

/* -------------------------------------------------------------------------- */
/*  Types + constants                                                          */
/* -------------------------------------------------------------------------- */

type Option = { code: string; label: string };
type FilterKey = "category" | "muscle" | "equipment";
type Filters = Record<FilterKey, string>;

type SortKey = "" | "popular" | "most_done" | "recent" | "name";

const SORT_OPTIONS: (Option & { code: SortKey })[] = [
  { code: "", label: "Recommended" },
  { code: "popular", label: "Most popular" },
  { code: "most_done", label: "Most done by you" },
  { code: "recent", label: "Recently done by you" },
  { code: "name", label: "A to Z" },
];

const EMPTY_FILTERS: Filters = { category: "", muscle: "", equipment: "" };

const DROPDOWNS: {
  key: FilterKey;
  label: string;
  allLabel: string;
  pick: (t: ExerciseTaxonomies) => Option[];
}[] = [
  {
    key: "category",
    label: "Category",
    allLabel: "All categories",
    pick: (t) => t.categories,
  },
  {
    key: "muscle",
    label: "Muscle",
    allLabel: "All muscles",
    pick: (t) => t.muscleGroups,
  },
  {
    key: "equipment",
    label: "Equipment",
    allLabel: "All equipment",
    pick: (t) => t.equipmentTypes,
  },
];

const PAGE_SIZE = 15;
const SIDE = 24;
const GAP = 12;

/* -------------------------------------------------------------------------- */
/*  Picker sheet: a plain list of names, one per row                           */
/* -------------------------------------------------------------------------- */

function PickerSheet({
  visible,
  title,
  options,
  value,
  loading,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Option[];
  value: string;
  loading?: boolean;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <Pressable className="flex-1" onPress={onClose} />

        <View
          className="rounded-t-[28px] bg-bg"
          style={{ maxHeight: "72%" }}
        >
          <View className="items-center pt-3">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>

          <Txt weight="bold" className="px-6 pb-2 pt-4 text-[20px]">
            {title}
          </Txt>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            }}
          >
            {loading && <ActivityIndicator className="my-8" color={C.brand} />}

            {options.map((o) => {
              const selected = o.code === value;

              return (
                <Pressable
                  key={o.code || "__all"}
                  onPress={() => onSelect(o.code)}
                  className="flex-row items-center justify-between border-b border-border/30 px-6 py-4"
                >
                  <Txt
                    weight={selected ? "bold" : "medium"}
                    className={`text-[15px] ${selected ? "text-brand" : "text-ink"}`}
                  >
                    {o.label}
                  </Txt>

                  {selected && (
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={C.brand}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Card                                                                       */
/* -------------------------------------------------------------------------- */

function levelOf(difficulty: string) {
  const d = (difficulty || "").toLowerCase();
  if (d.includes("begin") || d.includes("easy")) return 1;
  if (d.includes("inter") || d.includes("med")) return 2;
  if (d.includes("adv") || d.includes("hard") || d.includes("expert")) return 3;
  return 1;
}

/** Three rising bars, like signal strength: the more filled, the harder. */
function LevelBars({ difficulty }: { difficulty: string }) {
  const level = levelOf(difficulty);

  return (
    <View className="flex-row items-end" style={{ gap: 3 }}>
      {[1, 2, 3].map((n) => (
        <View
          key={n}
          style={{
            width: 4,
            height: 5 + n * 4,
            borderRadius: 2,
            backgroundColor: n <= level ? C.brand : "rgba(255,255,255,0.28)",
          }}
        />
      ))}
    </View>
  );
}

function ExerciseCard({
  exercise,
  width,
  onPress,
}: {
  exercise: Exercise;
  width: number;
  onPress: () => void;
}) {
  const image = exercise.media.find((m) => m.kind === "image");
  const muscles =
    exercise.primaryMuscles.map(pretty).join(", ") || exercise.regionLabel;

  return (
    <Pressable
      onPress={onPress}
      style={{ width }}
      className="mb-3 overflow-hidden rounded-3xl border border-border/30 bg-panel"
    >
      <View
        className="items-center justify-center bg-elevated"
        style={{ height: width * 1.05 }}
      >
        {image ? (
          <Image
            source={{ uri: image.url }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <MaterialCommunityIcons name="dumbbell" size={38} color={C.brand} />
        )}

        <View
          className="absolute right-2.5 top-2.5 rounded-full px-2.5 py-2"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          <LevelBars difficulty={exercise.difficulty} />
        </View>

        {/* <View
          className="absolute bottom-2.5 left-2.5 rounded-full px-2.5 py-1"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          <Txt
            weight="semibold"
            className="text-[11px]"
            style={{ color: "#fff" }}
          >
            {exercise.categoryLabel}
          </Txt>
        </View> */}
      </View>

      <View className="px-3 pb-3 pt-2.5">
        <Txt weight="bold" numberOfLines={2} className="text-[15px] leading-5">
          {exercise.name}
        </Txt>

        <Txt numberOfLines={1} className="mt-1 text-[11px] text-muted">
          {muscles}
        </Txt>

        {exercise.status !== "published" && (
          <Txt weight="semibold" className="mt-1 text-[11px] text-brand">
            {pretty(exercise.status)}
          </Txt>
        )}
      </View>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/*  Screen                                                                     */
/* -------------------------------------------------------------------------- */

export default function LibraryScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.floor((screenWidth - SIDE * 2 - GAP) / 2);

  const [tax, setTax] = useState<ExerciseTaxonomies | null>(null);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // debounced
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("");

  // which picker is open: a filter key, "sort", or nothing
  const [openPicker, setOpenPicker] = useState<FilterKey | "sort" | null>(null);

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Exercise[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const pending = useRef(false);
  const loadedPage = useRef(0);
  const lastQuery = useRef("");
  const list = useRef<FlatList<Exercise>>(null);
  const [hasMore, setHasMore] = useState(false);
  const queryKey = JSON.stringify([query, filters, sort]);

  /* taxonomies (once) */
  useEffect(() => {
    let active = true;
    getTaxonomies()
      .then((t) => active && setTax(t))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);

  /* debounce typing */
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  /* results */
  useEffect(() => {
    let active = true;
    pending.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    if (lastQuery.current !== queryKey) {
      lastQuery.current = queryKey;
      loadedPage.current = 0;
      setItems([]); setTotal(0); setHasMore(false);
      list.current?.scrollToOffset({ offset: 0, animated: false });
      if (page !== 1) { setPage(1); return; }
    }
    setError("");

    // `sort` is sent to the API. The backend must support it (see notes).
    const params = {
      q: query,
      category: filters.category,
      muscle: filters.muscle,
      equipment: filters.equipment,
      bodyRegion: "",
      sort,
      page,
      pageSize: PAGE_SIZE,
    } as Parameters<typeof getExercises>[0];

    getExercises(params)
      .then((res) => {
        if (!active) return;

        setItems((prev) => {
          if (page === 1) return res.items;
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...res.items.filter((i) => !seen.has(i.id))];
        });
        loadedPage.current = page;
        setTotal(res.total);
        setHasMore(res.items.length > 0 && res.page * res.pageSize < res.total);
      })
      .catch((e) => active && setError(e.message))
      .finally(() => { if (active) { pending.current = false; setLoading(false); } });

    return () => {
      active = false;
    };
  }, [query, filters, sort, page, refreshKey, queryKey]);

  const setFilter = useCallback((key: FilterKey, code: string) => {
    setFilters((f) => ({ ...f, [key]: code }));
    setPage(1);
    setOpenPicker(null);
  }, []);

  const chooseSort = useCallback((code: string) => {
    setSort(code as SortKey);
    setPage(1);
    setOpenPicker(null);
  }, []);

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setSearch("");
    setQuery("");
    setPage(1);
  };

  const loadMore = () => {
    if (pending.current || loading || error || !hasMore || loadedPage.current !== page || lastQuery.current !== queryKey) return;
    pending.current = true;
    setPage((p) => p + 1);
  };

  const sortLabel =
    SORT_OPTIONS.find((o) => o.code === sort)?.label ?? "Recommended";
  const hasFilters = Object.values(filters).some(Boolean);

  /* the dropdown the sheet is currently showing */
  const activeDropdown = DROPDOWNS.find((d) => d.key === openPicker);

  /* header is a plain element so the search input keeps focus */
  const header = (
    <View className="pb-3 pt-7" style={{ paddingHorizontal: SIDE }}>
      <Txt weight="bold" className="text-[30px] leading-9">
        Exercise library
      </Txt>

      {/* search + sort */}
      <View className="mt-5 flex-row items-center" style={{ gap: 10 }}>
        <View className="flex-1 flex-row items-center rounded-2xl bg-panel px-4">
          <MaterialCommunityIcons name="magnify" color={"white"} size={22} />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises"
            placeholderTextColor={C.muted}
            returnKeyType="search"
            autoCorrect={false}
            className="ml-3 h-14 text-lg flex-1 text-white"
            style={{ fontFamily: "Outfit_400Regular" }}
          />

          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={10}>
              <MaterialCommunityIcons
                name="close-circle"
                color={C.muted}
                size={18}
              />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => setOpenPicker("sort")}
          className={`h-14 w-14 items-center justify-center rounded-2xl border ${sort ? " bg-brand" : " bg-panel"}`}
        >
          <MaterialCommunityIcons
            name="sort-variant"
            size={28}
            color={sort ? C.bg : C.ink}
          />
        </Pressable>
      </View>

      {/* three dropdowns: tap to pick from a list of names */}
      <View className="mt-3 flex-row" style={{ gap: 8 }}>
        {DROPDOWNS.map((d) => {
          const code = filters[d.key];
          const selectedLabel = tax
            ? (d.pick(tax).find((o) => o.code === code)?.label ??
              (code ? pretty(code) : ""))
            : "";

          return (
            <Pressable
              key={d.key}
              onPress={() => setOpenPicker(d.key)}
              className={`h-12 flex-1 flex-row items-center justify-between rounded-xl px-3 ${code ? "bg-panel" : " bg-panel"}`}
            >
              <Txt
                weight="semibold"
                numberOfLines={1}
                className={`mr-1 flex-1 text-[13px] ${code ? "text-brand" : "text-ink"}`}
              >
                {selectedLabel || d.label}
              </Txt>

              <MaterialCommunityIcons
                name="chevron-down"
                size={18}
                color={code ? C.brand : C.muted}
              />
            </Pressable>
          );
        })}
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-row items-center" style={{ gap: 14 }}>
          {hasFilters && (
            <Pressable
              onPress={() => {
                setFilters(EMPTY_FILTERS);
                setPage(1);
              }}
              hitSlop={8}
            >
              <Txt weight="medium" className="text-sm text-brand">
                Clear filters
              </Txt>
            </Pressable>
          )}

          <Txt className="text-sm text-muted">{sortLabel}</Txt>
        </View>
      </View>
    </View>
  );

  const footer = (
    <View className="items-center pb-14 pt-2">
      {loading && <ActivityIndicator className="my-6" color={C.brand} />}
      {!loading && !error && items.length > 0 && (
        <Txt className="text-sm text-muted">
          {hasMore ? `Showing ${items.length} of ${total}` : "All exercises loaded"}
        </Txt>
      )}

      {error ? (
        <View
          className="rounded-2xl border border-border bg-panel p-4"
          style={{ marginHorizontal: SIDE, alignSelf: "stretch" }}
        >
          <Txt>{error}</Txt>
          <Pressable onPress={() => setRefreshKey((v) => v + 1)}>
            <Txt weight="semibold" className="mt-3 text-brand">
              Try again
            </Txt>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const empty =
    !loading && !error ? (
      <View className="items-center px-10 py-14">
        <Image
          source={require("../../../assets/images/not-found.png")}
          style={{ width: 280, height: 190, borderRadius: 30 }}
          contentFit="contain"
          onError={(error) => console.log("Image error:", error)}
        />
        <Txt weight="semibold" className="mt-4 text-xl">
          No exercises match
        </Txt>
        <Txt className="mt-1 text-center text-sm text-muted">
          Try a different search or remove a filter.
        </Txt>
        <Pressable onPress={clearAll} className="mt-5 rounded-full px-5 py-2.5">
          <Txt weight="semibold" className="text-lg text-white underline">
            Clear search and filters
          </Txt>
        </Pressable>
      </View>
    ) : null;

  return (
    <View className="flex-1 bg-bg mb-10">
      <FlatList
        ref={list}
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={{ paddingHorizontal: SIDE, gap: GAP }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={empty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            width={cardWidth}
            onPress={() =>
              router.push({
                pathname: "/exercise/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
      />

      {/* sort picker */}
      <PickerSheet
        visible={openPicker === "sort"}
        title="Sort by"
        options={SORT_OPTIONS}
        value={sort}
        onSelect={chooseSort}
        onClose={() => setOpenPicker(null)}
      />

      {/* category / muscle / equipment picker */}
      <PickerSheet
        visible={!!activeDropdown}
        title={activeDropdown?.label ?? ""}
        loading={!tax}
        options={
          activeDropdown && tax
            ? [
                { code: "", label: activeDropdown.allLabel },
                ...activeDropdown.pick(tax),
              ]
            : []
        }
        value={activeDropdown ? filters[activeDropdown.key] : ""}
        onSelect={(code) =>
          activeDropdown && setFilter(activeDropdown.key, code)
        }
        onClose={() => setOpenPicker(null)}
      />
    </View>
  );
}
