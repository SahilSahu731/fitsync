import { initializeTelemetry, recordError, withCrashReporting } from "@/src/services/telemetry";
import { TelemetryBridge } from "@/src/services/telemetry-bridge";
import { Txt } from "@/src/components/ui";
import type { ErrorBoundaryProps } from "expo-router";
import "../global.css";

import React, { useCallback, useEffect, useState } from "react";

import { Pressable, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  ProgramProvider,
  ProgramNotificationLinks,
} from "@/src/features/program-follow/program-context";
import { HealthSyncBridge } from "@/src/features/health-sync/use-health-sync";
import { BillingProvider } from "@/src/features/billing/billing-context";
import { TrialNotificationLinks } from "@/src/features/billing/trial-notification-links";
import { WorkoutProvider } from "@/src/features/workouts/workout-context";
import { ActiveWorkoutBar } from "@/src/features/workouts/components/active-workout-bar";
import { CompanionProvider } from "@/src/features/companion/companion-context";
import { CompanionNativeBridge } from "@/src/features/companion/native-bridge";
import { FoodReminderBridge } from "@/src/features/nutrition/reminder-bridge";

import { useFonts } from "expo-font";
import { Poppins_400Regular } from "@expo-google-fonts/poppins/400Regular";
import { Poppins_500Medium } from "@expo-google-fonts/poppins/500Medium";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins/600SemiBold";
import { Poppins_700Bold } from "@expo-google-fonts/poppins/700Bold";
import { Poppins_800ExtraBold } from "@expo-google-fonts/poppins/800ExtraBold";

import { SessionProvider, useSession } from "@/src/context/session";

import { AppDialogProvider } from "@/src/components/app-dialog";
import { BrandReveal } from "@/src/components/brand-reveal";
import { NativeBuildRequired } from "@/src/components/native-build-required";
import { getMissingNativeModules } from "@/src/services/native-modules";
import { ExperienceProvider } from "@/src/features/experience/experience-context";
import { MotionProvider, useReducedAppMotion } from "@/src/components/motion";
import { C } from "@/src/constants/theme";

void initializeTelemetry();

void SplashScreen.preventAutoHideAsync().catch(console.warn);

SplashScreen.setOptions({
  fade: true,
  duration: 200,
});

function Navigator() {
  const reduced = useReducedAppMotion();
  const { ready } = useSession();

  const [fontsReady, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  const [showReveal, setShowReveal] = useState(true);

  const hideNativeSplash = useCallback(async () => {
    await SplashScreen.hideAsync().catch(console.warn);
  }, []);

  const finishReveal = useCallback(() => {
    setShowReveal(false);
  }, []);

  if (!ready || (!fontsReady && !fontError)) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg,
        }}
      />
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.bg,
      }}
    >
      <StatusBar style="light" />

      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
            freezeOnBlur: true,
            contentStyle: {
              backgroundColor: C.bg,
            },
            animation: reduced ? "none" : "fade_from_bottom",
          }}
        />
      </SafeAreaView>

      <ProgramNotificationLinks />
      <TrialNotificationLinks />
      <CompanionNativeBridge />
      <FoodReminderBridge />
      <ActiveWorkoutBar />

      {showReveal ? <BrandReveal onReady={hideNativeSplash} onDone={finishReveal} /> : null}
    </View>
  );
}

function RootLayout() {
  const [missingNativeModules] = useState(getMissingNativeModules);

  return (
    <SafeAreaProvider>
      <TelemetryBridge />
      <ExperienceProvider>
        <MotionProvider>
          {missingNativeModules.length ? (
            <NativeBuildRequired missing={missingNativeModules} />
          ) : (
            <SessionProvider>
              <BillingProvider>
                <HealthSyncBridge />
                <AppDialogProvider>
                  <WorkoutProvider>
                    <CompanionProvider>
                      <ProgramProvider>
                        <Navigator />
                      </ProgramProvider>
                    </CompanionProvider>
                  </WorkoutProvider>
                </AppDialogProvider>
              </BillingProvider>
            </SessionProvider>
          )}
        </MotionProvider>
      </ExperienceProvider>
    </SafeAreaProvider>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    void initializeTelemetry().then(() => recordError(error, "screen_render"));
  }, [error]);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 28, justifyContent: "center" }}>
      <Txt weight="semibold" className="text-2xl">
        Let’s reopen this screen
      </Txt>
      <Txt className="mt-3 text-sm leading-6 text-muted">
        Something interrupted the screen. Your saved workout edits remain on this device.
      </Txt>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        className="mt-6 min-h-14 items-center justify-center rounded-2xl bg-brand"
      >
        <Txt weight="semibold" className="text-bg">
          Try again
        </Txt>
      </Pressable>
    </View>
  );
}
export default withCrashReporting(RootLayout);
