import React, { useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable, ScreenEntrance } from "@/src/components/motion";
import { useAppAlert } from "@/src/components/app-dialog";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useSession } from "@/src/context/session";

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
      await signInGoogle();
    } catch (error) {
      Alert.alert(
        "Couldn’t sign you in",
        error instanceof Error ? error.message : "Check your connection and try again.",
      );
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }
  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-bg">
      <ScreenEntrance className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="min-h-full w-full max-w-xl flex-grow self-center px-7 pt-7 pb-6"
        >
          <View className="flex-row items-center gap-2">
            <Image
              source={require("../../../assets/images/splash-icon.png")}
              className="h-9 w-9"
              resizeMode="contain"
              accessible={false}
            />
            <Txt weight="semibold" className="text-2xl tracking-[-1px]">
              FitSync<Txt className="text-brand">.</Txt>
            </Txt>
          </View>
          <View className="min-h-[430px] flex-1 justify-center py-14">
            <View className="mb-9 flex-row items-center gap-2">
              <View className="h-1.5 w-1.5 rounded-full bg-brand" />
              <Txt className="text-[11px] tracking-[1.5px] text-muted">
                EVERY PART OF YOUR EVERYDAY
              </Txt>
            </View>
            <Txt weight="medium" className="text-[48px] leading-[55px] tracking-[-2px]">
              A little more{"\n"}in sync.
            </Txt>
            <Txt className="mt-6 max-w-xs text-base leading-7 text-muted">
              Your workouts. Your habits. Your progress. One place for everything that moves you
              forward.
            </Txt>
            <View className="mt-10 flex-row flex-wrap gap-x-5 gap-y-4">
              {[
                { icon: "dumbbell" as const, label: "Train" },
                { icon: "heart-outline" as const, label: "Track" },
                { icon: "chart-line" as const, label: "Progress" },
              ].map((item) => (
                <View key={item.label} className="flex-row items-center gap-2">
                  <MaterialCommunityIcons name={item.icon} size={18} color={C.muted} />
                  <Txt className="text-xs text-muted">{item.label}</Txt>
                </View>
              ))}
            </View>
          </View>
          <View className="pb-4">
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              accessibilityState={{ disabled: loading, busy: loading }}
              disabled={loading}
              onPress={login}
              className={`min-h-14 flex-row items-center justify-center gap-3 rounded-full px-5 py-4 ${loading ? "bg-white/80" : "bg-ink"}`}
            >
              {loading ? (
                <ActivityIndicator color={C.bg} />
              ) : (
                <Image
                  source={require("../../../assets/images/google.png")}
                  className="h-6 w-6"
                  accessible={false}
                />
              )}
              <Txt weight="semibold" className="text-sm text-black">
                {loading ? "Signing you in…" : "Continue with Google"}
              </Txt>
            </MotionPressable>
            <Txt className="mt-5 text-center text-xs leading-6 text-muted">
              One account. Your whole journey.
            </Txt>
          </View>
        </ScrollView>
      </ScreenEntrance>
    </SafeAreaView>
  );
}
