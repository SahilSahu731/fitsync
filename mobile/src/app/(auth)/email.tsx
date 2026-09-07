import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { LinearGradient } from "expo-linear-gradient";

import { router } from "expo-router";

import { useState } from "react";

import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { startEmailAuth } from "@/features/auth/api";

import { AuthBackButton } from "@/features/auth/components/auth-back-button";

import { parseApiError } from "@/lib/api/errors";

const backgroundImage = require("../../../assets/images/auth-background.jpg");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailAuthScreen() {
  const [email, setEmail] = useState("");

  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  function handleEmailChange(value: string) {
    setEmail(value);

    if (error) {
      setError(null);
    }
  }

  async function handleContinue() {
    if (loading) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Enter a valid email address.");

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      return;
    }

    setLoading(true);

    setError(null);

    try {
      /*
       * REAL BACKEND REQUEST.
       *
       * This creates the Mongo
       * auth challenge and sends
       * the Resend email.
       */
      const response = await startEmailAuth(normalizedEmail);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.push({
        pathname: "/verify",

        params: {
          email: normalizedEmail,

          challengeId: response.challenge_id,

          resendAfter: String(response.resend_after),

          expiresIn: String(response.expires_in),
        },
      });
    } catch (requestError) {
      const parsed = parseApiError(
        requestError,
        "Unable to send your verification code.",
      );

      setError(parsed.message);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <SafeAreaView className="flex-1">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeIn.duration(350)} className="pt-3">
              <AuthBackButton onPress={router.back} />
            </Animated.View>

            <View className="h-6" />

            <Animated.View
              entering={FadeInDown.duration(520).springify().damping(19)}
            >
              <Text className="text-[13px] font-bold uppercase tracking-[2.4px] text-white/50">
                Continue with email
              </Text>

              <Text className="mt-3 max-w-[350px] text-[40px] font-extrabold leading-[44px] tracking-[-1.7px] text-white">
                What&apos;s your email?
              </Text>

              <Text className="mt-4 max-w-[350px] text-[15px] leading-6 text-white/65">
                No password needed. We&apos;ll send you a 6-digit verification code.
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
                className="min-h-[60px] flex-row items-center rounded-2xl border bg-black/35 px-4"
                style={{
                  borderColor: error
                    ? "rgba(248,113,113,0.70)"
                    : "rgba(255,255,255,0.20)",
                }}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={error ? "#F87171" : "#FFFFFF"}
                />

                <TextInput
                  value={email}
                  editable={!loading}
                  onChangeText={handleEmailChange}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  autoFocus
                  returnKeyType="done"
                  selectionColor="#38BDF8"
                  onSubmitEditing={() => {
                    void handleContinue();
                  }}
                  className="ml-3 flex-1 py-4 text-[16px] font-medium text-white"
                />
              </View>

              {error ? (
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
                    {error}
                  </Text>
                </View>
              ) : null}
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(540).delay(180)}
              className="mt-5"
            >
              <Pressable
                accessibilityRole="button"
                disabled={loading}
                onPress={() => {
                  void handleContinue();
                }}
                className="min-h-[58px] items-center justify-center rounded-2xl bg-white px-5"
                style={{
                  opacity: loading ? 0.65 : 1,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text className="text-[16px] font-bold tracking-[-0.2px] text-neutral-950">
                    Continue
                  </Text>
                )}
              </Pressable>
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(450).delay(300)}
              className="mt-5"
            >
              <Text className="text-center text-[12px] leading-5 text-white/40">
                We&apos;ll only use your email for your FitSync account and important
                account messages.
              </Text>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
