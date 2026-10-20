
import React, { useState } from "react";

import {
  Alert,
  Pressable,
  ScrollView,
  View
} from "react-native";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { AthleteArt } from "@/src/components/athlete-art";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";

export default function SignInScreen() {
  const router = useRouter();
  const { signInGoogle } = useSession();

  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const success = await signInGoogle();

      if (success) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );

        router.replace("/");
      }
    } catch (error) {
      Alert.alert(
        "Sign-in failed",
        error instanceof Error
          ? error.message
          : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 25,
        paddingBottom: 35
      }}
    >
      <View className="flex-row items-center justify-between">
        <Txt weight="extra" className="text-2xl">
          FIT
          <Txt weight="extra" className="text-2xl text-brand">
            SYNC
          </Txt>
        </Txt>

        <Txt
          weight="bold"
          className="text-[10px] tracking-[2px] text-muted"
        >
          THE NEXT REP
        </Txt>
      </View>

      <View className="my-8 flex-1 items-center justify-center overflow-hidden rounded-[32px] border border-border bg-panel">
        <View className="absolute left-5 top-5 rounded-full border border-brand px-3 py-1">
          <Txt
            weight="bold"
            className="text-[10px] tracking-[2px] text-brand"
          >
            BUILT TO GROW
          </Txt>
        </View>

        <AthleteArt width={320} height={280} />
      </View>

      <Txt
        weight="extra"
        className="text-[42px] leading-[43px] tracking-tight"
      >
        THE WORK{"\n"}
        <Txt
          weight="extra"
          className="text-[42px] text-brand"
        >
          STARTS HERE.
        </Txt>
      </Txt>

      <Txt className="mt-4 text-[15px] leading-6 text-muted">
        Your workouts. Your progress. Your pace.
        Everything you need to train smarter.
      </Txt>

      <Pressable
        disabled={loading}
        onPress={login}
        className="mt-9 h-15 flex-row items-center justify-center rounded-2xl bg-ink py-4"
      >
        <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-white">
          <Txt
            weight="extra"
            className="text-lg text-[#4285F4]"
          >
            G
          </Txt>
        </View>

        <Txt weight="bold" className="text-base text-bg">
          {loading
            ? "Connecting..."
            : "Continue with Google"}
        </Txt>
      </Pressable>

      <View className="mt-6 flex-row items-center justify-center">
        <MaterialCommunityIcons
          name="shield-check-outline"
          size={17}
          color={C.brand}
        />

        <Txt className="ml-2 text-xs text-muted">
          Secure Google sign-in
        </Txt>
      </View>
    </ScrollView>
  );
}
