import * as Haptics from "expo-haptics";

import { LinearGradient } from "expo-linear-gradient";

import { router, useLocalSearchParams } from "expo-router";

import { useEffect, useMemo, useState } from "react";

import {
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

import { AuthBackButton } from "@/features/auth/components/auth-back-button";

import { OtpInput } from "@/features/auth/components/otp-input";

const backgroundImage = require("../../../assets/images/auth-background.jpg");

const INITIAL_RESEND_SECONDS = 60;

function formatSeconds(seconds: number): string {
  return seconds.toString().padStart(2, "0");
}

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();

  const email = useMemo(() => {
    if (typeof params.email !== "string") {
      return "";
    }

    return params.email.trim().toLowerCase();
  }, [params.email]);

  const [code, setCode] = useState("");

  const [resendSeconds, setResendSeconds] = useState(INITIAL_RESEND_SECONDS);

  useEffect(() => {
    if (!email) {
      router.replace("/email");
    }
  }, [email]);

  useEffect(() => {
    if (resendSeconds <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      setResendSeconds((current) => Math.max(current - 1, 0));
    }, 1_000);

    return () => {
      clearTimeout(timeout);
    };
  }, [resendSeconds]);

  async function handleCodeComplete() {
    await Haptics.selectionAsync();
  }

  async function handleVerify() {
    if (code.length !== 6) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    /*
     * Auth 3 connects this to:
     *
     * POST /auth/email/verify
     *
     * Do NOT navigate anywhere yet.
     */
    console.log("OTP ready for backend verification:", code);
  }

  async function handleResend() {
    if (resendSeconds > 0) {
      return;
    }

    setCode("");

    setResendSeconds(INITIAL_RESEND_SECONDS);

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    /*
     * Auth 3 will call:
     *
     * POST /auth/email/start
     */
    console.log("Resend OTP for:", email);
  }

  if (!email) {
    return null;
  }

  const codeReady = code.length === 6;

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
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 24,
              paddingBottom: 24,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeIn.duration(350)} className="pt-3">
              <AuthBackButton onPress={router.back} />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(520).springify().damping(19)}
              className="mt-6"
            >
              <Text className="text-[32px] font-extrabold leading-[38px] tracking-[-1px] text-white">
                Check your inbox.
              </Text>

              <Text className="mt-3 text-[15px] leading-6 text-white/65">
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
              className="mt-6"
            >
              <OtpInput
                value={code}
                onChange={setCode}
                onComplete={() => {
                  void handleCodeComplete();
                }}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(540).delay(180)}
              className="mt-6"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !codeReady }}
                disabled={!codeReady}
                onPress={() => {
                  void handleVerify();
                }}
                cssInterop={false}
                style={({ pressed }) => ({
                  minHeight: 58,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 16,
                  paddingHorizontal: 20,
                  backgroundColor: codeReady
                    ? pressed
                      ? "#1673D1"
                      : "#208AEF"
                    : "rgba(32, 138, 209, 0.7)",
                  boxShadow: codeReady
                    ? "0 0 18px rgba(32, 138, 239, 0.55)"
                    : "none",

                  transform: [
                    {
                      scale: codeReady && pressed ? 0.985 : 1,
                    },
                  ],
                })}
              >
                <Text
                  className="text-[18px] font-bold tracking-[-0.2px]"
                  style={{
                    color: codeReady ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)",
                  }}
                >
                  Verify code
                </Text>
              </Pressable>
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(450).delay(280)}
              className="mt-5 items-center"
            >
              {resendSeconds > 0 ? (
                <Text className="text-[13px] text-white/45">
                  Didn't get it? Resend in{" "}
                  <Text className="font-bold text-white/70">
                    00:
                    {formatSeconds(resendSeconds)}
                  </Text>
                </Text>
              ) : (
                <Pressable
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
