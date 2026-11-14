import type { Metadata } from "next";
import { PlanningWorkspace } from "@/components/planning-workspace";
export const metadata: Metadata = {
  title: "Training planner",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <PlanningWorkspace />;
}
