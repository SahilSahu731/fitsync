import "../global.css";

import React, { useCallback, useState } from "react";

import { View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { ProgramProvider, ProgramNotificationLinks } from "@/src/features/program-follow/program-context";
import { HealthSyncBridge } from "@/src/features/health-sync/use-health-sync";
import { BillingProvider } from "@/src/features/billing/billing-context";
import { WorkoutProvider } from "@/src/features/workouts/workout-context";
import { ActiveWorkoutBar } from "@/src/features/workouts/components/active-workout-bar";

import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";

import { SessionProvider, useSession } from "@/src/context/session";

import { AppDialogProvider } from "@/src/components/app-dialog";
import { BrandReveal } from "@/src/components/brand-reveal";
import { NativeBuildRequired } from "@/src/components/native-build-required";
import { getMissingNativeModules } from "@/src/services/native-modules";
import { ExperienceProvider } from "@/src/features/experience/experience-context";
import { MotionProvider, useReducedAppMotion } from "@/src/components/motion";
import { C } from "@/src/constants/theme";

void SplashScreen.preventAutoHideAsync().catch(console.warn);

SplashScreen.setOptions({
  fade: true,
  duration: 200,
});

function Navigator() {
  const reduced = useReducedAppMotion();
  const { ready } = useSession();

  const [fontsReady, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
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
            contentStyle: {
              backgroundColor: C.bg,
            },
            animation: reduced ? "none" : "fade_from_bottom",
          }}
        />
      </SafeAreaView>

      <ProgramNotificationLinks />
      <ActiveWorkoutBar />

      {showReveal ? (
        <BrandReveal onReady={hideNativeSplash} onDone={finishReveal} />
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const [missingNativeModules] = useState(getMissingNativeModules);

  return (
    <SafeAreaProvider>
      <ExperienceProvider><MotionProvider>
      {missingNativeModules.length ? (
        <NativeBuildRequired missing={missingNativeModules} />
      ) : (
        <SessionProvider>
          <BillingProvider>
          <HealthSyncBridge />
          <AppDialogProvider>
            <WorkoutProvider>
              <ProgramProvider><Navigator /></ProgramProvider>
            </WorkoutProvider>
          </AppDialogProvider>
        </BillingProvider>
        </SessionProvider>
      )}
      </MotionProvider></ExperienceProvider>
    </SafeAreaProvider>
  );
}
