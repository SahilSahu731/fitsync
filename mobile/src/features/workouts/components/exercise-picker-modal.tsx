import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useMemo,
  useState,
} from "react";

import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  useDebouncedValue,
} from "@/features/exercises/hooks";

import {
  useExercises,
} from "@/features/exercises/queries";

import type {
  Exercise,
} from "@/features/exercises/types";


interface Props {
  visible: boolean;

  onClose: () => void;

  onAdd: (
    exercises: Exercise[],
  ) => void;
}


export function ExercisePickerModal({
  visible,
  onClose,
  onAdd,
}: Props) {
  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selected,
    setSelected,
  ] = useState<
    Record<
      string,
      Exercise
    >
  >({});

  const debounced =
    useDebouncedValue(
      search,
      300,
    );

  const query =
    useExercises({
      q:
        debounced ||
        undefined,
    });

  const exercises =
    useMemo(
      () =>
        query.data?.pages
          .flatMap(
            (
              page,
            ) =>
              page.items,
          ) ??
        [],
      [
        query.data,
      ],
    );

  function toggle(
    exercise: Exercise,
  ) {
    setSelected(
      (
        current,
      ) => {
        const copy = {
          ...current,
        };

        if (
          copy[
            exercise.id
          ]
        ) {
          delete copy[
            exercise.id
          ];
        } else {
          copy[
            exercise.id
          ] =
            exercise;
        }

        return copy;
      },
    );
  }

  function add() {
    onAdd(
      Object.values(
        selected
      )
    );

    setSelected(
      {}
    );

    setSearch(
      ""
    );

    onClose();
  }

  return (
    <Modal
      visible={
        visible
      }
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center px-5 pt-3">
          <Pressable
            onPress={
              onClose
            }
            className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]"
          >
            <Ionicons
              name="close"
              size={21}
              color="#FFFFFF"
            />
          </Pressable>

          <Text className="ml-4 flex-1 text-[22px] font-extrabold text-white">
            Add exercises
          </Text>

          <Pressable
            disabled={
              Object.keys(
                selected
              ).length ===
              0
            }
            onPress={
              add
            }
            className="rounded-xl bg-brand px-4 py-3"
            style={{
              opacity:
                Object.keys(
                  selected
                ).length ===
                0
                  ? 0.4
                  : 1,
            }}
          >
            <Text className="text-[13px] font-bold text-white">
              Add{" "}
              {Object.keys(
                selected
              ).length ||
                ""}
            </Text>
          </Pressable>
        </View>

        <View className="mx-5 mt-6 flex-row items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4">
          <Ionicons
            name="search"
            size={18}
            color="rgba(255,255,255,.35)"
          />

          <TextInput
            value={
              search
            }
            onChangeText={
              setSearch
            }
            placeholder="Search exercises"
            placeholderTextColor="rgba(255,255,255,.25)"
            selectionColor="#3B82F6"
            className="ml-3 flex-1 py-4 text-white"
          />
        </View>

        <FlatList
          data={
            exercises
          }
          keyExtractor={(
            item,
          ) =>
            item.id
          }
          className="mt-4"
          renderItem={({
            item,
          }) => {
            const active =
              Boolean(
                selected[
                  item.id
                ]
              );

            return (
              <Pressable
                onPress={() => {
                  toggle(
                    item
                  );
                }}
                className="mx-5 mb-2 flex-row items-center rounded-2xl border p-4"
                style={{
                  borderColor:
                    active
                      ? "rgba(59,130,246,.55)"
                      : "rgba(255,255,255,.08)",

                  backgroundColor:
                    active
                      ? "rgba(37,99,235,.12)"
                      : "rgba(255,255,255,.025)",
                }}
              >
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-white">
                    {item.name}
                  </Text>

                  <Text className="mt-1 text-[11px] text-white/35">
                    {item
                      .primary_muscles
                      .join(
                        " · "
                      )}
                  </Text>
                </View>

                <View
                  className="h-6 w-6 items-center justify-center rounded-full border"
                  style={{
                    borderColor:
                      active
                        ? "#3B82F6"
                        : "rgba(255,255,255,.2)",

                    backgroundColor:
                      active
                        ? "#3B82F6"
                        : "transparent",
                  }}
                >
                  {active ? (
                    <Ionicons
                      name="checkmark"
                      size={15}
                      color="#FFFFFF"
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}