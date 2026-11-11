import Link from "next/link";
import { ArrowUpRight, CalendarDays, Dumbbell, Waypoints } from "lucide-react";
import { Reveal, ScrollText } from "@/components/motion";
import { storyContent } from "./content";

const stepIcons = [Dumbbell, CalendarDays, Waypoints];

export function StorySection() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="story-heading"
      className="mx-auto max-w-7xl scroll-mt-28 px-5 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32"
    >
      <div className="grid gap-7 lg:grid-cols-[.4fr_1fr] lg:gap-16">
        <div>
          <h2
            id="story-heading"
            className="mt-5 max-w-48 text-xl leading-7 font-medium tracking-tight text-muted"
          >
            Less overthinking.
            <br />
            More showing up.
          </h2>
        </div>
        <ScrollText
          text={storyContent.statement}
          className="text-[clamp(1.9rem,3.6vw,3.15rem)] leading-[1.16] font-medium tracking-[-.045em]"
        />
      </div>
      <div className="mt-14 grid gap-8 md:mt-20 md:grid-cols-3 md:gap-10">
        {storyContent.steps.map((step, index) => {
          const StepIcon = stepIcons[index];
          return (
            <Reveal key={step.title} delay={index * 80}>
              <div className="flex h-full flex-col border-t border-line pt-6">
                <div className="mb-8 flex items-center justify-between">
                  <span className="font-mono text-xs text-muted">0{index + 1}</span>
                  <StepIcon size={22} strokeWidth={1.3} className="text-brand" />
                </div>
                <h3 className="text-2xl font-medium tracking-[-.04em]">{step.title}</h3>
                <p className="mt-3 max-w-80 flex-1 text-sm leading-7 text-muted sm:text-base">
                  {step.description}
                </p>
                <Link
                  href={step.href}
                  className="group mt-6 inline-flex min-h-10 items-center gap-3 self-start rounded-sm text-sm font-medium hover:text-brand"
                >
                  {step.action}
                  <ArrowUpRight
                    size={16}
                    className="text-brand transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Link>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
