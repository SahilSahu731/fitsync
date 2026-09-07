import {
  Ionicons,
} from "@expo/vector-icons";

import {
  router,
} from "expo-router";

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  useWorkoutHistory,
} from "@/features/workouts/queries";

import {
  formatDuration,
} from "@/features/workouts/utils";


function formatDate(
  value: string,
): string {
  const date =
    new Date(
      value
    );

  return date.toLocaleDateString(
    undefined,
    {
      month:
        "short",

      day:
        "numeric",

      year:
        date.getFullYear() !==
        new Date().getFullYear()
          ? "numeric"
          : undefined,
    },
  );
}


export default function WorkoutHistoryScreen() {
  const query =
    useWorkoutHistory();

  const items =
    query.data?.pages
      .flatMap(
        (
          page,
        ) =>
          page.items,
      ) ??
    [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 pt-3">
        <Pressable
          onPress={
            router.back
          }
          className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]"
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>

        <View className="ml-4">
          <Text className="text-[26px] font-extrabold text-white">
            History
          </Text>

          <Text className="mt-1 text-[11px] text-white/30">
            Completed workouts
          </Text>
        </View>
      </View>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            color="#3B82F6"
          />
        </View>
      ) : (
        <FlatList
          data={
            items
          }
          keyExtractor={(
            item,
          ) =>
            item.id
          }
          contentContainerStyle={{
            padding:
              20,

            gap:
              12,

            paddingBottom:
              80,
          }}
          onEndReached={() => {
            if (
              query
                .hasNextPage &&
              !query
                .isFetchingNextPage
            ) {
              void query
                .fetchNextPage();
            }
          }}
          onEndReachedThreshold={
            0.5
          }
          renderItem={({
            item,
          }) => (
            <Pressable
              onPress={() => {
                router.push(
                  `/workout-history/${item.id}`
                );
              }}
              className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5"
            >
              <View className="flex-row items-start">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-muted">
                  <Ionicons
                    name="checkmark"
                    size={19}
                    color="#60A5FA"
                  />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-[16px] font-extrabold text-white">
                    {item.name}
                  </Text>

                  <Text className="mt-1 text-[12px] text-white/35">
                    {formatDate(
                      item.completed_at
                    )}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="rgba(255,255,255,.2)"
                />
              </View>

              <View className="mt-5 flex-row">
                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-white/25">
                    Duration
                  </Text>

                  <Text className="mt-1 text-[13px] font-bold text-white/70">
                    {formatDuration(
                      item.duration_seconds
                    )}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-white/25">
                    Exercises
                  </Text>

                  <Text className="mt-1 text-[13px] font-bold text-white/70">
                    {item.exercise_count}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-white/25">
                    Sets
                  </Text>

                  <Text className="mt-1 text-[13px] font-bold text-white/70">
                    {item.completed_set_count}
                  </Text>
                </View>
              </View>

              <Text
                numberOfLines={
                  1
                }
                className="mt-4 text-[11px] text-white/25"
              >
                {item.exercise_names.join(
                  " · "
                )}
              </Text>
            </Pressable>
          )}
          ListFooterComponent={
            query
              .isFetchingNextPage ? (
              <ActivityIndicator
                color="#3B82F6"
                style={{
                  margin:
                    20,
                }}
              />
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center px-8 pt-24">
              <View className="h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.04]">
                <Ionicons
                  name="time-outline"
                  size={28}
                  color="#525252"
                />
              </View>

              <Text className="mt-5 text-[18px] font-extrabold text-white">
                No workouts yet
              </Text>

              <Text className="mt-2 text-center text-[13px] leading-5 text-white/35">
                Finish your first workout and it will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}