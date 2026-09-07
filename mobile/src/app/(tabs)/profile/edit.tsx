import { ActionButton } from "@/components/action-button";
import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { router } from "expo-router";

import { useState } from "react";

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { updateProfile } from "@/features/profile/api";

import { useAuthStore } from "@/features/auth/store";

import { parseApiError } from "@/lib/api/errors";

export default function EditProfileScreen() {
  const user = useAuthStore((state) => state.user);

  const setUser = useAuthStore((state) => state.setUser);

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");

  const [username, setUsername] = useState(user?.username ?? "");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const normalizedUsername = username.trim().toLowerCase();

    if (displayName.trim().length < 2) {
      setError("Enter your name.");

      return;
    }

    if (!/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
      setError("Enter a valid username.");

      return;
    }

    setLoading(true);

    setError(null);

    try {
      const updated = await updateProfile({
        display_name: displayName.trim(),

        username: normalizedUsername,
      });

      setUser(updated);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.back();
    } catch (requestError) {
      setError(
        parseApiError(requestError, "Couldn't update your profile.").message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6">
          <View className="flex-row items-center pt-4">
            <Pressable
              onPress={router.back}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/[0.06]"
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>

            <Text className="ml-4 text-[20px] font-extrabold text-white">
              Edit profile
            </Text>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingTop: 40, paddingBottom: 24 }}
          >
            <View>
              <Text className="text-[13px] font-semibold text-white/55">
                Name
              </Text>

              <TextInput
                value={displayName}
                onChangeText={(value) => {
                  setDisplayName(value);

                  setError(null);
                }}
                autoCapitalize="words"
                selectionColor="#38BDF8"
                className="mt-2 min-h-[58px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[16px] font-semibold text-white"
              />

              <Text className="mt-6 text-[13px] font-semibold text-white/55">
                Username
              </Text>

              <View className="mt-2 min-h-[58px] flex-row items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4">
                <Text className="text-white/30">@</Text>

                <TextInput
                  value={username}
                  onChangeText={(value) => {
                    setUsername(value.toLowerCase().replace(/[^a-z0-9_]/g, ""));

                    setError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={24}
                  selectionColor="#38BDF8"
                  className="ml-1 flex-1 py-4 text-[16px] font-semibold text-white"
                />
              </View>

              {error ? (
                <Text className="mt-4 text-[13px] leading-5 text-red-300">
                  {error}
                </Text>
              ) : null}
            </View>

            <View className="pb-5 pt-6">
              <ActionButton
                title="Save changes"
                loading={loading}
                onPress={() => {
                  void handleSave();
                }}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
