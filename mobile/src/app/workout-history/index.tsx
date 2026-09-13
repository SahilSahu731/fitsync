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

import { useLocalWorkoutHistory } from "@/features/workout-session/hooks/use-local-workout-history";

import { useWorkoutHistory } from "@/features/workouts/queries";

import { formatDuration } from "@/features/workouts/utils";

interface DisplayHistoryItem {
  routeId: string;

  id: string;

  serverId: string | null;

  name: string;

  completed_at: string;

  duration_seconds: number;

  exercise_count: number;

  completed_set_count: number;

  exercise_names: string[];

  syncStatus: string | null;
}

function formatDate(value: string): string {
  const date = new Date(value);

  return date.toLocaleDateString(undefined, {
    month: "short",

    day: "numeric",

    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function SyncText({ status }: { status: string | null }) {
  if (!status || status === "SYNCED") {
    return null;
  }

  let text = "Saved on device";

  if (status === "SYNCING") {
    text = "Syncing…";
  }

  if (status === "CONFLICT") {
    text = "Needs attention";
  }

  if (status === "ERROR") {
    text = "Sync failed";
  }

  return (
    <View className="mt-2 flex-row items-center">
      <View className="h-1.5 w-1.5 rounded-full bg-amber-400" />

      <Text className="ml-2 text-[10px] font-semibold text-white/30">
        {text}
      </Text>
    </View>
  );
}

export default function WorkoutHistoryScreen() {
  const serverQuery = useWorkoutHistory();

  const localQuery = useLocalWorkoutHistory();

  const serverItems =
    serverQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const serverIds = new Set(serverItems.map((item) => item.id));

  const localItems: DisplayHistoryItem[] = localQuery.items
    .filter((item) => !item.server_id || !serverIds.has(item.server_id))
    .map((item) => ({
      routeId: item.route_id,

      id: item.local_id,

      serverId: item.server_id,

      name: item.name,

      completed_at: item.completed_at,

      duration_seconds: item.duration_seconds,

      exercise_count: item.exercise_count,

      completed_set_count: item.completed_set_count,

      exercise_names: item.exercise_names,

      syncStatus: item.sync_status,
    }));

  const mappedServer: DisplayHistoryItem[] = serverItems.map((item) => ({
    routeId: item.id,

    id: item.id,

    serverId: item.id,

    name: item.name,

    completed_at: item.completed_at,

    duration_seconds: item.duration_seconds,

    exercise_count: item.exercise_count,

    completed_set_count: item.completed_set_count,

    exercise_names: item.exercise_names,

    syncStatus: null,
  }));

  const items = [...localItems, ...mappedServer].sort(
    (a, b) =>
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
  );

  const loading = serverQuery.isLoading && localQuery.isLoading;

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
          <Text className="text-[26px] font-extrabold text-white">History</Text>

          <Text className="mt-1 text-[11px] text-white/30">
            Completed workouts
          </Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.routeId}-${item.serverId ?? "local"}`}
          contentContainerStyle={{
            padding: 20,

            gap: 12,

            paddingBottom: 80,
          }}
          onRefresh={() => {
            void Promise.all([serverQuery.refetch(), localQuery.refetch()]);
          }}
          refreshing={serverQuery.isRefetching || localQuery.isLoading}
          onEndReached={() => {
            if (serverQuery.hasNextPage && !serverQuery.isFetchingNextPage) {
              void serverQuery.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                router.push(`/workout-history/${item.routeId}`);
              }}
              className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5"
            >
              <View className="flex-row items-start">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-muted">
                  <Ionicons name="checkmark" size={19} color="#60A5FA" />
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-[16px] font-extrabold text-white">
                    {item.name}
                  </Text>

                  <Text className="mt-1 text-[12px] text-white/35">
                    {formatDate(item.completed_at)}
                  </Text>

                  <SyncText status={item.syncStatus} />
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="rgba(255,255,255,.2)"
                />
              </View>

              <View className="mt-5 flex-row">
                <Metric
                  label="Duration"
                  value={formatDuration(item.duration_seconds)}
                />

                <Metric label="Exercises" value={String(item.exercise_count)} />

                <Metric label="Sets" value={String(item.completed_set_count)} />
              </View>

              <Text
                numberOfLines={1}
                className="mt-4 text-[11px] text-white/25"
              >
                {item.exercise_names.join(" · ")}
              </Text>
            </Pressable>
          )}
          ListFooterComponent={
            serverQuery.isFetchingNextPage ? (
              <ActivityIndicator
                color="#3B82F6"
                style={{
                  margin: 20,
                }}
              />
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center px-8 pt-24">
              <View className="h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.04]">
                <Ionicons name="time-outline" size={28} color="#525252" />
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

function Metric({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <View className="flex-1">
      <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-white/25">
        {label}
      </Text>

      <Text className="mt-1 text-[13px] font-bold text-white/70">{value}</Text>
    </View>
  );
}
