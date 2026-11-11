import type { Metadata } from "next";
import { Activity, Dumbbell, SlidersHorizontal } from "lucide-react";
import { PublicShell } from "@/components/shell";
import { AccessGate } from "@/components/session";
import { ExerciseLibrary } from "@/components/exercise-library";
import { Reveal } from "@/components/motion";
import { container } from "@/components/marketing/shared";
export const metadata: Metadata = {
  title: "Exercise library",
  description:
    "Learn exercise technique, explore visual demonstrations and find movements by muscle, equipment and experience in FitSync.",
};
export default function Page() {
  return (
    <PublicShell>
      <main id="main" className={`${container} py-16 sm:py-24`}>
        <Reveal>
          <p className="text-xs tracking-[.12em] text-white/55 uppercase">The exercise library</p>
          <h1 className="mt-6 max-w-4xl text-[clamp(3rem,6.5vw,6rem)] leading-[1.04] font-medium tracking-[-.06em]">
            Know the movement.
            <br />
            <span className="text-white/50">Make it yours.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-white/55">
            Find the exercise that fits your body, your equipment and your experience. Learn the
            technique before your first rep.
          </p>
        </Reveal>
        <div className="mt-14 mb-16 grid gap-8 sm:grid-cols-3">
          {[
            {
              icon: Activity,
              title: "Learn the technique",
              text: "Clear instructions and visual demonstrations.",
            },
            {
              icon: SlidersHorizontal,
              title: "Find your fit",
              text: "Filter by muscle, equipment and experience.",
            },
            {
              icon: Dumbbell,
              title: "Take it into your session",
              text: "The same exercise library across web and mobile.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon size={25} strokeWidth={1.2} className="text-white/50" />
              <h2 className="mt-5 text-base font-medium">{title}</h2>
              <p className="mt-3 max-w-xs text-sm leading-7 text-white/55">{text}</p>
            </div>
          ))}
        </div>
        <div className="rounded-3xl bg-surface p-5 sm:p-8">
          <AccessGate>
            <ExerciseLibrary />
          </AccessGate>
        </div>
      </main>
    </PublicShell>
  );
}
