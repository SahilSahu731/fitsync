import { MotionPressable as Pressable, ScreenEntrance } from "@/src/components/motion";
import React, { useCallback, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useFocusEffect, useRouter } from "expo-router";

import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";

import {
  exploreApi,
  EXPLORE_SECTIONS,
  type ExploreCard,
  type ExploreHome,
  type ExploreDestination,
} from "@/src/features/explore/api";

import {
  ExploreSectionBlock,
  SECTION_ICONS,
  ToolTile,
} from "@/src/features/explore/components";

import {
  EXPLORE_LABELS,
  openExploreCard,
  openExploreSection,
} from "@/src/features/explore/navigation";
import { usePublishedTools } from "@/src/features/explore/use-tools";


type LoadMode = "initial" | "refresh" | "focus";

const MAX_SEARCH_LENGTH = 100;
const STALE_AFTER_MS = 30_000;
const TOOLS_PREVIEW_COUNT = 4;
const TOOLS_PER_ROW = 2;

// Hoisted so the chip list isn't rebuilt on every render.
const DESTINATIONS: ExploreDestination[] = [...EXPLORE_SECTIONS, "tools"];


const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Unable to load Explore.";

export default function ExploreHomeScreen() {
  const router = useRouter();
  const { tools: TOOLS, error: toolsError, reload: reloadTools } = usePublishedTools();
  const TOOL_ROWS = Array.from(
    { length: Math.ceil(Math.min(TOOLS.length, TOOLS_PREVIEW_COUNT) / TOOLS_PER_ROW) },
    (_, i) =>
      TOOLS.slice(0, TOOLS_PREVIEW_COUNT).slice(
        i * TOOLS_PER_ROW,
        (i + 1) * TOOLS_PER_ROW,
      ),
  );


  const [data, setData] = useState<ExploreHome | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Guards against out-of-order responses (focus + pull-to-refresh overlapping).
  const requestId = useRef(0);
  const lastLoadedAt = useRef(0);

  const load = useCallback(async (mode: LoadMode = "initial") => {
    const id = ++requestId.current;

    if (mode === "refresh") {
      setRefreshing(true);
    }

    try {
      const result = await exploreApi.home();

      if (id !== requestId.current) return;

      setData(result);
      setError("");
      lastLoadedAt.current = Date.now();
    } catch (e) {
      if (id !== requestId.current) return;

      setError(errorMessage(e));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Refetch on focus, but skip if the data is still fresh so quick
  // back-and-forth navigation doesn't hammer the API.
  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastLoadedAt.current < STALE_AFTER_MS) return;

      void load("focus");
    }, [load]),
  );

  const trimmedSearch = search.trim();
  const canSearch = trimmedSearch.length > 0;

  const goSearch = useCallback(() => {
    if (!canSearch) return;

    router.push({
      pathname: "/explore/search",
      params: { q: trimmedSearch },
    });
  }, [canSearch, router, trimmedSearch]);

  const onOpen = useCallback(
    (card: ExploreCard) => openExploreCard(router, card),
    [router],
  );

  const onAll = useCallback(
    (section: ExploreDestination) => openExploreSection(router, section),
    [router],
  );

  const openTool = useCallback(
    (slug: string) =>
      router.push({
        pathname: "/explore/tools/[slug]",
        params: { slug },
      }),
    [router],
  );

  const hero = useMemo(
    () => data?.sections.workouts[1] ?? data?.sections.programs[0],
    [data],
  );

  const isEmpty =
    !!data && EXPLORE_SECTIONS.every((s) => !(data.sections[s]?.length ?? 0));

  return (
    <ScreenEntrance style={{ flex: 1 }}>
    <ScrollView
      className="flex-1 bg-bg"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 150,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load("refresh")}
          tintColor={C.brand}
        />
      }
    >
      {toolsError && <Pressable onPress={reloadTools}><Txt className="mb-4 text-brand">Tools unavailable. Tap to retry.</Txt></Pressable>}
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View>
          <Txt weight="bold" className="text-[34px]" accessibilityRole="header">
            Library
          </Txt>

          <Txt className="mt-1 text-sm text-muted">
            Find something that moves you.
          </Txt>
        </View>
      </View>

      {/* Search */}
      <View className="mt-6 h-14 flex-row items-center rounded-2xl bg-panel px-4">
        <MaterialCommunityIcons name="magnify" size={26} color={"white"} />

        <TextInput
          value={search}
          onChangeText={setSearch}
          maxLength={MAX_SEARCH_LENGTH}
          onSubmitEditing={goSearch}
          returnKeyType="search"
          autoCorrect={false}
          placeholder="Search workouts, exercises, guides..."
          placeholderTextColor={C.muted}
          className="ml-3 h-full flex-1 text-ink"
          accessibilityLabel="Search Explore"
        />

        {search.length > 0 ? (
          <Pressable
            onPress={() => setSearch("")}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            className="mr-3"
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={19}
              color={C.muted}
            />
          </Pressable>
        ) : null}

        <Pressable
          onPress={goSearch}
          disabled={!canSearch}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Search"
          accessibilityState={{ disabled: !canSearch }}
        >
          <MaterialCommunityIcons
            name="arrow-right"
            size={24}
            color={canSearch ? C.brand : C.muted}
          />
        </Pressable>
      </View>

      {/* Section chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-5"
        contentContainerStyle={{ gap: 10 }}
      >
        {DESTINATIONS.map((section) => (
          <Pressable
            key={section}
            onPress={() => onAll(section)}
            accessibilityRole="button"
            accessibilityLabel={`Browse ${EXPLORE_LABELS[section]}`}
            className="flex-row items-center rounded-full bg-panel px-3 py-2.5"
          >
            <MaterialCommunityIcons
              name={SECTION_ICONS[section]}
              size={20}
              color={"white"}
            />

            <Txt weight="medium" className="ml-2 ">
              {EXPLORE_LABELS[section]}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>

      {/* Hero */}
      {hero ? (
        <Pressable
          onPress={() => onOpen(hero)}
          className="mt-7 overflow-hidden rounded-[26px] bg-panel p-5"
          accessibilityRole="button"
          accessibilityLabel={`Featured: ${hero.title}`}
        >
          <Txt
            weight="bold"
            className="text-brand"
          >
            Start here
          </Txt>

          <Txt
            weight="bold"
            className="mt-3 text-[28px] leading-[30px]"
            numberOfLines={2}
          >
            {hero.title}
          </Txt>

          <Txt className="mt-2 text-sm text-muted" numberOfLines={2}>
            {hero.subtitle || hero.meta}
          </Txt>

          <View className="mt-5 flex-row items-center self-start rounded-full bg-brand px-6 py-2.5">
            <Txt weight="bold" className="text- text-bg">
              Explore now
            </Txt>

            <MaterialCommunityIcons name="chevron-right" size={20} color={C.bg} />
          </View>
        </Pressable>
      ) : null}

      {/* Loading / error / empty states */}
      {loading && !data ? (
        <ActivityIndicator color={C.brand} className="mt-10" />
      ) : null}

      {error && !data ? (
        <View className="mt-8 rounded-2xl bg-panel p-5">
          <Txt weight="bold">Unable to load Explore</Txt>

          <Txt className="mt-2 text-sm text-muted">{error}</Txt>

          <Pressable
            onPress={() => void load("refresh")}
            accessibilityRole="button"
            className="mt-3 self-start rounded-full bg-brand px-5 py-3"
          >
            <Txt weight="bold" className="text-bg">
              Try again
            </Txt>
          </Pressable>
        </View>
      ) : null}

      {/* Refresh failed but we still have cached content */}
      {error && data ? (
        <Pressable
          onPress={() => void load("refresh")}
          accessibilityRole="button"
          accessibilityLabel="Couldn't refresh. Tap to retry."
          className="mt-6 flex-row items-center rounded-2xl bg-panel px-4 py-3"
        >
          <MaterialCommunityIcons
            name="wifi-alert"
            size={18}
            color={C.muted}
          />

          <Txt className="ml-3 flex-1 text-sm text-muted" numberOfLines={1}>
            Couldn&apos;t refresh. Showing saved content.
          </Txt>

          <Txt weight="semibold" className="text-sm text-brand">
            Retry
          </Txt>
        </Pressable>
      ) : null}

      {isEmpty ? (
        <View className="mt-8 items-center rounded-2xl bg-panel p-6">
          <Txt weight="bold">Nothing to explore yet</Txt>

          <Txt className="mt-2 text-center text-sm text-muted">
            Pull down to refresh, or try the fitness tools below.
          </Txt>
        </View>
      ) : null}

      {/* Sections */}
      {data
        ? EXPLORE_SECTIONS.map((section) => (
            <ExploreSectionBlock
              key={section}
              section={section}
              items={data.sections[section] ?? []}
              warning={data.unavailable.includes(section)}
              onAll={() => onAll(section)}
              onOpen={onOpen}
            />
          ))
        : null}

      {/* Fitness tools */}
      <View className="mt-9 mb-2 flex-row items-center justify-between">
        <Txt weight="bold" className="text-[28px]" accessibilityRole="header">
          Fitness tools
        </Txt>

        <Pressable
          onPress={() => onAll("tools")}
          accessibilityRole="button"
          accessibilityLabel="See all fitness tools"
          className="flex-row items-center py-2 pl-3"
        >
          <Txt weight="semibold" className="text-sm text-brand">
            See all
          </Txt>

          <MaterialCommunityIcons
            name="chevron-right"
            size={19}
            color={C.brand}
          />
        </Pressable>
      </View>

      {TOOL_ROWS.map((row, rowIndex) => (
        <View
          key={rowIndex}
          className={`flex-row gap-3 ${rowIndex > 0 ? "mt-3" : ""}`}
        >
          {row.map((tool) => (
            <ToolTile
              key={tool.id}
              tool={tool}
              onPress={() => openTool(tool.id)}
            />
          ))}

          {/* Pad short rows so tiles keep equal width */}
          {Array.from({ length: TOOLS_PER_ROW - row.length }, (_, i) => (
            <View key={`pad-${i}`} className="flex-1" />
          ))}
        </View>
      ))}
    </ScrollView>
    </ScreenEntrance>
  );
}