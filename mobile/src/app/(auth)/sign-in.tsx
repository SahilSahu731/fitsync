
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

  const {
    signInGoogle,
    previewDevelopment
  } = useSession();

  const [busy, setBusy] = useState(false);

  const handleGoogleLogin = async () => {
    if (busy) return;

    setBusy(true);

    try {
      const success = await signInGoogle();

      if (success) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );

        router.replace("/");
      }
    } catch (error) {
      Alert.alert(
        "Could not sign in",
        error instanceof Error
          ? error.message
          : "Check your Google OAuth setup."
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = async () => {
    await previewDevelopment();
    router.replace("/");
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 25,
          paddingTop: 28,
          paddingBottom: 28
        }}
      >
        {/* Branding */}

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="mr-2 h-2.5 w-2.5 rotate-45 bg-brand" />

            <Txt weight="extra" className="text-2xl tracking-tight">
              FIT
              <Txt weight="extra" className="text-2xl text-brand">
                SYNC
              </Txt>
            </Txt>
          </View>

          <View className="rounded-full border border-border px-3 py-1.5">
            <Txt
              weight="semibold"
              className="text-[10px] tracking-[2px] text-muted"
            >
              THE NEXT REP
            </Txt>
          </View>
        </View>

        {/* Main illustration */}

        <View
          className="my-5 flex-1 items-center justify-center overflow-hidden rounded-[32px] border border-border bg-panel"
          style={{
            minHeight: 300
          }}
        >
          <View className="absolute left-5 top-5 rounded-full border border-brand px-3 py-1">
            <Txt
              weight="bold"
              className="text-[10px] tracking-[2px] text-brand"
            >
              LEVEL UP / 001
            </Txt>
          </View>

          <AthleteArt width={320} height={286} />

          <View className="absolute bottom-5 right-5 rotate-[-7deg] rounded-lg bg-brand px-3 py-2">
            <Txt
              weight="extra"
              className="text-xs tracking-wider text-bg"
            >
              NO EXCUSES.
            </Txt>
          </View>
        </View>

        {/* Headline */}

        <Txt
          weight="extra"
          className="text-[42px] leading-[43px] tracking-tight"
        >
          SHOW UP.{"\n"}
          <Txt
            weight="extra"
            className="text-[42px] leading-[43px] text-brand"
          >
            GET STRONGER.
          </Txt>
        </Txt>

        <Txt className="mt-3 text-[15px] leading-6 text-muted">
          A training plan that's ready when you are.
          Simple workouts, quick logging, real progress.
        </Txt>

        {/* Native Google login */}

        <Pressable
          disabled={busy}
          onPress={handleGoogleLogin}
          className="mt-7 h-14 flex-row items-center justify-center rounded-2xl bg-ink px-4"
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
            {busy
              ? "Connecting to Google..."
              : "Continue with Google"}
          </Txt>
        </Pressable>

        {/* Preview is not available in release builds */}

        {__DEV__ ? (
          <Pressable
            onPress={handlePreview}
            className="mt-3 items-center py-2"
          >
            <Txt className="text-xs text-muted">
              Preview UI without Google (development only) →
            </Txt>
          </Pressable>
        ) : null}

        <Txt className="mt-3 text-center text-[11px] leading-4 text-muted">
          Google account only · No email/password form
        </Txt>

        <View className="mt-7 flex-row items-center justify-center gap-2">
          <MaterialCommunityIcons
            name="shield-check-outline"
            color={C.brand}
            size={16}
          />

          <Txt
            weight="medium"
            className="text-xs text-muted"
          >
            Your training journey starts here.
          </Txt>
        </View>
      </ScrollView>
    </View>
  );
}
