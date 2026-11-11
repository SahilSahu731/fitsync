
import { ArrowDownRight, ArrowUpRight, Check, MousePointer2, Play, Activity, Dumbbell, ChartNoAxesColumnIncreasing } from "lucide-react";
import { Reveal } from "@/components/motion";
import { WorkoutPreview } from "./workout-preview";

const steps = [
  {
    number: "01",
    title: "Choose your session",
    description: "Pick a workout that fits your day.",
    icon: Dumbbell,
  },
  {
    number: "02",
    title: "Make every set count",
    description: "Track the work without breaking focus.",
    icon: Check,
  },
  {
    number: "03",
    title: "See yourself progress",
    description: "A clearer picture of the effort you put in.",
    icon: ChartNoAxesColumnIncreasing,
  },
];

function OrbitIllustration() {
  return (
    <svg
      viewBox="0 0 700 740"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* The rings create visual depth behind the app. */}
      <circle
        cx="350"
        cy="355"
        r="265"
        stroke="white"
        strokeOpacity=".065"
      />
      <circle
        cx="350"
        cy="355"
        r="214"
        stroke="white"
        strokeOpacity=".075"
        strokeDasharray="3 9"
      />
      <circle
        cx="350"
        cy="355"
        r="163"
        stroke="white"
        strokeOpacity=".055"
      />

      {/* A little technical geometry, not a giant decoration. */}
      <path
        d="M36 355H664M350 30V680"
        stroke="white"
        strokeOpacity=".035"
        strokeDasharray="4 9"
      />
      <path
        d="M90 170H190L223 203"
        stroke="white"
        strokeOpacity=".16"
      />
      <path
        d="M477 537L515 575H632"
        stroke="white"
        strokeOpacity=".16"
      />

      <circle cx="90" cy="170" r="3" fill="white" fillOpacity=".5" />
      <circle cx="632" cy="575" r="3" fill="white" fillOpacity=".5" />
      <circle cx="350" cy="90" r="4" fill="white" fillOpacity=".25" />
      <circle cx="350" cy="620" r="4" fill="white" fillOpacity=".25" />

      <path
        d="M345 90H355M350 85V95M345 620H355M350 615V625"
        stroke="white"
        strokeOpacity=".35"
      />
    </svg>
  );
}

function DetailCard({
  number,
  title,
  description,
  className = "",
}: {
  number: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute z-20 w-43 rounded-xl border border-white/15 bg-[#151515]/95 p-3.5 shadow-2xl backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-white/40">
          {number} / 03
        </span>
        <ArrowUpRight size={13} className="text-white/35" />
      </div>

      <p className="mt-4 text-[13px] font-medium tracking-tight text-white">
        {title}
      </p>

      <p className="mt-1 text-[11px] leading-4 text-white/45">
        {description}
      </p>
    </div>
  );
}

export function AppPreviewSection() {
  return (
    <section
      id="app-preview"
      aria-labelledby="preview-heading"
      className="relative isolate overflow-hidden border-b border-white/10 bg-[#080808] text-white"
    >
      {/* Minimal top rule */}
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

      <div className="mx-auto max-w-7xl px-5 py-22 sm:px-8 sm:py-28 lg:px-12 lg:py-34">
        {/* INTRO */}
        <div className="grid items-end gap-8 lg:grid-cols-[1.15fr_.85fr] lg:gap-16">
          <Reveal>
            <div className="mb-7 flex items-center gap-3">
              <span className="h-px w-7 bg-white/50" />
              <span className="text-[10px] font-medium tracking-[.22em] text-white/50">
                THE EXPERIENCE / 02
              </span>
            </div>

            <h2
              id="preview-heading"
              className="max-w-170 text-[clamp(3.2rem,7vw,7rem)] leading-[.95] font-medium tracking-[-.075em]"
            >
              Less thinking.
              <br />
              <span className="text-white/35">More doing.</span>
            </h2>
          </Reveal>

          <Reveal delay={100} className="lg:pb-2">
            <p className="max-w-106 text-base leading-8 text-white/55 sm:text-lg">
              The best workout is the one you actually finish.
              Pick a session, track your sets, and stay in your flow.
            </p>

            <a
              href="#interactive-workout"
              className="group mt-7 inline-flex items-center gap-3 rounded-full bg-brand px-6 py-3.5 text-sm font-semibold text-black transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <Play size={15} fill="currentColor" />
              Try the experience
              <ArrowUpRight
                size={17}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          </Reveal>
        </div>

        {/* MAIN SHOWCASE */}
        <Reveal delay={140}>
          <div
            id="interactive-workout"
            className="relative mt-16 overflow-hidden rounded-[28px] border border-white/12 bg-[#101010] sm:mt-20"
          >
            {/* Dot grid */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-35"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255,255,255,.13) .75px, transparent .75px)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* Top gradient and vignette */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_10%,#101010_80%)]" />

            {/* Showcase header */}
            <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-5 sm:px-8">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg border border-white/15 bg-white/5">
                  <Activity size={15} />
                </span>
                <span className="text-[11px] font-semibold tracking-[-.01em]">
                  FitSync
                  <span className="ml-2 font-normal text-white/40">
                    / Training
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2 text-[10px] tracking-[.12em] text-white/50">
                <span className="size-1.5 rounded-full bg-white" />
                INTERACTIVE EXPERIENCE
              </div>
            </div>

            {/* App illustration and demo */}
            <div className="relative flex min-h-[680px] flex-col items-center justify-center px-4 py-14 sm:min-h-[760px] sm:py-16">
              <OrbitIllustration />

              {/* Left floating annotation */}
              <DetailCard
                number="01"
                title="Find your workout"
                description="Different sessions. One simple place."
                className="top-[18%] left-[4%] hidden lg:block"
              />

              {/* Right floating annotation */}
              <DetailCard
                number="02"
                title="Stay in your flow"
                description="One tap to complete a set."
                className="top-[40%] right-[4%] hidden lg:block"
              />

              {/* Small bottom annotation */}
              <div className="pointer-events-none absolute bottom-[12%] left-[6%] z-20 hidden items-center gap-3 xl:flex">
                <span className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/5">
                  <Check size={16} />
                </span>
                <div>
                  <p className="text-xs font-medium text-white/85">
                    Small wins add up.
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/40">
                    Every completed set matters.
                  </p>
                </div>
              </div>

              {/* The actual interactive product */}
              <div className="relative z-10 mx-auto w-full max-w-[310px] transition-transform duration-700 ease-out motion-safe:hover:-translate-y-1">
                <WorkoutPreview />
              </div>

              <div className="relative z-10 mt-8 flex items-center gap-2 rounded-full border border-white/10 bg-[#171717] px-4 py-2 text-[11px] text-white/50">
                <MousePointer2 size={12} />
                Tap a session or a set to explore
              </div>
            </div>

            {/* Showcase footer */}
            <div className="relative z-20 flex flex-col justify-between gap-3 border-t border-white/10 px-5 py-4 text-[10px] text-white/40 sm:flex-row sm:items-center sm:px-8">
              <span>FITNESS, WITHOUT THE FRICTION.</span>
              <span>Interactive illustration · Example data only</span>
            </div>
          </div>
        </Reveal>

        {/* BENEFITS */}
        <div className="mt-18 border-t border-white/12 sm:mt-24">
          <div className="grid gap-0 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <Reveal
                  key={step.number}
                  delay={index * 90}
                  className={`border-b border-white/10 py-8 md:border-b-0 md:py-10 ${
                    index > 0
                      ? "md:border-l md:border-white/10 md:pl-8 lg:pl-10"
                      : "md:pr-8 lg:pr-10"
                  }`}
                >
                  <div className="group">
                    <div className="mb-9 flex items-center justify-between">
                      <span className="font-mono text-xs text-white/35">
                        {step.number}
                      </span>
                      <span className="flex size-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.03] transition-colors duration-300 group-hover:border-white/30 group-hover:bg-white/10">
                        <Icon size={18} strokeWidth={1.6} />
                      </span>
                    </div>

                    <h3 className="text-[19px] font-medium tracking-[-.035em]">
                      {step.title}
                    </h3>

                    <p className="mt-2 max-w-60 text-sm leading-6 text-white/45">
                      {step.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>

        {/* Bottom editorial note */}
        <Reveal>
          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-sm leading-6 text-white/40">
              No complicated setup to explore. Try the sample workout,
              interact with the sets, and see how it works.
            </p>

            <a
              href="#interactive-workout"
              className="group inline-flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-white/60"
            >
              Explore the demo
              <ArrowDownRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5"
              />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
