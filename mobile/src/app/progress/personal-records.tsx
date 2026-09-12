import { Ionicons } from "@expo/vector-icons";

import { router } from "expo-router";

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { usePersonalRecords } from "@/features/progress/queries";

import {
  formatPRPerformance,
  formatPRType,
  relativeDate,
} from "@/features/progress/utils";

export default function PersonalRecordsScreen() {
  const query = usePersonalRecords();

  const records = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-5 pt-3">
        <Pressable
          onPress={router.back}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.05]"
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>

        <View className="ml-4">
          <Text className="text-[24px] font-extrabold text-white">
            Personal Records
          </Text>

          <Text className="mt-1 text-[11px] text-white/30">
            Your strongest moments.
          </Text>
        </View>
      </View>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 20,

            gap: 10,

            paddingBottom: 80,
          }}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                router.push(`/progress/exercises/${item.exercise_id}`);
              }}
              className="flex-row items-center rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-4"
            >
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/[0.09]">
                <Ionicons name="trophy-outline" size={19} color="#FBBF24" />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[14px] font-bold text-white">
                  {item.exercise_name}
                </Text>

                <Text className="mt-1 text-[11px] text-white/30">
                  {formatPRType(item)}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-[13px] font-extrabold text-white">
                  {formatPRPerformance(item)}
                </Text>

                <Text className="mt-1 text-[10px] text-white/25">
                  {relativeDate(item.created_at)}
                </Text>
              </View>
            </Pressable>
          )}
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator
                color="#3B82F6"
                style={{
                  margin: 20,
                }}
              />
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center pt-24">
              <Ionicons name="trophy-outline" size={30} color="#525252" />

              <Text className="mt-4 text-[17px] font-bold text-white">
                No PRs yet
              </Text>

              <Text className="mt-2 text-[12px] text-white/30">
                Keep training. They&apos;ll come.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
