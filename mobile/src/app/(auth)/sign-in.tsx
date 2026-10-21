import { useAppAlert } from "@/src/components/app-dialog";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";

// Lets LinearGradient accept className (NativeWind v4). Safe to remove if already registered globally.
cssInterop(LinearGradient, { className: "style" });

export default function SignInScreen() {
  const Alert = useAppAlert();
  const { signInGoogle } = useSession();
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  async function login() {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      // The auth layout routes to onboarding or home after session creation.
      await signInGoogle();
    } catch (error) {
      Alert.alert(
        "Couldn't sign you in",
        error instanceof Error
          ? error.message
          : "Check your connection and try again.",
      );
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-[#101011]">
      <ImageBackground
        source={require("../../../assets/images/sign-in-gym.png")}
        resizeMode="cover"
        className="absolute inset-0"
        accessible={false}
      />
      <LinearGradient
        colors={[
          "rgba(16,16,17,0.6)",
          "rgba(16,16,17,0.1)",
          "rgba(16,16,17,0.9)",
          C.bg,
        ]}
        locations={[0, 0.3, 0.68, 0.9]}
        className="absolute inset-0"
      />

      <View className="flex-1 justify-between px-7 pb-10 pt-12">
        <View className="flex-row items-center gap-2">
          <Image
            source={require("../../../assets/images/splash-icon.png")}
            className="h-8 w-8"
            accessible={false}
          />
          <Txt weight="bold" className="text-2xl tracking-tight text-white">
            FitSync
          </Txt>
        </View>

        <View>
          <Txt
            accessibilityRole="header"
            weight="bold"
            className="text-5xl leading-[52px] tracking-tighter text-white"
          >
            Find your{"\n"}kind of strong.
          </Txt>
          <Txt className="mt-4 max-w-[300px] text-base leading-6 text-white/60">
            Log workouts, track progress, and train with your gym buddies.
          </Txt>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            accessibilityState={{ disabled: loading, busy: loading }}
            disabled={loading}
            onPress={login}
            className={`mt-8 min-h-[56px] flex-row items-center justify-center gap-3 rounded-full border border-white active:scale-[0.98] active:bg-[#DEDEDB] ${loading ? "bg-[#DEDEDB]" : "bg-ink"}`}
          >
            {loading ? (
              <ActivityIndicator color={C.bg} />
            ) : (
              <Image
                source={require("../../../assets/images/google.png")}
                className="h-8 w-8"
                accessible={false}
              />
            )}
            <Txt weight="semibold" className="text-lg text-bg">
              {loading ? "Signing you in…" : "Continue with Google"}
            </Txt>
          </Pressable>

          <Txt className="mt-4 text-center text-sm text-white/40">
            By continuing, you agree to our Terms and Privacy Policy.
          </Txt>
        </View>
      </View>
    </View>
  );
}
