import {
  Ionicons,
} from "@expo/vector-icons";

import * as Haptics
  from "expo-haptics";

import {
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  signOutGoogleProvider,
} from "@/features/auth/google";

import {
  useAuthStore,
} from "@/features/auth/store";

export default function ProfileScreen() {
  const user =
    useAuthStore(
      (state) =>
        state.user,
    );

  const logout =
    useAuthStore(
      (state) =>
        state.logout,
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  async function handleLogout() {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      await Haptics
        .impactAsync(
          Haptics
            .ImpactFeedbackStyle
            .Light,
        );

      /*
       * First revoke/clear the actual
       * FitSync session.
       *
       * This is the important logout.
       */
      await logout();

      /*
       * Then clear Google's provider-side
       * local state.
       *
       * This prevents the next Google
       * sign-in from silently reusing the
       * previous account where possible.
       *
       * signOutGoogleProvider() already
       * swallows provider cleanup failures,
       * so FitSync logout isn't dependent
       * on Google succeeding.
       */
      await signOutGoogleProvider();
    } finally {
      setLoading(false);
    }
  }

  const initial =
    user?.display_name
      ?.trim()
      .charAt(0)
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

        <Text className="mt-2 text-[14px] text-white/40">
          Your FitSync account.
        </Text>

        <View className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <Text className="text-[24px] font-extrabold text-white">
              {initial}
            </Text>
          </View>

          {user?.display_name ? (
            <Text className="mt-5 text-[20px] font-extrabold tracking-[-0.5px] text-white">
              {user.display_name}
            </Text>
          ) : (
            <Text className="mt-5 text-[18px] font-bold text-white">
              FitSync member
            </Text>
          )}

          {user?.username ? (
            <Text className="mt-1 text-[14px] text-white/40">
              @{user.username}
            </Text>
          ) : null}

          <View className="my-6 h-px bg-white/10" />

          <View className="flex-row items-center gap-3">
            <Ionicons
              name="mail-outline"
              size={19}
              color="rgba(255,255,255,0.55)"
            />

            <Text
              numberOfLines={1}
              className="flex-1 text-[14px] text-white/70"
            >
              {user?.email}
            </Text>
          </View>

          <View className="mt-4 flex-row items-center gap-3">
            <Ionicons
              name={
                user?.email_verified
                  ? "checkmark-circle"
                  : "alert-circle-outline"
              }
              size={19}
              color={
                user?.email_verified
                  ? "#22C55E"
                  : "#F59E0B"
              }
            />

            <Text className="text-[14px] text-white/60">
              {user?.email_verified
                ? "Email verified"
                : "Email verification pending"}
            </Text>
          </View>

          {!user?.onboarding_complete ? (
            <View className="mt-5 rounded-2xl bg-white/[0.05] px-4 py-3">
              <Text className="text-[13px] leading-5 text-white/45">
                Your FitSync profile
                setup isn't complete
                yet. We'll build that
                in the next phase.
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={() => {
            void handleLogout();
          }}
          className="mt-5 min-h-[56px] flex-row items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/[0.06]"
          style={({
            pressed,
          }) => ({
            opacity:
              loading
                ? 0.6
                : pressed
                  ? 0.8
                  : 1,

            transform: [
              {
                scale:
                  !loading &&
                  pressed
                    ? 0.985
                    : 1,
              },
            ],
          })}
        >
          {loading ? (
            <ActivityIndicator
              color="#F87171"
            />
          ) : (
            <>
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#F87171"
              />

              <Text className="font-bold text-red-300">
                Log out
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}