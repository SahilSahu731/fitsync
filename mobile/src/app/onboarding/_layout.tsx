
import React from "react";
import { Redirect, Stack } from "expo-router";
import { useSession } from "@/src/context/session";

export default function OnboardingLayout() {
  const { ready, user, profile } = useSession();

  if (!ready) return null;

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (profile) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false
      }}
    />
  );
}
