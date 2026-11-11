import Image from "next/image";
import Link from "next/link";
import { Activity, ArrowUpRight, Check, Dumbbell, Leaf, Smartphone } from "lucide-react";
import { Reveal, ScrollText } from "@/components/motion";
import { container, eyebrow, headline, primaryButton, SectionIntro, TextLink } from "./shared";
import { featureGroups, metricGroups } from "./feature-catalog";
import { planTiers } from "@/components/home/content";

export function PhilosophySection() {
  return (
    <section id="demo" className={`${container} scroll-mt-28 pt-28 pb-5 sm:pt-40`}>
      <div id="how-it-works" className="grid scroll-mt-28 gap-8 lg:grid-cols-[.45fr_1fr] lg:gap-20">
        <p className="max-w-44 text-sm leading-7 text-white/55">
          A little less scattered.
          <br />A lot more in sync.
        </p>
        <ScrollText
          text="Your workout. Your next meal. The sleep you needed. The days you showed up. Fitness is everything you do for yourself. Give it a place to come together."
          className="text-[clamp(1.8rem,3.5vw,3rem)] leading-[1.3] font-medium tracking-[-.04em]"
        />
      </div>
    </section>
  );
}

export function TrainingSection() {
  return (
    <section
      id="your-rhythm"
      className="relative isolate scroll-mt-20 overflow-hidden bg-[#0b0b0b] py-24 sm:py-36"
    >
      <div className="absolute inset-0 -z-10">
        <Image
          src="/art/training-studio.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover grayscale opacity-35"
        />
        <div className="absolute inset-0 bg-linear-to-r from-black via-black/80 to-black/20" />
      </div>
      <div className={`${container} grid items-end gap-16 lg:grid-cols-[1.1fr_1fr] lg:gap-24`}>
        <Reveal>
          <SectionIntro
            label="Built around your real life"
            title={
              <>
                A plan for the week.
                <br />
                <span className="text-white/50">Room for being human.</span>
              </>
            }
            description="Start where you are. Choose your goal, your equipment and the time you have. FitSync turns that into a four-week starting plan."
          />
          <TextLink href="/programs" className="mt-7">
            Find your training rhythm
          </TextLink>
        </Reveal>
        <Reveal delay={80}>
          <div className="rounded-3xl bg-black/70 p-6 backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/50">A week that works for you</p>
              <CalendarMark />
            </div>
            <div className="mt-8 space-y-3">
              {[
                ["Monday", "Full-body strength", "45 min", true],
                ["Tuesday", "Room to recover", "Rest", false],
                ["Wednesday", "Full-body strength", "45 min", true],
                ["Thursday", "Move at your pace", "Recovery", false],
                ["Friday", "Full-body strength", "45 min", true],
              ].map(([day, title, time, training]) => (
                <div
                  key={String(day)}
                  className={`flex items-center gap-4 rounded-xl px-4 py-4 ${training ? "bg-white/7" : ""}`}
                >
                  <span className="w-12 text-[10px] text-white/50">{day}</span>
                  <span className={`flex-1 text-xs ${training ? "text-white" : "text-white/55"}`}>
                    {title}
                  </span>
                  <span className="text-[10px] text-white/50">{time}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[10px] leading-5 text-white/50">
              Illustrative starter week. Your plan depends on your profile.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
function CalendarMark() {
  return (
    <span className="flex gap-1" aria-hidden="true">
      {[true, false, true, false, true].map((on, i) => (
        <span key={i} className={`h-5 w-1 rounded-full ${on ? "bg-white/60" : "bg-white/15"}`} />
      ))}
    </span>
  );
}

export function HealthSection({ detailed = false }: { detailed?: boolean }) {
  return (
    <section id="health" className="scroll-mt-20 bg-[#f5f5f3] py-24 text-black sm:py-36">
      <div className={container}>
        <Reveal>
          <SectionIntro
            light
            label="Beyond the workout"
            title={
              <>
                Your health has
                <br />
                <span className="text-black/40">more than one side.</span>
              </>
            }
            description="Keep activity, nutrition, body measurements and recovery in the same picture. Track what matters to you, with personal targets and space for notes."
          />
        </Reveal>
        <div className="mt-14 grid gap-10 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
          {metricGroups.map((group, index) => {
            const Icon = [Activity, Leaf, Dumbbell, Smartphone][index];
            return (
              <Reveal key={group.title} delay={(index % 3) * 80}>
                <Icon size={27} strokeWidth={1.2} className="mb-7 text-black/65" />
                <h3 className="text-xl font-medium tracking-tight">{group.title}</h3>
                <p className="mt-3 min-h-14 text-sm leading-7 text-black/55">{group.description}</p>
                {detailed ? (
                  <ul className="mt-5 space-y-2 text-sm leading-7 text-black/65">
                    {group.metrics.map((metric) => (
                      <li key={metric}>{metric}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 text-xs leading-7 text-black/60">
                    {group.metrics.slice(0, 4).join(" · ")}
                    {group.metrics.length > 4 ? " · and more" : ""}
                  </p>
                )}
              </Reveal>
            );
          })}
        </div>
        <div className="mt-14 flex flex-col justify-between gap-6 rounded-2xl bg-black/4 p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h3 className="text-base font-medium tracking-tight">
              Your health data. With your permission.
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-black/55">
              Optionally import steps, sleep and body weight from Apple Health or Health Connect.
              FitSync reads your records and never writes to them.
            </p>
          </div>
          {!detailed && (
            <TextLink href="/features#health" className="shrink-0">
              See what you can track
            </TextLink>
          )}
        </div>
      </div>
    </section>
  );
}

export function MovementSection() {
  return (
    <section id="movement" className={`${container} scroll-mt-28 py-24 sm:py-36`}>
      <Reveal className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
        <SectionIntro
          label="Learn. Move. Recover."
          title={
            <>
              Find your kind
              <br />
              of strong.
            </>
          }
        />
        <p className="max-w-md text-base leading-8 text-white/55 lg:pb-2">
          A full gym. A pair of dumbbells. A little floor space. Learn the movements, follow
          mobility sessions, and build confidence wherever you begin.
        </p>
      </Reveal>
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {[
          {
            title: "Strength",
            subtitle: "Make every rep a little more intentional.",
            icon: Dumbbell,
            detail: "Exercises, technique and visual demonstrations.",
            href: "/exercises",
          },
          {
            title: "Mobility",
            subtitle: "Better movement starts with a little space.",
            icon: Activity,
            detail: "Guided sessions for warm-ups and recovery.",
            href: "/features#library",
          },
          {
            title: "Learn & tools",
            subtitle: "Understand the work you’re putting in.",
            icon: Leaf,
            detail: "Fitness articles and practical calculators.",
            href: "/features#library",
          },
        ].map(({ title, subtitle, icon: Icon, detail, href }, index) => (
          <Reveal key={title} delay={index * 80}>
            <Link
              href={href}
              className="group flex h-full min-h-80 flex-col rounded-3xl bg-panel p-8 transition-colors duration-500 hover:bg-panel-raised"
            >
              <div className="flex items-start justify-between">
                <Icon
                  size={48}
                  strokeWidth={0.8}
                  className="text-white/55 transition-transform duration-500 group-hover:-rotate-6 motion-reduce:transform-none"
                />
                <ArrowUpRight
                  size={20}
                  className="text-white/30 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                />
              </div>
              <h3 className="mt-16 text-2xl font-medium tracking-tight">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/65">{subtitle}</p>
              <p className="mt-4 text-xs leading-6 text-white/50">{detail}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function FeatureDirectory() {
  return (
    <section id="library" className={`${container} scroll-mt-28 py-24 sm:py-36`}>
      <Reveal>
        <SectionIntro
          label="The full FitSync picture"
          title={
            <>
              Built for more
              <br />
              <span className="text-white/50">than your gym hour.</span>
            </>
          }
          description="A connected set of tools for training, everyday health and the space in between."
        />
      </Reveal>
      <div className="mt-16 grid gap-x-16 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
        {featureGroups.map(({ icon: Icon, title, description, label, ...feature }, index) => (
          <Reveal key={label} delay={(index % 3) * 80}>
            <div className="flex items-center gap-3">
              <Icon size={23} strokeWidth={1.3} className="text-white/55" />
              <p className="text-xs text-white/55">{label}</p>
              {"pro" in feature && (
                <span className="rounded-full bg-white/10 px-2 py-1 text-[9px] font-medium text-white/70">
                  PRO
                </span>
              )}
            </div>
            <h3 className="mt-6 text-xl leading-snug font-medium tracking-tight">{title}</h3>
            <p className="mt-4 text-sm leading-7 text-white/50">{description}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function PlansSection() {
  return (
    <section id="plans" className={`${container} scroll-mt-28 py-24 sm:py-36`}>
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className={`${eyebrow} text-white/55`}>A strong foundation. Room to adapt.</p>
        <h2 className={`mt-6 ${headline}`}>
          Start free.
          <br />
          <span className="text-white/50">Go further with Pro.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-white/55">
          The essentials to build your routine are free. Pro helps your plan keep up when life
          changes.
        </p>
      </Reveal>
      <div className="mt-14 grid gap-5 md:grid-cols-2">
        {[
          {
            name: "FitSync",
            label: "Your everyday essentials",
            description: "Build the habit. Keep the history.",
            items: planTiers.free,
          },
          {
            name: "FitSync Pro",
            label: "Optional upgrade in the mobile app",
            description: "More flexibility for the way life happens.",
            items: planTiers.pro,
          },
        ].map((plan, index) => (
          <Reveal key={plan.name} delay={index * 80}>
            <div
              className={`flex h-full flex-col rounded-3xl p-8 sm:p-10 ${index ? "bg-white text-black" : "bg-panel"}`}
            >
              <p className={`text-xs ${index ? "text-black/60" : "text-white/55"}`}>{plan.label}</p>
              <h3 className="mt-6 text-3xl font-medium tracking-tighter">{plan.name}</h3>
              <p className={`mt-3 text-sm leading-7 ${index ? "text-black/55" : "text-white/50"}`}>
                {plan.description}
              </p>
              <ul className="mt-8 flex-1 space-y-4">
                {plan.items.map((item) => (
                  <li
                    key={item}
                    className={`flex items-start gap-3 text-sm leading-6 ${index ? "text-black/75" : "text-white/70"}`}
                  >
                    <Check
                      size={16}
                      className={`mt-1 ${index ? "text-black/40" : "text-white/50"}`}
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`group mt-10 flex min-h-12 items-center justify-between rounded-full px-6 text-sm font-medium transition-colors ${index ? "bg-black text-white hover:bg-black/80" : "bg-white/8 text-white hover:bg-white/15"}`}
              >
                {index ? "Start free, explore Pro in the app" : "Get started free"}
                <ArrowUpRight size={18} />
              </Link>
              {index === 1 && (
                <p className="mt-4 text-[11px] leading-6 text-black/60">
                  Current subscription options and pricing are shown in the mobile app before
                  purchase.
                </p>
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function ClosingSection() {
  return (
    <section className="overflow-hidden bg-[#0b0b0b]">
      <div className={`${container} py-28 text-center sm:py-40`}>
        <Reveal>
          <p className="text-xs font-medium tracking-[.12em] text-white/55 uppercase">
            Your next good thing starts here
          </p>
          <h2 className="mx-auto mt-8 max-w-4xl text-[clamp(3.5rem,9vw,8rem)] leading-[1.02] font-medium tracking-[-.065em] text-balance">
            A little more
            <br />
            in <span className="text-brand">sync.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-md text-base leading-8 text-white/50">
            Bring your training, your habits and your progress together. Start wherever you are.
          </p>
          <Link href="/register" className={`${primaryButton} mt-9`}>
            Find your starting point
            <ArrowUpRight size={18} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
