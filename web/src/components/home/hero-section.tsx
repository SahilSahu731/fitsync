"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  Apple,
  ArrowDown,
  ArrowRight,
  BicepsFlexed,
  CalendarDays,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Moon,
  Pause,
  Play,
  Smartphone,
  SquareActivity,
  Timer,
  TrendingUp,
  Trophy,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { DownloadDialog } from "./download-dialog";
import { heroContent } from "./content";

function Marquee({
  children,
  reverse = false,
  slow = false,
  paused,
  className = "",
}: {
  children: ReactNode;
  reverse?: boolean;
  slow?: boolean;
  paused: boolean;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        className={`flex w-max animate-home-marquee motion-reduce:animate-none ${reverse ? "[animation-direction:reverse]" : ""} ${slow ? "[animation-duration:80s]" : ""} ${paused ? "[animation-play-state:paused]" : ""}`}
      >
        <div className="flex shrink-0 items-center">{children}</div>
        <div aria-hidden="true" className="flex shrink-0 items-center">
          {children}
        </div>
      </div>
    </div>
  );
}

type Scatter = {
  kind: "pill" | "dot";
  icon: LucideIcon;
  label: string;
  value?: string;
  detail?: string;
  pos: string;
  show: string;
  angle?: string;
  beat?: boolean;
  depth?: number;
};
const scatter: Scatter[] = [
  /* pills (wide screens) */
  {
    kind: "pill",
    icon: Heart,
    value: "72 bpm",
    label: "Heart rate",
    detail: "Resting · sample data",
    pos: "top-[20%] left-[3%]",
    show: "hidden xl:block",
    angle: "-4deg",
    beat: true,
    depth: 18,
  },
  {
    kind: "pill",
    icon: Dumbbell,
    value: "Workout done",
    label: "One session stronger",
    detail: "9 of 9 sets logged",
    pos: "top-[44%] left-[2%]",
    show: "hidden xl:block",
    angle: "3deg",
    depth: 26,
  },
  {
    kind: "pill",
    icon: Footprints,
    value: "8,420 steps",
    label: "Daily movement",
    detail: "84% of today's goal",
    pos: "top-[68%] left-[4%]",
    show: "hidden xl:block",
    angle: "-3deg",
    depth: 16,
  },
  {
    kind: "pill",
    icon: CalendarDays,
    value: "Weekly plan",
    label: "Training with direction",
    detail: "4 sessions this week",
    pos: "top-[19%] right-[3%]",
    show: "hidden xl:block",
    angle: "4deg",
    depth: 20,
  },
  {
    kind: "pill",
    icon: Apple,
    value: "1,860 kcal",
    label: "Nutrition",
    detail: "126 g protein logged",
    pos: "top-[43%] right-[2%]",
    show: "hidden xl:block",
    angle: "-3deg",
    depth: 24,
  },
  {
    kind: "pill",
    icon: Moon,
    value: "7h 20m sleep",
    label: "Recovery",
    detail: "Deep sleep 1h 45m",
    pos: "top-[67%] right-[4%]",
    show: "hidden xl:block",
    angle: "3deg",
    depth: 14,
  },
  {
    kind: "pill",
    icon: Flame,
    value: "12-day streak",
    label: "Consistency",
    detail: "Keep it going today",
    pos: "top-[84%] left-[24%]",
    show: "hidden xl:block",
    angle: "-3deg",
    depth: 22,
  },
  {
    kind: "pill",
    icon: Droplets,
    value: "1.8 L water",
    label: "Hydration",
    detail: "Goal: 2.5 L",
    pos: "top-[85%] right-[23%]",
    show: "hidden xl:block",
    angle: "3deg",
    depth: 20,
  },

  /* small round chips */
  {
    kind: "dot",
    icon: Trophy,
    label: "Win",
    pos: "left-[14%] top-[33%]",
    show: "hidden md:block",
    angle: "6deg",
    depth: 32,
  },
  {
    kind: "dot",
    icon: Activity,
    label: "Move",
    pos: "right-[14%] top-[34%]",
    show: "hidden md:block",
    angle: "-6deg",
    depth: 30,
  },
  {
    kind: "dot",
    icon: Dumbbell,
    label: "Train",
    pos: "left-[7%] top-[10%]",
    show: "block",
    angle: "-6deg",
    depth: 18,
  },
  {
    kind: "dot",
    icon: Apple,
    label: "Eat",
    pos: "right-[8%] top-[11%]",
    show: "block",
    angle: "6deg",
    depth: 18,
  },
  {
    kind: "dot",
    icon: Timer,
    label: "Rest",
    pos: "left-[8%] top-[91%]",
    show: "block",
    angle: "5deg",
    depth: 16,
  },
  {
    kind: "dot",
    icon: Heart,
    label: "Health",
    pos: "right-[9%] top-[90%]",
    show: "block",
    angle: "-5deg",
    depth: 16,
  },
];

const angles = [
  "-rotate-4",
  "rotate-3",
  "-rotate-3",
  "rotate-4",
  "-rotate-3",
  "rotate-3",
  "-rotate-3",
  "rotate-3",
  "rotate-6",
  "-rotate-6",
  "-rotate-6",
  "rotate-6",
  "rotate-5",
  "-rotate-5",
];
const phases = [
  "[animation-delay:-1s]",
  "[animation-delay:-3s]",
  "[animation-delay:-5s]",
  "[animation-delay:-7s]",
];

export function HeroSection() {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  return (
    <>
      <section
        aria-labelledby="hero-heading"
        className="relative isolate flex min-h-[850px] flex-col items-center justify-center overflow-hidden bg-black px-6 pb-24 text-center text-white sm:min-h-[950px] lg:min-h-[calc(100svh-5rem)]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.12)_1px,transparent_1px)] bg-size-[32px_32px] opacity-40 mask-[radial-gradient(ellipse_80%_70%_at_50%_50%,black,transparent)]" />
          <div className="absolute inset-0 bg-radial from-white/5 via-transparent to-transparent" />
          <Marquee paused={paused} slow className="absolute inset-x-0 top-[5%]">
            <span className="pr-16 text-[clamp(5rem,13vw,11rem)] leading-none font-semibold tracking-[-.04em] whitespace-nowrap text-transparent [-webkit-text-stroke:1px_#ffffff25]">
              Train · Eat · Recover · Repeat ·{" "}
            </span>
          </Marquee>
          <Marquee paused={paused} slow reverse className="absolute inset-x-0 bottom-[6%]">
            <span className="pr-16 text-[clamp(5rem,13vw,11rem)] leading-none font-semibold tracking-[-.04em] whitespace-nowrap text-transparent [-webkit-text-stroke:1px_#ffffff25]">
              Plan · Track · Progress ·{" "}
            </span>
          </Marquee>
        </div>
        <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-300 flex-col items-center">
          <Link
            href="/features"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs text-white/75 backdrop-blur-md transition-colors hover:bg-white hover:text-black sm:text-sm"
          >
            <SquareActivity size={15} />
            Fitness, all in one place
            <ArrowRight size={14} />
          </Link>
          <h1
            id="hero-heading"
            className="mt-6 text-[clamp(2.5rem,12vw,6rem)] sm:text-[clamp(4rem,8.3vw,6rem)] leading-[.98] font-semibold tracking-[-.06em] text-balance"
          >
            <span className="block overflow-hidden pb-[.1em]">
              <span className="block animate-hero-line [animation-delay:100ms] motion-reduce:animate-none">
                Fitness is more
              </span>
            </span>
            <span className="block overflow-hidden pb-[.1em]">
              <span className="block animate-hero-line [animation-delay:250ms] motion-reduce:animate-none">
                than just
              </span>
            </span>
            <span className="block overflow-hidden pb-[.1em]">
              <span className="pointer-events-auto block animate-hero-line text-transparent transition-colors duration-500 [-webkit-text-stroke:1.5px_white] [animation-delay:400ms] hover:text-white motion-reduce:animate-none">
                a workout.
              </span>
            </span>
          </h1>
          <p className="mx-auto mt-7 max-w-135 animate-hero-line text-base leading-7 text-white/55 [animation-delay:550ms] motion-reduce:animate-none sm:leading-8">
            {heroContent.description}
          </p>
          <div className="mt-9 flex w-full animate-hero-line flex-col items-center justify-center gap-3 [animation-delay:700ms] motion-reduce:animate-none sm:w-auto sm:flex-row">
            <Link
              href={heroContent.primary.href}
              className="group pointer-events-auto inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-xl bg-brand px-7 text-sm font-semibold text-black transition duration-300 hover:-translate-y-0.5 hover:bg-brand-hover motion-reduce:transform-none sm:w-auto"
            >
              <BicepsFlexed size={21} />
              Join FitSync free
              <ArrowRight
                size={17}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
            <button
              onClick={() => setDownloadOpen(true)}
              aria-haspopup="dialog"
              className="pointer-events-auto inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-xl bg-white/8 px-7 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white hover:text-black sm:w-auto"
            >
              <Smartphone size={21} />
              Get the mobile app
            </button>
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {scatter.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`absolute animate-quiet-float motion-reduce:animate-none ${item.show} ${item.pos} ${phases[index % phases.length]} ${paused ? "[animation-play-state:paused]" : ""}`}
              >
                <div
                  className={`pointer-events-auto transition-transform duration-500 hover:scale-110 motion-reduce:transform-none ${angles[index]}`}
                >
                  <div
                    className={`group flex items-center rounded-2xl bg-black/45 text-white backdrop-blur-md transition-colors duration-300 hover:bg-white hover:text-black ${item.kind === "pill" ? "gap-3 px-3 py-2.5 text-left" : "size-12 justify-center rounded-full"}`}
                  >
                    <Icon size={22} strokeWidth={1.7} />
                    {item.kind === "pill" && (
                      <span>
                        <span className="block whitespace-nowrap text-sm font-semibold">
                          {item.value}
                        </span>
                        <span className="block whitespace-nowrap text-[11px]">{item.label}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <a
          href="#demo"
          className="absolute bottom-7 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 py-2 text-xs text-white/50 transition-colors hover:text-white"
        >
          Explore FitSync
          <ArrowDown size={15} />
        </a>
        <button
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
          aria-label={paused ? "Resume hero animations" : "Pause hero animations"}
          className="absolute right-6 bottom-7 flex size-9 items-center justify-center rounded-full bg-white/5 text-white/50 hover:text-white"
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
      </section>
      <div className="bg-black py-6 text-white/55">
        <Marquee paused={paused}>
          {[
            { icon: Dumbbell, label: "Workout logging" },
            { icon: UtensilsCrossed, label: "Nutrition" },
            { icon: Footprints, label: "Daily steps" },
            { icon: Droplets, label: "Hydration" },
            { icon: Moon, label: "Recovery" },
            { icon: TrendingUp, label: "Progress" },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="mx-8 flex items-center gap-3 text-base font-medium sm:mx-12 sm:text-xl"
            >
              <Icon size={23} strokeWidth={1.5} />
              {label}
              <span className="ml-12 size-1 rounded-full bg-white/30" />
            </span>
          ))}
        </Marquee>
      </div>
      {downloadOpen && <DownloadDialog onClose={() => setDownloadOpen(false)} />}
    </>
  );
}
