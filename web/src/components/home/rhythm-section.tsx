import { Check } from "lucide-react";
import { Reveal } from "@/components/motion";
import { RoutineRhythm } from "@/components/routine-rhythm";
import { GestureArrow } from "./artwork";

export function RhythmSection() {
  return (
    <section
      id="your-rhythm"
      aria-labelledby="rhythm-heading"
      className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.85fr_1.15fr] lg:gap-18 lg:px-12"
    >
      <Reveal>
        <p className="mb-5 text-[10px] font-semibold tracking-[.16em] text-brand">
          03 / A PLAN FOR YOUR ACTUAL LIFE
        </p>
        <h2
          id="rhythm-heading"
          className="text-[clamp(2.35rem,4.7vw,4rem)] leading-[1.05] tracking-[-.05em]"
        >
          Good training.
          <br />
          <span className="text-muted">Real-life ready.</span>
        </h2>
        <p className="mt-6 max-w-95 text-base leading-8 text-muted sm:text-lg">
          Your calendar is already full. Find a rhythm that gives your goals a little room, with
          space for the rest of life.
        </p>
        <div className="mt-7 space-y-4">
          {[
            "Choose a program around your available days.",
            "Preview the sessions before you commit.",
            "Make recovery part of the rhythm.",
          ].map((text) => (
            <p key={text} className="flex items-start gap-3 text-sm leading-6">
              <Check size={16} className="mt-1 text-brand" />
              {text}
            </p>
          ))}
        </div>
        <GestureArrow className="mt-6 ml-auto hidden w-30 -rotate-15 text-brand/60 lg:block" />
      </Reveal>
      <Reveal delay={80}>
        <RoutineRhythm />
      </Reveal>
    </section>
  );
}
