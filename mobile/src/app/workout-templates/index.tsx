import { Ionicons } from "@expo/vector-icons";

import { router } from "expo-router";

import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useWorkoutTemplates } from "@/features/workouts/queries";

export default function WorkoutTemplatesScreen() {
  const query = useWorkoutTemplates();

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
            Templates
          </Text>

          <Text className="mt-1 text-[12px] text-white/35">
            Your reusable workouts
          </Text>
        </View>

        <Pressable
          onPress={() => {
            router.push("/workout-templates/create");
          }}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-brand"
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {query.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 20,

            gap: 12,
          }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                router.push({
                  pathname: "/workout-templates/[templateId]",
                  params: { templateId: item.id },
                });
              }}
              className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]"
            >
              <View className="flex-row p-4">
                {item.thumbnail_url ? (
                  <Image
                    source={{
                      uri: item.thumbnail_url,
                    }}
                    className="h-[72px] w-[72px] rounded-2xl bg-elevated"
                  />
                ) : (
                  <View className="h-[72px] w-[72px] items-center justify-center rounded-2xl bg-brand-muted">
                    <Ionicons
                      name="barbell-outline"
                      size={25}
                      color="#60A5FA"
                    />
                  </View>
                )}

                <View className="ml-4 flex-1">
                  <Text className="text-[17px] font-extrabold text-white">
                    {item.name}
                  </Text>

                  <Text className="text-white/38 mt-2 text-[12px]">
                    {item.exercise_count} exercises
                  </Text>

                  <Text
                    numberOfLines={1}
                    className="mt-2 text-[11px] text-white/25"
                  >
                    {item.exercise_names.join(" · ")}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="rgba(255,255,255,.2)"
                />
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center px-8 pt-24">
              <View className="h-16 w-16 items-center justify-center rounded-3xl bg-brand-muted">
                <Ionicons name="albums-outline" size={27} color="#60A5FA" />
              </View>

              <Text className="mt-5 text-[18px] font-extrabold text-white">
                No templates yet
              </Text>

              <Text className="mt-2 text-center text-[13px] leading-5 text-white/35">
                Build your first reusable workout and start faster next time.
              </Text>

              <Pressable
                onPress={() => {
                  router.push("/workout-templates/create");
                }}
                className="mt-6 rounded-2xl bg-brand px-6 py-4"
              >
                <Text className="font-bold text-white">Create template</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
