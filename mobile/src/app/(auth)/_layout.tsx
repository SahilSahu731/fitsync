
import React from "react";
import { Redirect, Stack } from "expo-router";
import { useSession } from "@/src/context/session";

export default function AuthLayout() {
  const { ready, user, profile } = useSession();

  if (!ready) return null;

  if (user) {
    return (
      <Redirect
        href={profile ? "/(tabs)" : "/onboarding"}
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false
      }}
    />
  );
}
