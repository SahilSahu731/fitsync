import type { Metadata } from "next";
import { PublicShell } from "@/components/shell";
import { TrainingLibrary } from "@/components/training-library";
import { container } from "@/components/marketing/shared";
export const metadata: Metadata = {
  title: "Training library",
  description:
    "Find a FitSync training program or routine for your goals, equipment and schedule. Preview your plan and save it for the mobile app.",
};
export default function Page() {
  return (
    <PublicShell>
      <main id="main" className={`${container} pb-16`}>
        <TrainingLibrary />
      </main>
    </PublicShell>
  );
}
