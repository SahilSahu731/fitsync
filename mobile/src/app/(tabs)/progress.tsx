import React from "react";
import { useSession } from "@/src/context/session";
import { ProgressDashboard } from "@/src/features/progress/dashboard";

export default function ProgressScreen() {
  const { user } = useSession();
  return <ProgressDashboard key={user?.id ?? "signed-out"} />;
}
