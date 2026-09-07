import {
  Ionicons,
} from "@expo/vector-icons";

import {
  router,
} from "expo-router";

import {
  Image,
  Text,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  SettingsRow,
} from "@/features/profile/components/settings-row";

import {
  useAuthStore,
} from "@/features/auth/store";


function prettyGoal(
  value: string | null | undefined,
): string {
  if (!value) {
    return "Not set";
  }

  return value
    .toLowerCase()
    .split("_")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(" ");
}


export default function ProfileScreen() {
  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  const initial =
    user?.display_name
      ?.charAt(0)
      .toUpperCase() ??
    user?.email
      ?.charAt(0)
      .toUpperCase() ??
    "F";


  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        <Text className="text-[34px] font-extrabold tracking-[-1.3px] text-white">
          You
        </Text>

        <View className="mt-7 flex-row items-center">
          {user?.avatar_url ? (
            <Image
              source={{
                uri:
                  user.avatar_url,
              }}
              className="h-[72px] w-[72px] rounded-full bg-white/10"
            />
          ) : (
            <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-white/10">
              <Text className="text-[26px] font-extrabold text-white">
                {initial}
              </Text>
            </View>
          )}

          <View className="ml-4 flex-1">
            <Text className="text-[22px] font-extrabold tracking-[-0.5px] text-white">
              {user?.display_name ??
                "FitSync member"}
            </Text>

            {user?.username ? (
              <Text className="mt-1 text-[14px] text-white/40">
                @{user.username}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="mt-8 flex-row gap-3">
          <View className="flex-1 rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/30">
              Goal
            </Text>

            <Text className="mt-2 text-[14px] font-bold text-white">
              {prettyGoal(
                user?.fitness_goal
              )}
            </Text>
          </View>

          <View className="flex-1 rounded-[22px] border border-white/10 bg-white/[0.035] p-4">
            <Text className="text-[11px] font-semibold uppercase tracking-[1.5px] text-white/30">
              Weekly target
            </Text>

            <Text className="mt-2 text-[14px] font-bold text-white">
              {user?.weekly_workout_target ??
                3}{" "}
              workouts
            </Text>
          </View>
        </View>

        <View className="mt-8 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.025]">
          <SettingsRow
            icon="person-outline"
            title="Edit profile"
            subtitle="Name and username"
            onPress={() => {
              router.push(
                "/profile/edit"
              );
            }}
          />

          <View className="ml-[68px] h-px bg-white/[0.07]" />

          <SettingsRow
            icon="barbell-outline"
            title="Training preferences"
            subtitle="Goal, experience, units and weekly target"
            onPress={() => {
              router.push("/profile/preferences");
            }}
          />

          <View className="ml-[68px] h-px bg-white/[0.07]" />

          <SettingsRow
            icon="shield-checkmark-outline"
            title="Account"
            subtitle="Email, security and account controls"
            onPress={() => {
              router.push(
                "/profile/account"
              );
            }}
          />
        </View>

        <View className="mt-auto pb-6 pt-8">
          <View className="flex-row items-center justify-center gap-2">
            <Ionicons
              name="checkmark-circle"
              size={14}
              color="#22C55E"
            />

            <Text className="text-[11px] text-white/25">
              FitSync account active
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}