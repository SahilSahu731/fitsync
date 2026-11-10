import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useLocalSearchParams, useRouter } from "expo-router";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import {
  exploreApi,
  EXPLORE_SECTIONS,
  type ExploreCard,
  type ExploreSection,
} from "@/src/features/explore/api";

import {
  ExploreCardTile,
  ExploreHeader,
} from "@/src/features/explore/components";

import {
  EXPLORE_LABELS,
  openExploreCard,
} from "@/src/features/explore/navigation";

import { usePublishedTools } from "@/src/features/explore/use-tools";

export default function ExploreSearch() {
  const { q: initial } = useLocalSearchParams<{
    q?: string;
  }>();

  const router = useRouter();
  const { tools: TOOLS, error: toolsError, reload: reloadTools } = usePublishedTools();

  const [search, setSearch] = useState(initial ?? "");

  const [query, setQuery] = useState((initial ?? "").trim());

  const [results, setResults] = useState<
    Partial<Record<ExploreSection, ExploreCard[]>>
  >({});

  const [unavailable, setUnavailable] = useState<ExploreSection[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setQuery(search.trim()), 300);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let active = true;

    if (!query) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults({});
      setUnavailable([]);
      return;
    }

    setLoading(true);

    void Promise.allSettled(
      EXPLORE_SECTIONS.map((section) =>
        exploreApi.list(section, {
          q: query,
          pageSize: 4,
        }),
      ),
    )
      .then((data) => {
        if (!active) {
          return;
        }

        const next: Partial<Record<ExploreSection, ExploreCard[]>> = {};

        const errors: ExploreSection[] = [];

        data.forEach((result, index) => {
          const section = EXPLORE_SECTIONS[index];

          if (result.status === "fulfilled") {
            next[section] = result.value.items;
          } else {
            errors.push(section);
          }
        });

        setResults(next);
        setUnavailable(errors);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [query]);

  const matches = TOOLS.filter((tool) =>
    `${tool.name} ${tool.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const found =
    EXPLORE_SECTIONS.some((section) => (results[section]?.length ?? 0) > 0) ||
    matches.length > 0;

  return (
    <ScrollView
      className="flex-1 bg-bg"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: 20,
        paddingBottom: 100,
      }}
    >
      {toolsError && <Pressable onPress={reloadTools}><Txt className="mb-4 text-brand">Tools unavailable. Tap to retry.</Txt></Pressable>}
      <ExploreHeader title="Search Explore" onBack={() => router.back()} />

      <View className="h-14 flex-row items-center rounded-2xl bg-panel px-4">
        <MaterialCommunityIcons name="magnify" color={C.muted} size={22} />

        <TextInput
          autoFocus
          value={search}
          onChangeText={(text) => setSearch(text.slice(0, 100))}
          className="ml-3 h-12 flex-1 text-ink"
          placeholder="What are you looking for?"
          placeholderTextColor={C.muted}
        />
      </View>

      {loading ? <ActivityIndicator color={C.brand} className="mt-10" /> : null}

      {!loading && query && !found ? (
        <Txt className="mt-8 text-sm text-muted">
          No matches found. Try another search term.
        </Txt>
      ) : null}

      {!loading && unavailable.length ? (
        <Txt className="mt-4 text-xs text-muted">
          Some sections couldn&apos;t be searched. Try again later.
        </Txt>
      ) : null}

      {EXPLORE_SECTIONS.map((section) =>
        results[section]?.length ? (
          <View key={section} className="mt-8">
            <View className="mb-3 flex-row items-center justify-between">
              <Txt weight="bold" className="text-xl">
                {EXPLORE_LABELS[section]}
              </Txt>

              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/explore/browse/[section]",
                    params: {
                      section,
                      q: query,
                    },
                  })
                }
                accessibilityLabel={`See all ${section}`}
              >
                <Txt className="text-sm text-brand">See all</Txt>
              </Pressable>
            </View>

            <View className="gap-3">
              {Array.from(
                {
                  length: Math.ceil(results[section]!.length / 2),
                },
                (_, i) => {
                  const pair = results[section]!.slice(i * 2, i * 2 + 2);

                  return (
                    <View key={i} className="flex-row gap-3">
                      {pair.map((card) => (
                        <ExploreCardTile
                          key={card.id}
                          card={card}
                          compact
                          onPress={() => openExploreCard(router, card)}
                        />
                      ))}

                      {pair.length === 1 ? <View className="flex-1" /> : null}
                    </View>
                  );
                },
              )}
            </View>
          </View>
        ) : null,
      )}

      {query && matches.length ? (
        <View className="mt-8">
          <Txt weight="bold" className="mb-3 text-xl">
            Tools
          </Txt>

          {matches.map((tool) => (
            <Pressable
              key={tool.id}
              onPress={() =>
                router.push({
                  pathname: "/explore/tools/[slug]",
                  params: {
                    slug: tool.id,
                  },
                })
              }
              className="mb-2 rounded-xl bg-panel p-4"
            >
              <Txt weight="bold">{tool.name}</Txt>

              <Txt className="mt-1 text-sm text-muted">{tool.description}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
