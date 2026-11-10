import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Dumbbell,
  MoveUpRight,
  RefreshCw,
  Smartphone,
  ScanLine,
} from "lucide-react";
import { PublicShell } from "@/components/shell";
import { DumbbellScene } from "@/components/dumbbell-scene";
import { TrainingPicker } from "@/components/training-picker";
import { TrainingSketch } from "@/components/training-sketch";

export default function Home() {
  return (
    <PublicShell>
      <main id="main">
        <section className="mx-auto grid max-w-7xl gap-10 px-5 pt-12 pb-14 sm:px-8 sm:pt-16 sm:pb-18 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16 lg:px-12 lg:py-20">
          <div className="py-2 lg:py-4">
            <p className="mb-7 flex items-center gap-2.5 text-xs font-semibold tracking-[0.14em]">
              <span className="size-2 rounded-full bg-brand ring-4 ring-brand/20" />
              YOUR FITNESS. IN SYNC.
            </p>
            <h1 className="text-[clamp(3.25rem,16vw,3.75rem)] leading-[1.02] font-semibold tracking-[-3px] sm:text-[76px] sm:tracking-[-4px] lg:text-[82px] xl:text-[88px]">
              Your next
              <br />
              move starts
              <br />
              here<span className="text-brand">.</span>
            </h1>
            <p className="mt-7 max-w-100 text-lg leading-7 text-muted sm:text-xl sm:leading-8">
              Less guesswork. More good movement. Find your training, build your
              routine, and make it part of your life.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Link
                href="/programs"
                className="group inline-flex min-h-14 items-center justify-center gap-5 rounded-md bg-ink px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-ink/80"
              >
                Find your training{" "}
                <ArrowRight
                  size={20}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="/exercises"
                className="inline-flex min-h-12 items-center gap-2 border-b border-ink text-base font-medium"
              >
                Explore exercises <ArrowUpRight size={18} />
              </Link>
            </div>
            <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted">
              <Check size={16} />
              Free to get started. Ready when you are.
            </p>
          </div>
          <DumbbellScene />
          <div className="flex items-center justify-between border-t border-line pt-6 lg:col-span-2">
            <p className="text-sm text-muted">
              For the first rep. And the one after that.
            </p>
            <a
              href="#possibilities"
              aria-label="Discover what you can do with FitSync"
              className="flex items-center gap-3 text-xs font-medium tracking-wide text-muted hover:text-ink"
            >
              <span className="hidden sm:inline">KEEP MOVING</span>
              <ArrowDown size={18} />
            </a>
          </div>
        </section>

        <section
          id="possibilities"
          className="scroll-mt-20 bg-ink text-white"
          aria-label="A more connected way to train"
        >
          <div className="mx-auto grid max-w-7xl divide-y divide-white/20 px-5 py-3 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0 md:py-10 lg:px-12">
            {[
              {
                icon: Dumbbell,
                title: "Find your focus.",
                text: "Exercises and programs, all in one place.",
              },
              {
                icon: ScanLine,
                title: "Learn the movement.",
                text: "Clear guides. More confident sessions.",
              },
              {
                icon: RefreshCw,
                title: "Keep it in sync.",
                text: "One profile, from web to mobile.",
              },
            ].map(({ icon: ItemIcon, title, text }, index) => (
              <div
                key={title}
                className={`flex items-start gap-4 py-7 md:py-1 ${index > 0 ? "md:pl-7 lg:pl-10" : ""} md:pr-5`}
              >
                <ItemIcon
                  size={26}
                  strokeWidth={1.5}
                  className="mt-1 text-brand"
                />
                <div>
                  <h2 className="text-xl font-medium tracking-[-0.5px]">
                    {title}
                  </h2>
                  <p className="mt-2 max-w-60 text-sm leading-relaxed text-white/55">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <TrainingPicker />

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-12 lg:py-24">
            <div className="relative order-2 lg:order-1">
              <div className="absolute top-0 left-0 flex items-center gap-2 text-xs font-medium text-muted">
                <span className="size-1.5 rounded-full bg-ink" />
                NO FINISH LINE. JUST YOUR NEXT STEP.
              </div>
              <TrainingSketch kind="bodyweight" className="w-full text-ink" />
              <svg
                viewBox="0 0 180 70"
                fill="none"
                className="absolute right-0 bottom-0 w-36 -rotate-6 text-ink"
                aria-hidden="true"
              >
                <path
                  d="M9 40c50-36 106-31 149-8m-17-14 21 16-27 7M19 48c36-15 74-22 111-15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="order-1 lg:order-2">
              <p className="mb-4 text-xs font-semibold tracking-[0.15em] text-muted">
                A ROUTINE THAT FEELS LIKE YOU
              </p>
              <h2 className="text-[38px] leading-[1.1] tracking-[-1.5px] sm:text-5xl lg:text-[54px]">
                Built around
                <br />
                your real life.
              </h2>
              <p className="mt-6 max-w-105 text-lg leading-8 text-muted">
                Some days, you’ve got an hour. Others, just a little space to
                move. Start with a plan that fits, and keep making it yours.
              </p>
              <div className="mt-8 divide-y divide-line border-y border-line">
                {[
                  [
                    "01",
                    "Find your starting point",
                    "Explore by experience, equipment, and goals.",
                  ],
                  [
                    "02",
                    "Know your next move",
                    "Preview exercises and get familiar with the technique.",
                  ],
                  [
                    "03",
                    "Take it with you",
                    "Use the same account on web and in the mobile app.",
                  ],
                ].map(([n, title, text]) => (
                  <div key={n} className="flex gap-5 py-5">
                    <span className="mt-1 text-xs font-medium text-muted">
                      {n}
                    </span>
                    <div>
                      <h3 className="text-lg font-medium">{title}</h3>
                      <p className="mt-1 text-sm text-muted">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/features"
                className="group mt-7 inline-flex items-center gap-4 text-base font-semibold"
              >
                Meet your FitSync{" "}
                <ArrowUpRight
                  size={20}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-7xl flex-col justify-between gap-10 px-5 py-18 sm:px-8 sm:py-24 md:flex-row md:items-end lg:px-12 lg:py-28">
          <div>
            <p className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-[0.15em] text-muted">
              <Smartphone size={16} />
              ONE ACCOUNT. EVERY DEVICE.
            </p>
            <h2 className="text-[44px] leading-[1.05] tracking-[-2px] sm:text-[60px] lg:text-[72px]">
              Good things
              <br />
              start with a move.
            </h2>
            <p className="mt-6 text-lg text-muted">
              This one’s yours. Let’s get going.
            </p>
          </div>
          <Link
            href="/register"
            className="group flex items-center gap-7 self-start rounded-md bg-brand py-5 pr-6 pl-7 text-lg font-semibold transition-colors hover:bg-brand-hover md:self-end"
          >
            Get started for free{" "}
            <MoveUpRight
              size={27}
              className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </Link>
        </section>
      </main>
    </PublicShell>
  );
}
