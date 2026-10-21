
import React, { useState } from "react";
import { Redirect, Stack } from "expo-router";
import { useSession } from "@/src/context/session";

export default function OnboardingLayout() {
  const { ready, user, profile } = useSession();
  // An existing profile skips setup. A profile created during this visit
  // stays here until the user leaves the completion animation.
  const [hadProfileOnEntry] = useState(() => !!profile);

  if (!ready) return null;

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (hadProfileOnEntry && profile) {
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
