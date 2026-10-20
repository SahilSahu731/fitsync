
import React from "react";
import { Redirect } from "expo-router";
import { useSession } from "@/src/context/session";

export default function Index() {
  const { ready, user, profile } = useSession();

  if (!ready) return null;

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
