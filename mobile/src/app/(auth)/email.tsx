import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { LinearGradient } from "expo-linear-gradient";

import { router } from "expo-router";

import { useState } from "react";

import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { AuthBackButton } from "@/features/auth/components/auth-back-button";

const backgroundImage = require("../../../assets/images/auth-background.jpg");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailAuthScreen() {
  const [email, setEmail] = useState("");

  const [error, setError] = useState<string | null>(null);

  function handleEmailChange(value: string) {
    setEmail(value);

    if (error) {
      setError(null);
    }
  }

  async function handleContinue() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Enter a valid email address.");

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    router.push({
      pathname: "/verify",

      params: {
        email: normalizedEmail,
      },
    });
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
          "rgba(0,0,0,0.42)",
          "rgba(0,0,0,0.58)",
          "rgba(0,0,0,0.90)",
          "rgba(0,0,0,0.99)",
        ]}
        locations={[0, 0.35, 0.68, 1]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <SafeAreaView className="flex-1 mb-80">
          <View className="flex-1 px-6 pb-5">
            <Animated.View entering={FadeIn.duration(350)} className="pt-3">
              <AuthBackButton onPress={router.back} />
            </Animated.View>

            <View className="flex-1" />

            <Animated.View
              entering={FadeInDown.duration(520).springify().damping(19)}
            >
              <Text className="text-[13px] font-bold uppercase tracking-[2.4px] text-white/50">
                Continue with email
              </Text>

              <Text className="mt-3 max-w-[350px] text-[40px] font-extrabold leading-[44px] tracking-[-1.7px] text-white">
                What's your email?
              </Text>

              <Text className="mt-4 max-w-[350px] text-[15px] leading-6 text-white/65">
                No password needed. We'll send you a 6-digit code to verify your
                email.
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(540)
                .delay(100)
                .springify()
                .damping(19)}
              className="mt-8 gap-3"
            >
              <View
                className={[
                  "min-h-[60px]",
                  "flex-row",
                  "items-center",
                  "rounded-2xl",
                  "border",
                  "bg-black/35",
                  "px-4",
                  error ? "border-red-400/70" : "border-white/20",
                ].join(" ")}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={error ? "#F87171" : "#FFFFFF"}
                />

                <TextInput
                  value={email}
                  onChangeText={handleEmailChange}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  autoFocus
                  returnKeyType="done"
                  selectionColor="#D9FF43"
                  onSubmitEditing={() => {
                    void handleContinue();
                  }}
                  className="ml-3 flex-1 py-4 text-[16px] font-medium text-white"
                />
              </View>

              {error ? (
                <View className="flex-row items-center gap-2 px-1">
                  <Ionicons
                    name="alert-circle-outline"
                    size={15}
                    color="#F87171"
                  />

                  <Text className="text-[13px] text-red-300">{error}</Text>
                </View>
              ) : null}
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(540).delay(180)}
              className="mt-5"
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void handleContinue();
                }}
                className="min-h-[58px] items-center justify-center rounded-2xl bg-white px-5 active:scale-[0.985] active:bg-neutral-200"
              >
                <Text className="text-[16px] font-bold tracking-[-0.2px] text-neutral-950">
                  Continue
                </Text>
              </Pressable>
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(450).delay(300)}
              className="mt-5"
            >
              <Text className="text-center text-[12px] leading-5 text-white/40">
                We'll only use your email for your FitSync account and important
                account messages.
              </Text>
            </Animated.View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
