import { FontAwesome6, Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { LinearGradient } from "expo-linear-gradient";

import { router } from "expo-router";

import { useState } from "react";

import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { startGoogleSignIn } from "@/features/auth/google";

import { useAuthStore } from "@/features/auth/store";

import { parseApiError } from "@/lib/api/errors";

const backgroundImage = require("../../../assets/images/auth-background.jpg");

export default function AuthWelcomeScreen() {
  const authenticateWithGoogle = useAuthStore(
    (state) => state.authenticateWithGoogle,
  );

  const [googleLoading, setGoogleLoading] = useState(false);

  const [googleError, setGoogleError] = useState<string | null>(null);

  async function handleGooglePress() {
    if (googleLoading) {
      return;
    }

    setGoogleLoading(true);

    setGoogleError(null);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await startGoogleSignIn();

      if (result.type === "cancelled") {
        return;
      }

      /*
       * Native Google Sign-In gave us
       * an ID token.
       *
       * FastAPI now verifies it and
       * returns normal FitSync session
       * credentials.
       */
      await authenticateWithGoogle(result.idToken);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      /*
       * No router.replace().
       *
       * Root Stack.Protected notices
       * authenticated=true and switches
       * to the authenticated routes.
       */
    } catch (error) {
      /*
       * startGoogleSignIn() can throw
       * normal Error instances before
       * Axios is ever involved.
       */
      const fallback =
        error instanceof Error
          ? error.message
          : "Unable to continue with Google.";

      const parsed = parseApiError(error, fallback);

      setGoogleError(parsed.message);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleEmailPress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    router.push("/email");
  }

  return (
    <View className="flex-1 bg-black">
      <ImageBackground
        source={backgroundImage}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={[
          "rgba(0,0,0,0.20)",
          "rgba(0,0,0,0.34)",
          "rgba(0,0,0,0.70)",
          "rgba(0,0,0,0.98)",
        ]}
        locations={[0, 0.35, 0.68, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View className="absolute inset-0 bg-black/10" />

      <SafeAreaView className="flex-1">
        <View className="flex-1 px-6 pb-4">
          <Animated.View
            entering={FadeIn.duration(500).delay(100)}
            className="pt-3"
          >
            <Text className="text-[22px] font-extrabold tracking-[-0.6px] text-white">
              FitSync
            </Text>
          </Animated.View>

          <View className="flex-1" />

          <Animated.View
            entering={FadeInDown.duration(600)
              .delay(120)
              .springify()
              .damping(18)}
          >
            <Text className="max-w-[340px] text-[46px] font-extrabold leading-[49px] tracking-[-2px] text-white">
              Train better.
              {"\n"}
              Together.
            </Text>

            <Text className="mt-4 max-w-[350px] text-[16px] leading-[24px] text-white/70">
              Track your training, see your progress, and show up with the
              people who push you.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(600)
              .delay(220)
              .springify()
              .damping(18)}
            className="mt-9 gap-3"
          >
            <Pressable
              accessibilityRole="button"
              disabled={googleLoading}
              onPress={() => {
                void handleGooglePress();
              }}
              /*
               * Keep runtime state out of
               * changing NativeWind classes.
               *
               * You've already hit that
               * NativeWind v4 issue once.
               */
              className="min-h-[58px] flex-row items-center justify-center rounded-2xl bg-white px-5"
              style={({ pressed }) => ({
                opacity: googleLoading ? 0.65 : pressed ? 0.9 : 1,

                transform: [
                  {
                    scale: !googleLoading && pressed ? 0.985 : 1,
                  },
                ],
              })}
            >
              {googleLoading ? (
                <ActivityIndicator color="#111111" />
              ) : (
                <>
                  <View className="absolute left-5">
                    <FontAwesome6 name="google" size={19} color="#111111" />
                  </View>

                  <Text className="text-[16px] font-bold tracking-[-0.2px] text-neutral-950">
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>

            {googleError ? (
              <View className="flex-row items-start gap-2 px-1">
                <Ionicons
                  name="alert-circle-outline"
                  size={15}
                  color="#F87171"
                  style={{
                    marginTop: 2,
                  }}
                />

                <Text className="flex-1 text-[13px] leading-5 text-red-300">
                  {googleError}
                </Text>
              </View>
            ) : null}

            <View className="my-1 flex-row items-center gap-4">
              <View className="h-px flex-1 bg-white/15" />

              <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-white/45">
                or
              </Text>

              <View className="h-px flex-1 bg-white/15" />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={googleLoading}
              onPress={() => {
                void handleEmailPress();
              }}
              className="min-h-[58px] flex-row items-center justify-center rounded-2xl border border-white/20 bg-black/30 px-5"
              style={({ pressed }) => ({
                opacity: googleLoading ? 0.5 : pressed ? 0.82 : 1,

                transform: [
                  {
                    scale: !googleLoading && pressed ? 0.985 : 1,
                  },
                ],
              })}
            >
              <View className="absolute left-5">
                <Ionicons name="mail-outline" size={21} color="#FFFFFF" />
              </View>

              <Text className="text-[16px] font-bold tracking-[-0.2px] text-white">
                Continue with Email
              </Text>
            </Pressable>
          </Animated.View>

          <Animated.View
            entering={FadeIn.duration(500).delay(500)}
            className="mt-6 px-3"
          >
            <Text className="text-center text-[11px] leading-[17px] text-white/40">
              By continuing, you agree to FitSync&apos;s{" "}
              <Text className="text-white/65">Terms of Service</Text> and{" "}
              <Text className="text-white/65">Privacy Policy</Text>.
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
