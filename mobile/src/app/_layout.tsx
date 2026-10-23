import "../global.css";

import React, { useCallback, useState } from "react";

import { View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { WorkoutProvider } from "@/src/features/workouts/workout-context";
import { ActiveWorkoutBar } from "@/src/features/workouts/components/active-workout-bar";

import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
} from "@expo-google-fonts/outfit";

import { SessionProvider, useSession } from "@/src/context/session";

import { AppDialogProvider } from "@/src/components/app-dialog";
import { BrandReveal } from "@/src/components/brand-reveal";
import { NativeBuildRequired } from "@/src/components/native-build-required";
import { getMissingNativeModules } from "@/src/services/native-modules";
import { C } from "@/src/constants/theme";

void SplashScreen.preventAutoHideAsync().catch(console.warn);

SplashScreen.setOptions({
  fade: true,
  duration: 200,
});

function Navigator() {
  const { ready } = useSession();

  const [fontsReady, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
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
            animation: "fade_from_bottom",
          }}
        />
      </SafeAreaView>

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
      {missingNativeModules.length ? (
        <NativeBuildRequired missing={missingNativeModules} />
      ) : (
        <SessionProvider>
          <AppDialogProvider>
            <WorkoutProvider>
              <Navigator />
            </WorkoutProvider>
          </AppDialogProvider>
        </SessionProvider>
      )}
    </SafeAreaProvider>
  );
}
