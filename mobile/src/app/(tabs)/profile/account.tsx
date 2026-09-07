import { ActionButton } from "@/components/action-button";
import {
  Ionicons,
} from "@expo/vector-icons";

import * as Haptics
  from "expo-haptics";

import {
  router,
} from "expo-router";

import {
  useState,
} from "react";

import {
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  SafeAreaView,
} from "react-native-safe-area-context";

import {
  useAuthStore,
} from "@/features/auth/store";

import {
  deleteAccount,
} from "@/features/profile/api";

import {
  signOutGoogleProvider,
} from "@/features/auth/google";

import {
  parseApiError,
} from "@/lib/api/errors";


export default function AccountScreen() {
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

  const clearLocalSession =
    useAuthStore(
      (state) =>
        state.clearLocalSession,
    );


  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);


  async function handleLogout() {
    if (
      loggingOut ||
      deleting
    ) {
      return;
    }

    setLoggingOut(
      true
    );

    try {
      await logout();

      await signOutGoogleProvider();

    } finally {
      setLoggingOut(
        false
      );
    }
  }


  async function performDelete() {
    setDeleting(true);

    setError(null);

    try {
      await deleteAccount();

      await signOutGoogleProvider();

      /*
       * Server account no longer exists,
       * so remove local credentials.
       */
      await clearLocalSession();

      await Haptics
        .notificationAsync(
          Haptics
            .NotificationFeedbackType
            .Success,
        );

    } catch (requestError) {
      setError(
        parseApiError(
          requestError,
          "Couldn't delete your account.",
        ).message,
      );

    } finally {
      setDeleting(false);
    }
  }


  function confirmDelete() {
    Alert.alert(
      "Delete your FitSync account?",
      "This permanently deletes your account and authentication sessions. This cannot be undone.",
      [
        {
          text:
            "Cancel",

          style:
            "cancel",
        },

        {
          text:
            "Delete",

          style:
            "destructive",

          onPress: () => {
            void performDelete();
          },
        },
      ],
    );
  }


  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6">
        <View className="flex-row items-center pt-4">
          <Pressable
            onPress={
              router.back
            }
            className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.06]"
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color="#FFFFFF"
            />
          </Pressable>

          <Text className="ml-4 text-[20px] font-extrabold text-white">
            Account
          </Text>
        </View>

        <Text className="mt-10 text-[12px] font-semibold uppercase tracking-[1.8px] text-white/30">
          Sign-in
        </Text>

        <View className="mt-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
          <Text className="text-[12px] text-white/35">
            Email
          </Text>

          <Text className="mt-2 text-[15px] font-semibold text-white">
            {user?.email}
          </Text>

          <View className="mt-3 flex-row items-center gap-2">
            <Ionicons
              name={
                user?.email_verified
                  ? "checkmark-circle"
                  : "alert-circle-outline"
              }
              size={16}
              color={
                user?.email_verified
                  ? "#22C55E"
                  : "#F59E0B"
              }
            />

            <Text className="text-[12px] text-white/40">
              {user?.email_verified
                ? "Verified"
                : "Not verified"}
            </Text>
          </View>
        </View>

        <Text className="mt-8 text-[12px] font-semibold uppercase tracking-[1.8px] text-white/30">
          Session
        </Text>

        <View style={{ marginTop: 16 }}><ActionButton title="Log out" loading={loggingOut} disabled={deleting} onPress={() => { void handleLogout(); }} /></View>

        <Text className="mt-10 text-[12px] font-semibold uppercase tracking-[1.8px] text-red-300/60">
          Danger zone
        </Text>

        <View className="mt-3 rounded-[22px] border border-red-400/15 bg-red-400/[0.04] p-5">
          <Text className="text-[16px] font-bold text-white">
            Delete account
          </Text>

          <Text className="mt-2 text-[13px] leading-5 text-white/40">
            Permanently remove your FitSync account and authentication sessions.
          </Text>

          <View style={{ marginTop: 16 }}><ActionButton title="Delete my account" destructive loading={deleting} disabled={loggingOut} onPress={confirmDelete} /></View>
        </View>

        {error ? (
          <Text className="mt-4 text-[13px] leading-5 text-red-300">
            {error}
          </Text>
        ) : null}

        <Text className="mt-auto pb-6 text-center text-[11px] leading-5 text-white/20">
          Email changes will require verification and will be added with the dedicated account-security flow.
        </Text>
      </View>
    </SafeAreaView>
  );
}