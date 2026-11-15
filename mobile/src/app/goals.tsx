import React from "react";
import { Redirect } from "expo-router";
import { useSession } from "@/src/context/session";
import { GoalSetup } from "@/src/features/progress/goal-setup";
export default function GoalsScreen() {
  const { ready, user, profile } = useSession();
  if (!ready) return null;
  if (!user) return <Redirect href="/(auth)/sign-in" />;
  if (!profile) return <Redirect href="/onboarding" />;
  return <GoalSetup key={user.id} />;
}
