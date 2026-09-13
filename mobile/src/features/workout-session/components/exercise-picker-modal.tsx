import { Ionicons } from "@expo/vector-icons";

import { useState } from "react";

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

  onClose: () => void;

  onAdd: (exercises: Exercise[]) => void;
}

export function ExercisePickerModal({ visible, onClose, onAdd }: Props) {
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Record<string, Exercise>>({});

  const debounced = useDebouncedValue(search, 300);

  const library = useOfflineExercises({
    search: debounced,
  });

  function toggle(exercise: Exercise) {
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

  function add() {
    onAdd(Object.values(selected));

    setSelected({});

    setSearch("");

    onClose();
  }

  const selectedCount = Object.keys(selected).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-5 pt-3">
          <Pressable
            onPress={onClose}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]"
          >
            <Ionicons name="close" size={21} color="#FFFFFF" />
          </Pressable>

          <View className="ml-4 flex-1">
            <Text className="text-[22px] font-extrabold text-white">
              Add exercises
            </Text>

            {library.isOfflineFallback ? (
              <Text className="mt-0.5 text-[10px] text-white/30">
                Offline exercise library
              </Text>
            ) : null}
          </View>

          <Pressable
            disabled={selectedCount === 0}
            onPress={add}
            className="rounded-xl bg-brand px-4 py-3"
            style={{
              opacity: selectedCount === 0 ? 0.4 : 1,
            }}
          >
            <Text className="text-[13px] font-bold text-white">
              Add {selectedCount || ""}
            </Text>
          </Pressable>
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
            data={library.items}
            keyExtractor={(item) => item.id}
            className="mt-4"
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
                    toggle(item);
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

                    <Text className="mt-1 text-[10px] font-semibold text-brand-bright/70">
                      {trackingLabel(item.tracking_type)}
                    </Text>
                  </View>

                  <View
                    className="h-6 w-6 items-center justify-center rounded-full border"
                    style={{
                      borderColor: active ? "#3B82F6" : "rgba(255,255,255,.2)",

                      backgroundColor: active ? "#3B82F6" : "transparent",
                    }}
                  >
                    {active ? (
                      <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
