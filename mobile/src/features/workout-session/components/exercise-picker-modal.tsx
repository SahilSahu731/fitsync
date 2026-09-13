import { Ionicons } from "@expo/vector-icons";

import { useMemo, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useDebouncedValue } from "@/features/exercises/hooks";

import { useOfflineExercises } from "@/features/exercises/use-offline-exercises";

import { trackingLabel } from "@/features/exercises/tracking";

import type { Exercise } from "@/features/exercises/types";

interface Props {
  visible: boolean;

  title?: string;

  selectionMode?: "single" | "multiple";

  excludeExerciseIds?: string[];

  onClose: () => void;

  onAdd: (exercises: Exercise[]) => void;
}

export function ExercisePickerModal({
  visible,
  title = "Add exercises",
  selectionMode = "multiple",
  excludeExerciseIds = [],
  onClose,
  onAdd,
}: Props) {
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Record<string, Exercise>>({});

  const debounced = useDebouncedValue(search, 250);

  const library = useOfflineExercises({
    search: debounced,
  });

  const excluded = useMemo(
    () => new Set(excludeExerciseIds),
    [excludeExerciseIds],
  );

  const items = useMemo(
    () => library.items.filter((exercise) => !excluded.has(exercise.id)),
    [library.items, excluded],
  );

  function resetAndClose() {
    setSelected({});

    setSearch("");

    onClose();
  }

  function choose(exercise: Exercise) {
    if (selectionMode === "single") {
      onAdd([exercise]);

      resetAndClose();

      return;
    }

    setSelected((current) => {
      const copy = {
        ...current,
      };

      if (copy[exercise.id]) {
        delete copy[exercise.id];
      } else {
        copy[exercise.id] = exercise;
      }

      return copy;
    });
  }

  const selectedCount = Object.keys(selected).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={resetAndClose}
    >
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-5 pt-3">
          <Pressable
            onPress={resetAndClose}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]"
          >
            <Ionicons name="close" size={21} color="#FFFFFF" />
          </Pressable>

          <View className="ml-4 flex-1">
            <Text className="text-[22px] font-extrabold text-white">
              {title}
            </Text>

            {library.isOfflineFallback ? (
              <Text className="mt-0.5 text-[10px] text-white/30">
                Offline exercise library
              </Text>
            ) : null}
          </View>

          {selectionMode === "multiple" ? (
            <Pressable
              disabled={selectedCount === 0}
              onPress={() => {
                onAdd(Object.values(selected));

                resetAndClose();
              }}
              className="rounded-xl bg-brand px-4 py-3"
              style={{
                opacity: selectedCount === 0 ? 0.4 : 1,
              }}
            >
              <Text className="text-[13px] font-bold text-white">
                Add {selectedCount || ""}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="mx-5 mt-6 flex-row items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4">
          <Ionicons name="search" size={18} color="rgba(255,255,255,.35)" />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises"
            placeholderTextColor="rgba(255,255,255,.25)"
            selectionColor="#3B82F6"
            className="ml-3 flex-1 py-4 text-white"
          />
        </View>

        {library.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#3B82F6" />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            className="mt-4"
            keyboardShouldPersistTaps="handled"
            onEndReached={() => {
              if (library.hasNextPage && !library.isFetchingNextPage) {
                void library.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            renderItem={({ item }) => {
              const active = Boolean(selected[item.id]);

              return (
                <Pressable
                  onPress={() => {
                    choose(item);
                  }}
                  className="mx-5 mb-2 flex-row items-center rounded-2xl border p-4"
                  style={{
                    borderColor: active
                      ? "rgba(59,130,246,.55)"
                      : "rgba(255,255,255,.08)",

                    backgroundColor: active
                      ? "rgba(37,99,235,.12)"
                      : "rgba(255,255,255,.025)",
                  }}
                >
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-white">
                      {item.name}
                    </Text>

                    <Text className="mt-1 text-[11px] text-white/35">
                      {item.primary_muscles.join(" · ")}
                    </Text>

                    <Text className="mt-1 text-[10px] font-semibold text-brand-bright/75">
                      {trackingLabel(item.tracking_type)}
                    </Text>
                  </View>

                  {selectionMode === "multiple" ? (
                    <View
                      className="h-6 w-6 items-center justify-center rounded-full border"
                      style={{
                        borderColor: active
                          ? "#3B82F6"
                          : "rgba(255,255,255,.2)",

                        backgroundColor: active ? "#3B82F6" : "transparent",
                      }}
                    >
                      {active ? (
                        <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                      ) : null}
                    </View>
                  ) : (
                    <Ionicons
                      name="swap-horizontal"
                      size={19}
                      color="#60A5FA"
                    />
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
