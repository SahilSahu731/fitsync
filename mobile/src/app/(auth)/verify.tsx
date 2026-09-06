import { Ionicons } from "@expo/vector-icons";

import * as Haptics from "expo-haptics";

import { LinearGradient } from "expo-linear-gradient";

import { router, useLocalSearchParams } from "expo-router";

import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { startEmailAuth } from "@/features/auth/api";

import { AuthBackButton } from "@/features/auth/components/auth-back-button";

import { OtpInput } from "@/features/auth/components/otp-input";

import { useAuthStore } from "@/features/auth/store";

import { parseApiError } from "@/lib/api/errors";

const backgroundImage = require("../../../assets/images/auth-background.jpg");

function parsePositiveNumber(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{
    email?: string;

    challengeId?: string;

    resendAfter?: string;

    expiresIn?: string;
  }>();

  const authenticateWithEmail = useAuthStore(
    (state) => state.authenticateWithEmail,
  );

  const email = useMemo(() => {
    if (typeof params.email !== "string") {
      return "";
    }

    return params.email.trim().toLowerCase();
  }, [params.email]);

  const initialChallengeId =
    typeof params.challengeId === "string" ? params.challengeId : "";

  const initialResendSeconds = parsePositiveNumber(params.resendAfter, 60);

  const initialExpiresSeconds = parsePositiveNumber(params.expiresIn, 600);

  const [challengeId, setChallengeId] = useState(initialChallengeId);

  const [code, setCode] = useState("");

  const [verifying, setVerifying] = useState(false);

  const [resendLoading, setResendLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [resendSeconds, setResendSeconds] = useState(initialResendSeconds);

  const [expiresSeconds, setExpiresSeconds] = useState(initialExpiresSeconds);

  /*
   * Protect against someone manually
   * opening /verify without a challenge.
   */
  useEffect(() => {
    if (!email || !challengeId) {
      router.replace("/email");
    }
  }, [email, challengeId]);

  /*
   * Resend countdown.
   */
  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setResendSeconds((current) => Math.max(current - 1, 0));
    }, 1_000);

    return () => {
      clearTimeout(timer);
    };
  }, [resendSeconds]);

  /*
   * Challenge expiry countdown.
   *
   * UX only.
   *
   * Backend remains the real source
   * of truth for expiration.
   */
  useEffect(() => {
    if (expiresSeconds <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setExpiresSeconds((current) => Math.max(current - 1, 0));
    }, 1_000);

    return () => {
      clearTimeout(timer);
    };
  }, [expiresSeconds]);

  async function verifyCode(verificationCode: string) {
    if (verifying || expiresSeconds <= 0 || verificationCode.length !== 6) {
      return;
    }

    setVerifying(true);

    setError(null);

    try {
      /*
       * REAL AUTHENTICATION.
       *
       * Backend:
       * - verifies code
       * - creates/fetches user
       * - creates session
       * - returns JWT + refresh token
       *
       * Store:
       * - saves tokens
       * - sets authenticated user
       */
      await authenticateWithEmail({
        challengeId,

        code: verificationCode,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      /*
       * DO NOT router.replace().
       *
       * Root Stack.Protected sees
       * authenticated=true and
       * automatically replaces the
       * available navigation tree.
       */
    } catch (requestError) {
      const parsed = parseApiError(requestError, "Unable to verify this code.");

      setError(parsed.message);

      setCode("");

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resendSeconds > 0 || resendLoading) {
      return;
    }

    setResendLoading(true);

    setError(null);

    try {
      const response = await startEmailAuth(email);

      /*
       * New code means NEW challenge.
       * Old challenge is now invalid.
       */
      setChallengeId(response.challenge_id);

      setCode("");

      setResendSeconds(response.resend_after);

      setExpiresSeconds(response.expires_in);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (requestError) {
      const parsed = parseApiError(requestError, "Unable to resend the code.");

      setError(parsed.message);

      /*
       * Backend may return an exact
       * cooldown duration.
       */
      if (parsed.retryAfter !== undefined && parsed.retryAfter > 0) {
        setResendSeconds(parsed.retryAfter);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setResendLoading(false);
    }
  }

  if (!email || !challengeId) {
    return null;
  }

  const codeReady = code.length === 6 && expiresSeconds > 0 && !verifying;

  return (
    <View className="flex-1 bg-black">
      <ImageBackground
        source={backgroundImage}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={[
          "rgba(0,0,0,0.52)",
          "rgba(0,0,0,0.68)",
          "rgba(0,0,0,0.93)",
          "rgba(0,0,0,0.995)",
        ]}
        locations={[0, 0.34, 0.68, 1]}
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
              <View className="mb-5 h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                <Ionicons
                  name="mail-unread-outline"
                  size={22}
                  color="#FFFFFF"
                />
              </View>

              <Text className="max-w-[350px] text-[40px] font-extrabold leading-[44px] tracking-[-1.7px] text-white">
                Check your inbox.
              </Text>

              <Text className="mt-4 text-[15px] leading-6 text-white/65">
                We sent a 6-digit code to
              </Text>

              <Text
                numberOfLines={1}
                className="mt-1 text-[15px] font-bold text-white"
              >
                {email}
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(540)
                .delay(110)
                .springify()
                .damping(19)}
              className="mt-8"
            >
              <OtpInput
                value={code}
                disabled={verifying || expiresSeconds <= 0}
                error={Boolean(error)}
                onChange={(value) => {
                  setCode(value);

                  if (error) {
                    setError(null);
                  }
                }}
                onComplete={(value) => {
                  /*
                   * Digit 6 immediately
                   * submits the real code.
                   */
                  void verifyCode(value);
                }}
              />

              {error ? (
                <View className="mt-3 flex-row items-start gap-2">
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
              className="mt-6"
            >
              <Pressable
                accessibilityRole="button"
                disabled={!codeReady}
                accessibilityState={{ disabled: !codeReady, busy: verifying }}
                onPress={() => {
                  void verifyCode(code);
                }}
                /*
                 * IMPORTANT:
                 *
                 * className remains STATIC.
                 *
                 * Runtime state uses style
                 * because of the NativeWind v4
                 * bug you previously hit.
                 */
                className="min-h-[58px] items-center justify-center rounded-2xl px-5"
                style={({ pressed }) => ({
                  backgroundColor: codeReady
                    ? pressed
                      ? "#1D4ED8"
                      : "#2563EB"
                    : "#1E3A8A",

                  transform: [
                    {
                      scale: codeReady && pressed ? 0.985 : 1,
                    },
                  ],
                })}
              >
                {verifying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    className="text-[16px] font-bold tracking-[-0.2px]"
                    style={{
                      color: "#FFFFFF",
                    }}
                  >
                    Verify code
                  </Text>
                )}
              </Pressable>
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(450).delay(280)}
              className="mt-7 items-center"
            >
              {expiresSeconds <= 0 ? (
                <Text className="mb-4 text-[13px] font-semibold text-red-300">
                  This code has expired.
                </Text>
              ) : (
                <Text className="mb-4 text-[12px] text-white/35">
                  Code expires in{" "}
                  <Text className="font-semibold text-white/55">
                    {formatDuration(expiresSeconds)}
                  </Text>
                </Text>
              )}

              {resendLoading ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator
                    size="small"
                    color="rgba(255,255,255,0.65)"
                  />

                  <Text className="text-[13px] text-white/50">
                    Sending new code...
                  </Text>
                </View>
              ) : resendSeconds > 0 ? (
                <Text className="text-[13px] text-white/45">
                  Didn't get it?{" "}
                  <Text className="text-blue-400">Resend in </Text>
                  <Text className="font-bold text-white/70">
                    {formatDuration(resendSeconds)}
                  </Text>
                </Text>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() => {
                    void handleResend();
                  }}
                >
                  <Text className="text-[13px] font-bold text-white">
                    Didn't get it? Resend code
                  </Text>
                </Pressable>
              )}

              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => {
                  router.back();
                }}
                className="mt-5"
              >
                <Text className="text-[13px] font-semibold text-white/60">
                  Use a different email
                </Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
