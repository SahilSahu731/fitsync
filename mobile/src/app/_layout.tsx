
import "../global.css";

import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import { View } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView
} from "react-native-safe-area-context";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold
} from "@expo-google-fonts/outfit";

import {
  SessionProvider,
  useSession
} from "@/src/context/session";

import { BrandReveal } from "@/src/components/brand-reveal";
import { C } from "@/src/constants/theme";

SplashScreen.preventAutoHideAsync();

SplashScreen.setOptions({
  fade: true,
  duration: 250
});

function Navigator() {
  const { ready } = useSession();

  const [fontsReady] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold
  });

  const [showReveal, setShowReveal] = useState(true);

  useEffect(() => {
    if (ready && fontsReady) {
      SplashScreen.hideAsync();
    }
  }, [ready, fontsReady]);

  const finishReveal = useCallback(() => {
    setShowReveal(false);
  }, []);

  if (!ready || !fontsReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.bg
        }}
      />
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={{
        flex: 1,
        backgroundColor: C.bg
      }}
    >
      <StatusBar style="light" backgroundColor={C.bg} />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: C.bg
          },
          animation: "fade_from_bottom"
        }}
      />

      {showReveal ? (
        <BrandReveal onDone={finishReveal} />
      ) : null}
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <Navigator />
      </SessionProvider>
    </SafeAreaProvider>
  );
}
