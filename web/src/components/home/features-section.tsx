import Link from "next/link";
import { ArrowUpRight, Activity, Waypoints } from "lucide-react";
import { Reveal, Spotlight } from "@/components/motion";
import { MovementStudy } from "./movement-study";
import { DevicesIllustration, ProgressIllustration } from "./progress-illustration";

export function FeaturesSection() {
  return (
    <section
      id="movement"
      aria-labelledby="features-heading"
      className="scroll-mt-28 border-y border-line bg-surface"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <Reveal>
          <div className="mb-10 flex flex-col justify-between gap-5 sm:mb-13 lg:flex-row lg:items-end">
            <div>
              <p className="mb-5 text-[10px] font-semibold tracking-[.16em] text-brand">
                02 / MADE FOR YOUR KIND OF MOVEMENT
              </p>
              <h2
                id="features-heading"
                className="text-[clamp(2.35rem,4.7vw,4rem)] leading-[1.05] tracking-[-.05em]"
              >
                Everything you need.
                <br />
                <span className="text-muted">Room to make it yours.</span>
              </h2>
            </div>
            <p className="max-w-76 text-base leading-7 text-muted">
              Heavy lifts. A deeper stretch. Your own bodyweight. Find your kind of strong.
            </p>
          </div>
        </Reveal>
        <div className="grid items-stretch gap-5 lg:grid-cols-[1.25fr_1fr]">
          <Reveal className="min-w-0">
            <MovementStudy />
          </Reveal>
          <div className="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <Reveal delay={80}>
              <Spotlight className="h-full border border-line p-6 sm:p-7 lg:p-8">
                <div className="flex items-center justify-between">
                  <Activity size={22} strokeWidth={1.4} className="text-brand" />
                  <span className="text-[9px] tracking-[.14em] text-muted">REMEMBER THE WORK</span>
                </div>
                <h3 className="mt-6 text-[27px] leading-[1.12] font-medium tracking-[-.04em]">
                  Progress you can see.
                  <br />
                  Effort you can keep.
                </h3>
                <p className="mt-3 max-w-80 text-sm leading-7 text-muted">
                  Your sets, sessions, and check-ins together in the mobile app.
                </p>
                <div className="mt-6">
                  <ProgressIllustration />
                </div>
                <p className="mt-4 text-[10px] text-muted">
                  Illustrative trend. Your progress tells your own story.
                </p>
              </Spotlight>
            </Reveal>
            <Reveal delay={160}>
              <Spotlight className="h-full border border-line p-6 sm:p-7 lg:p-8">
                <div className="flex items-center justify-between">
                  <Waypoints size={22} strokeWidth={1.4} className="text-brand" />
                  <span className="text-[9px] tracking-[.14em] text-muted">KEEP IT CONNECTED</span>
                </div>
                <div className="my-4">
                  <DevicesIllustration />
                </div>
                <h3 className="text-[27px] leading-[1.12] font-medium tracking-[-.04em]">
                  Web and mobile.
                  <br />
                  One you.
                </h3>
                <p className="mt-3 max-w-80 text-sm leading-7 text-muted">
                  Explore on the website. Log your sessions in the app. Bring the same profile with
                  you.
                </p>
                <Link
                  href="/features"
                  className="group mt-5 inline-flex min-h-10 items-center gap-3 rounded-sm text-sm font-medium hover:text-brand"
                >
                  Get to know FitSync
                  <ArrowUpRight
                    size={17}
                    className="text-brand transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Link>
              </Spotlight>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
