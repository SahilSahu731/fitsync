import "../../global.css";

import { Stack } from "expo-router";

import * as SplashScreen from "expo-splash-screen";

import { StatusBar } from "expo-status-bar";

import { useEffect } from "react";

import { subscribeToAuthInvalidation } from "@/features/auth/auth-events";

import { BootstrapError } from "@/features/auth/components/bootstrap-error";

import { useAuthStore } from "@/features/auth/store";

import { DatabaseProvider } from "@/lib/database/database-provider";

import { AppProvider } from "@/providers/app-provider";

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const status = useAuthStore((state) => state.status);

  const user = useAuthStore((state) => state.user);

  const bootstrap = useAuthStore((state) => state.bootstrap);

  const invalidateSession = useAuthStore((state) => state.invalidateSession);

  useEffect(() => {
    const unsubscribe = subscribeToAuthInvalidation(invalidateSession);

    void bootstrap();

    return unsubscribe;
  }, [bootstrap, invalidateSession]);

  useEffect(() => {
    if (status !== "booting") {
      SplashScreen.hide();
    }
  }, [status]);

  if (status === "booting") {
    return null;
  }

  if (status === "offline" && !user) {
    return (
      <BootstrapError
        onRetry={() => {
          void bootstrap();
        }}
      />
    );
  }

  const authenticated =  status === "authenticated" || (status === "offline" && Boolean(user));

  const needsOnboarding = authenticated && user?.onboarding_complete === false;

  const appReady = authenticated && user?.onboarding_complete === true;

  return (
    <>
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,

          contentStyle: {
            backgroundColor: "#080808",
          },
        }}
      >
        <Stack.Protected guard={!authenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={needsOnboarding}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>

        <Stack.Protected guard={appReady}>
          <Stack.Screen name="(tabs)" />

          <Stack.Screen name="exercises" />

          <Stack.Screen name="workout-templates" />

          <Stack.Screen name="workouts" />

          <Stack.Screen name="workout-history" />

          <Stack.Screen name="workout-summary" />

          <Stack.Screen name="progress" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </DatabaseProvider>
  );
}
