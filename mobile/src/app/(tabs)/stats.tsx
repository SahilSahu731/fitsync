import React from "react";
import { useSession } from "@/src/context/session";
import { StatsDashboard } from "@/src/features/progress/stats-dashboard";

export default function StatsScreen() {
  const { user } = useSession();
  return <StatsDashboard key={user?.id ?? "signed-out"} />;
}
