import { Ionicons } from "@expo/vector-icons";

import { router } from "expo-router";

import { useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import {
  EQUIPMENT_OPTIONS,
  MUSCLE_OPTIONS,
} from "@/features/exercises/constants";

import { ExerciseRow } from "@/features/exercises/components/exercise-row";

import { useDebouncedValue } from "@/features/exercises/hooks";

import { useExercises } from "@/features/exercises/queries";

import type { Equipment, MuscleGroup } from "@/features/exercises/types";

export default function ExerciseLibraryScreen() {
  const [search, setSearch] = useState("");

  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  const [equipment, setEquipment] = useState<Equipment | null>(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const filters = useMemo(
    () => ({
      q: debouncedSearch.trim() || undefined,

      muscle,

      equipment,
    }),
    [debouncedSearch, muscle, equipment],
  );

  const query = useExercises(filters);

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 pt-3">
        <Pressable
          onPress={router.back}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]"
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>

        <View className="ml-4 flex-1">
          <Text className="text-[26px] font-extrabold tracking-[-1px] text-white">
            Exercises
          </Text>

          <Text className="mt-1 text-[12px] text-white/35">
            System + your custom library
          </Text>
        </View>

        <Pressable
          onPress={() => {
            router.push("/exercises/create");
          }}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-brand"
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      <View className="mx-5 mt-6 flex-row items-center rounded-2xl border border-white/10 bg-white/[0.045] px-4">
        <Ionicons name="search" size={19} color="rgba(255,255,255,.35)" />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises"
          placeholderTextColor="rgba(255,255,255,.25)"
          selectionColor="#3B82F6"
          className="ml-3 flex-1 py-4 text-[15px] text-white"
        />

        {search ? (
          <Pressable
            onPress={() => {
              setSearch("");
            }}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color="rgba(255,255,255,.3)"
            />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-5 max-h-11"
        contentContainerStyle={{
          paddingHorizontal: 20,

          gap: 8,
        }}
      >
        <Pressable
          onPress={() => {
            setMuscle(null);
          }}
          className="justify-center rounded-xl border px-4"
          style={{
            borderColor:
              muscle === null ? "rgba(59,130,246,.55)" : "rgba(255,255,255,.1)",

            backgroundColor:
              muscle === null ? "rgba(37,99,235,.14)" : "rgba(255,255,255,.03)",
          }}
        >
          <Text
            className="text-[12px] font-semibold"
            style={{
              color: muscle === null ? "#60A5FA" : "rgba(255,255,255,.55)",
            }}
          >
            All
          </Text>
        </Pressable>

        {MUSCLE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => {
              setMuscle(option.value);
            }}
            className="justify-center rounded-xl border px-4"
            style={{
              borderColor:
                muscle === option.value
                  ? "rgba(59,130,246,.55)"
                  : "rgba(255,255,255,.1)",

              backgroundColor:
                muscle === option.value
                  ? "rgba(37,99,235,.14)"
                  : "rgba(255,255,255,.03)",
            }}
          >
            <Text
              className="text-[12px] font-semibold"
              style={{
                color:
                  muscle === option.value ? "#60A5FA" : "rgba(255,255,255,.55)",
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3 max-h-11"
        contentContainerStyle={{
          paddingHorizontal: 20,

          gap: 8,
        }}
      >
        <Pressable
          onPress={() => {
            setEquipment(null);
          }}
          className="justify-center rounded-xl bg-white/[0.04] px-4"
        >
          <Text className="text-[12px] font-semibold text-white/45">
            Equipment
          </Text>
        </Pressable>

        {EQUIPMENT_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => {
              setEquipment(equipment === option.value ? null : option.value);
            }}
            className="justify-center rounded-xl border px-4"
            style={{
              borderColor:
                equipment === option.value
                  ? "rgba(59,130,246,.55)"
                  : "rgba(255,255,255,.08)",

              backgroundColor:
                equipment === option.value
                  ? "rgba(37,99,235,.14)"
                  : "rgba(255,255,255,.025)",
            }}
          >
            <Text
              className="text-[12px] font-semibold"
              style={{
                color:
                  equipment === option.value
                    ? "#60A5FA"
                    : "rgba(255,255,255,.45)",
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          className="mt-4 flex-1"
          ItemSeparatorComponent={() => (
            <View className="ml-[102px] h-px bg-white/[0.055]" />
          )}
          renderItem={({ item }) => (
            <ExerciseRow
              exercise={item}
              onPress={() => {
                router.push(`/exercises/${item.id}`);
              }}
            />
          )}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator
                color="#3B82F6"
                style={{
                  margin: 24,
                }}
              />
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center px-10 pt-20">
              <Ionicons name="search-outline" size={30} color="#525252" />

              <Text className="mt-4 text-center text-[15px] font-semibold text-white/55">
                No exercises found
              </Text>

              <Text className="mt-2 text-center text-[12px] leading-5 text-white/30">
                Try another search or clear a filter.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
