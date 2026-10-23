import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View
} from "react-native";

import {
  useLocalSearchParams,
  useRouter
} from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Txt } from "@/src/components/ui";

import {
  catalogApi,
  type Routine
} from "@/src/features/training-catalog/api";

import { RoutineCard } from "@/src/features/training-catalog/components/routine-card";

export default function RoutineCategoryScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;

    let active = true;

    void catalogApi.routines(slug)
      .then(data => {
        if (active) setRoutines(data);
      })
      .catch(() => {
        if (active) setError("Could not load routines.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const title = slug
    ?.split("-")
    .map(word => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
    >
      <Pressable onPress={() => router.back()} className="mb-7">
        <MaterialCommunityIcons
          name="arrow-left"
          size={27}
          color={C.ink}
        />
      </Pressable>

      <Txt weight="semibold" className="text-xs text-brand">
        ROUTINE COLLECTION
      </Txt>

      <Txt weight="extra" className="mb-2 mt-2 text-[34px]">
        {title}
      </Txt>

      <Txt className="mb-7 text-sm text-muted">
        Pick a workout and make it yours.
      </Txt>

      {loading ? (
        <ActivityIndicator color={C.brand} />
      ) : error ? (
        <Txt className="text-muted">{error}</Txt>
      ) : routines.length === 0 ? (
        <View className="rounded-2xl bg-panel p-6">
          <Txt weight="bold">More routines coming soon</Txt>
          <Txt className="mt-2 text-sm text-muted">
            No published routines are available in this category yet.
          </Txt>
        </View>
      ) : (
        routines.map(routine => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            onPress={() => router.push({
              pathname: "/explore/routines/[id]",
              params: { id: routine.id }
            })}
          />
        ))
      )}
    </ScrollView>
  );
}