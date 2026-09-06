import "../../global.css";

import { Stack } from "expo-router";

import * as SplashScreen from "expo-splash-screen";

import { StatusBar } from "expo-status-bar";

import { useEffect } from "react";

import { subscribeToAuthInvalidation } from "@/features/auth/auth-events";

import { BootstrapError } from "@/features/auth/components/bootstrap-error";

import { useAuthStore } from "@/features/auth/store";

import { AppProvider } from "@/providers/app-provider";

/*
 * Expo recommends calling this in
 * module/global scope so it cannot
 * happen after the splash has already
 * auto-hidden.
 */
void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const status = useAuthStore((state) => state.status);

  const bootstrap = useAuthStore((state) => state.bootstrap);

  const invalidateSession = useAuthStore((state) => state.invalidateSession);

  useEffect(() => {
    /*
     * Axios can invalidate authentication
     * if refresh credentials are rejected.
     */
    const unsubscribe = subscribeToAuthInvalidation(invalidateSession);

    void bootstrap();

    return unsubscribe;
  }, [bootstrap, invalidateSession]);

  useEffect(() => {
    if (status !== "booting") {
      /*
       * hideAsync() is legacy-compatible.
       * hide() is the current API.
       */
      SplashScreen.hide();
    }
  }, [status]);

  if (status === "booting") {
    return null;
  }

  if (status === "offline") {
    return (
      <BootstrapError
        onRetry={() => {
          void bootstrap();
        }}
      />
    );
  }

  const authenticated = status === "authenticated";

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

        <Stack.Protected guard={authenticated}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootNavigator />
    </AppProvider>
  );
}
