import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { useState } from "react";

import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "@/features/auth/store";

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);

  const logout = useAuthStore((state) => state.logout);

  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await logout();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        <Text className="text-[34px] font-extrabold tracking-[-1.3px] text-white">
          You
        </Text>

        <View className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <Ionicons name="person" size={24} color="#FFFFFF" />
          </View>

          <Text className="mt-5 text-lg font-bold text-white">
            {user?.email}
          </Text>

          <View className="mt-3 flex-row items-center gap-2">
            <Ionicons name="checkmark-circle" size={17} color="#22C55E" />

            <Text className="text-sm text-white/45">Email verified</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={() => {
            void handleLogout();
          }}
          className="mt-5 min-h-[56px] flex-row items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/[0.06]"
          style={{
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#F87171" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#F87171" />

              <Text className="font-bold text-red-300">Log out</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
