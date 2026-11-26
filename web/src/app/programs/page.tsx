import type { Metadata } from "next";
import { PublicShell } from "@/components/shell";
import { TrainingLibrary } from "@/components/training-library";
import { container } from "@/components/marketing/shared";
export const metadata: Metadata = {
  title: "Training library",
  description:
    "Browse training by goal, level and equipment. Save a routine for free, or follow a full program with FitSync Pro on Android.",
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
