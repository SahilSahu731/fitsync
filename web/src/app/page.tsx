import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Dumbbell,
  MoveUpRight,
  Plus,
  Smartphone,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { PublicShell } from "@/components/shell";
import { DumbbellScene } from "@/components/dumbbell-scene";
import { TrainingPicker } from "@/components/training-picker";
import { RoutineRhythm } from "@/components/routine-rhythm";
import { CompanionIllustration } from "@/components/companion-illustration";

const questions = [
  [
    "Can I get started for free?",
    "Yes. Create a FitSync account to start exploring. Workout logging, daily tracking, your starting plan, and progress history are available in the mobile app. Optional Pro features add plan adjustments and deeper guidance.",
  ],
  [
    "Do I need a gym or special equipment?",
    "You can explore exercises for a full gym, a pair of dumbbells, or your own bodyweight. Use the exercise library’s equipment and experience filters to find movements that suit your setup.",
  ],
  [
    "How do the website and mobile app work together?",
    "Use the website to explore exercises and training programs, learn techniques, and manage your profile. Log your sessions and daily check-ins in the mobile app using the same FitSync account.",
  ],
  [
    "What if I’m just getting started?",
    "Start with the beginner filters in the exercise and training libraries. Preview the movements and their instructions, then choose a program with a schedule you can repeat. Your starting point is a starting point, not a finish line.",
  ],
];

export default function Home() {
  return (
    <PublicShell>
      <main id="main" className="overflow-hidden bg-background">
        <section className="relative mx-auto max-w-7xl px-5 pt-12 sm:px-8 sm:pt-16 lg:px-12 lg:pt-17">
          <div className="relative grid items-center gap-4 lg:grid-cols-[1.06fr_1fr] lg:gap-1">
            <div className="relative z-10 pt-2 pb-5 lg:pt-0 lg:pb-15">
              <p className="mb-7 flex items-center gap-3 text-[10px] font-semibold tracking-[0.2em] text-muted sm:text-xs">
                <span className="size-1.5 rounded-full bg-brand" />
                FOR THE EVERYDAY ATHLETE
              </p>
              <h1 className="text-[clamp(3.8rem,14.8vw,6.5rem)] leading-[0.98] font-semibold tracking-[-0.065em] lg:text-[clamp(5rem,8.5vw,7rem)]">
                Built for
                <br />
                <span className="text-brand">your next.</span>
              </h1>
              <p className="mt-7 max-w-105 text-base leading-7 text-muted sm:mt-8 sm:text-lg sm:leading-8">
                Your next rep. Your next good habit. Your next little breakthrough. Training that
                fits the life you actually live.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 sm:mt-9">
                <Link
                  href="/programs"
                  className="group inline-flex min-h-14 items-center justify-center gap-7 rounded-full bg-brand px-7 py-4 text-base font-semibold text-background transition-colors hover:bg-brand-hover"
                >
                  Find your training
                  <ArrowUpRight
                    size={20}
                    className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Link>
                <a
                  href="#how-it-works"
                  className="group inline-flex min-h-12 items-center gap-2 border-b border-ink/35 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  Take a look around
                  <ArrowDown
                    size={16}
                    className="transition-transform group-hover:translate-y-0.5"
                  />
                </a>
              </div>
              <p className="mt-6 flex items-center gap-2 text-xs text-muted">
                <Check size={14} className="text-brand" />
                Free to get started. No perfect starting point required.
              </p>
            </div>
            <div className="group relative -mx-5 min-h-100 sm:mx-0 sm:min-h-125 lg:-mt-8 lg:-mr-10 lg:min-h-150">
              <Image
                src="/art/athlete-motion.webp"
                alt="Original chalk and lime illustration of an athlete moving forward, surrounded by sketched motion lines"
                width={1120}
                height={1400}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 620px"
                preload
                className="mx-auto h-110 w-full object-contain mix-blend-lighten transition-transform duration-700 group-hover:scale-[1.015] motion-reduce:transition-none sm:h-130 lg:h-155"
              />
              <div className="absolute top-9 right-6 flex items-center gap-2 text-[9px] font-medium tracking-[0.15em] text-muted sm:right-4 lg:top-12">
                <span className="h-px w-8 bg-brand/50" />
                THE ART OF SHOWING UP
              </div>
              <div className="absolute right-5 bottom-6 flex items-center gap-3 rounded-full border border-line bg-background/80 py-3 pr-5 pl-3 backdrop-blur-md sm:right-7 sm:bottom-12">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand/10">
                  <Activity size={17} className="text-brand" />
                </span>
                <span className="text-xs font-medium">A little stronger. Every day.</span>
              </div>
              <svg
                viewBox="0 0 130 90"
                fill="none"
                className="absolute bottom-9 left-6 hidden w-26 -rotate-12 text-brand/65 sm:block"
                aria-hidden="true"
              >
                <path
                  d="M9 31c26-33 73-28 87 3 14 29-19 45-38 28-16-14-1-47 25-44 18 2 31 16 35 39m-14-11 15 14 5-21"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div className="relative z-10 mt-2 grid divide-y divide-line border-y border-line sm:mt-3 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              {
                title: "Find your focus.",
                detail: "A library of possibilities.",
                href: "/exercises",
                icon: Dumbbell,
              },
              {
                title: "Build your rhythm.",
                detail: "A plan that fits your week.",
                href: "/programs",
                icon: CalendarDays,
              },
              {
                title: "Keep it connected.",
                detail: "Web to mobile. One you.",
                href: "/features",
                icon: Waypoints,
              },
            ].map(({ title, detail, href, icon: Icon }, index) => (
              <Link
                href={href}
                key={title}
                className={`group flex items-center gap-4 py-6 transition-colors hover:bg-brand/[0.025] sm:py-7 ${index > 0 ? "sm:pl-6 lg:pl-9" : ""} sm:pr-5`}
              >
                <Icon size={23} strokeWidth={1.4} className="text-brand" />
                <div className="flex-1">
                  <h2 className="text-base font-medium tracking-[-0.3px]">{title}</h2>
                  <p className="mt-1 text-xs text-muted">{detail}</p>
                </div>
                <ArrowUpRight
                  size={17}
                  className="mr-1 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand"
                />
              </Link>
            ))}
          </div>
        </section>

        <TrainingPicker />

        <section id="how-it-works" className="scroll-mt-24 border-y border-line bg-surface">
          <div className="mx-auto max-w-7xl px-5 py-18 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
            <div className="mb-11 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="mb-4 text-[10px] font-semibold tracking-[0.18em] text-brand sm:text-xs">
                  A LITTLE STRUCTURE. A LOT OF POSSIBILITY.
                </p>
                <h2 className="text-[38px] leading-[1.08] tracking-[-1.7px] sm:text-5xl lg:text-[56px]">
                  Make every
                  <br />
                  session your own.
                </h2>
              </div>
              <p className="max-w-80 text-base leading-7 text-muted">
                The right movement. A little understanding.
                <br className="hidden sm:block" /> A reason to come back tomorrow.
              </p>
            </div>
            <div className="grid items-stretch gap-7 lg:grid-cols-2 lg:gap-10">
              <DumbbellScene />
              <div className="flex flex-col justify-center py-3 lg:py-8 lg:pl-7">
                <span className="text-[11px] font-medium tracking-[0.16em] text-muted">
                  01 / LEARN IT. MAKE IT YOURS.
                </span>
                <h3 className="mt-6 max-w-110 text-3xl leading-[1.15] tracking-[-1px] sm:text-[38px]">
                  Confidence starts
                  <br />
                  with the next rep.
                </h3>
                <p className="mt-5 max-w-105 text-base leading-7 text-muted sm:text-lg sm:leading-8">
                  Explore movements by muscle, equipment, and experience. Follow the steps, see the
                  technique, and turn “where do I start?” into “I’ve got this.”
                </p>
                <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-6">
                  {[
                    ["Clear instructions", "Know the movement."],
                    ["Equipment filters", "Use what you have."],
                    ["Your experience", "Find your starting point."],
                    ["One shared library", "Take it to your session."],
                  ].map(([title, detail]) => (
                    <div key={title}>
                      <span className="mb-2 block h-px w-6 bg-brand/65" />
                      <h4 className="text-sm font-semibold">{title}</h4>
                      <p className="mt-1 text-xs text-muted">{detail}</p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/exercises"
                  className="group mt-8 inline-flex min-h-12 items-center gap-5 self-start border-b border-ink/40 text-base font-semibold hover:border-brand hover:text-brand"
                >
                  Get to know the movements
                  <ArrowRight
                    size={19}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-18 sm:px-8 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:gap-22 lg:px-12 lg:py-28">
          <div>
            <p className="mb-5 text-[11px] font-medium tracking-[0.16em] text-muted">
              02 / FIND YOUR EVERYDAY RHYTHM.
            </p>
            <h2 className="text-[38px] leading-[1.08] tracking-[-1.7px] sm:text-5xl lg:text-[56px]">
              Good training.
              <br />
              Real-life ready.
            </h2>
            <p className="mt-6 max-w-100 text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Your calendar is already full. Your training shouldn’t make it harder. Explore a
              rhythm that gives your goals a little room.
            </p>
            <div className="mt-7 space-y-4">
              {[
                "Choose a program around your available days.",
                "Preview the sessions before you commit.",
                "Leave a little space for the rest of life.",
              ].map((text) => (
                <p key={text} className="flex items-start gap-3 text-sm leading-6">
                  <Check size={17} className="mt-0.5 text-brand" />
                  {text}
                </p>
              ))}
            </div>
            <svg
              viewBox="0 0 250 50"
              className="mt-8 w-48 text-brand/70"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 30c41-25 91-30 138-9 33 15 58 13 88-2m-14-5 18 3-11 14M7 38c37-16 74-20 106-9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <RoutineRhythm />
        </section>

        <section className="relative border-y border-line bg-surface">
          <div className="mx-auto grid max-w-7xl items-center gap-6 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-12 lg:py-24">
            <div className="order-2 -mx-3 lg:order-1 lg:-ml-8">
              <CompanionIllustration />
              <p className="-mt-4 text-center text-[10px] tracking-[0.06em] text-muted">
                An illustrated glimpse of FitSync mobile. Example screen.
              </p>
            </div>
            <div className="order-1 lg:order-2">
              <p className="mb-5 flex items-center gap-2.5 text-[11px] font-medium tracking-[0.16em] text-muted">
                <Smartphone size={16} className="text-brand" />
                03 / KEEP YOUR GOOD THING GOING.
              </p>
              <h2 className="text-[38px] leading-[1.08] tracking-[-1.7px] sm:text-5xl lg:text-[56px]">
                All your effort.
                <br />
                In your corner.
              </h2>
              <p className="mt-6 max-w-110 text-base leading-7 text-muted sm:text-lg sm:leading-8">
                The work you put in deserves a place to live. Log your sessions, check in with
                yourself, and see your story take shape in the mobile app.
              </p>
              <div className="mt-8 space-y-5">
                {[
                  {
                    icon: Activity,
                    title: "Remember the work.",
                    text: "Keep your sets, sessions, and progress together.",
                  },
                  {
                    icon: CalendarDays,
                    title: "See your next move.",
                    text: "Training plans and your calendar, in one rhythm.",
                  },
                  {
                    icon: Waypoints,
                    title: "Bring it all with you.",
                    text: "The same account. Wherever you show up.",
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex items-start gap-4">
                    <span className="mt-0.5 flex size-10 items-center justify-center rounded-full border border-line">
                      <Icon size={19} strokeWidth={1.4} className="text-brand" />
                    </span>
                    <div>
                      <h3 className="text-base font-medium">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/features"
                className="group mt-8 inline-flex min-h-12 items-center gap-5 border-b border-ink/40 text-base font-semibold hover:border-brand hover:text-brand"
              >
                Meet your FitSync
                <ArrowUpRight
                  size={19}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-18 sm:px-8 sm:py-24 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24 lg:px-12">
          <div>
            <p className="mb-4 text-[11px] font-semibold tracking-[0.17em] text-muted">
              BEFORE YOUR FIRST MOVE
            </p>
            <h2 className="text-[36px] leading-[1.12] tracking-[-1.5px] sm:text-[44px]">
              A few good
              <br />
              things to know.
            </h2>
            <p className="mt-5 max-w-75 text-base leading-7 text-muted">
              Keep the questions.
              <br />
              We’ll help with the starting point.
            </p>
          </div>
          <div className="border-t border-line">
            {questions.map(([question, answer]) => (
              <details key={question} className="group border-b border-line">
                <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-5 py-6 text-base font-medium transition-colors marker:content-none hover:text-brand [&::-webkit-details-marker]:hidden sm:text-lg">
                  {question}
                  <Plus
                    size={20}
                    strokeWidth={1.4}
                    className="text-muted transition-transform group-open:rotate-45 group-open:text-brand"
                  />
                </summary>
                <p className="max-w-130 pr-8 pb-7 text-sm leading-7 text-muted sm:text-base">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-18 sm:px-8 sm:pb-24 lg:px-12 lg:pb-28">
          <div className="relative overflow-hidden rounded-2xl bg-brand px-7 py-12 text-background sm:px-12 sm:py-15 lg:px-16 lg:py-17">
            <svg
              viewBox="0 0 620 430"
              className="pointer-events-none absolute top-1/2 -right-28 h-110 w-160 -translate-y-1/2 text-background/10 sm:-right-6"
              fill="none"
              aria-hidden="true"
            >
              <ellipse
                cx="330"
                cy="215"
                rx="230"
                ry="145"
                stroke="currentColor"
                strokeWidth="1.5"
                transform="rotate(-32 330 215)"
              />
              <ellipse
                cx="330"
                cy="215"
                rx="260"
                ry="95"
                stroke="currentColor"
                strokeWidth="1.5"
                transform="rotate(-32 330 215)"
              />
              <path
                d="m141 258 45-64h51l-45 64h-51Zm57 51 45-64h51l-45 64h-51Z"
                fill="currentColor"
              />
            </svg>
            <div className="relative z-10 flex flex-col justify-between gap-8 xl:flex-row xl:items-end">
              <div>
                <p className="mb-5 flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] sm:text-xs">
                  <Sparkles size={15} />
                  NO BIG SPEECH. JUST YOUR NEXT STEP.
                </p>
                <h2 className="text-[clamp(2rem,10.8vw,2.6875rem)] leading-[1.02] font-semibold tracking-[-2px] sm:text-[62px] lg:text-[76px]">
                  You bring you.
                  <br />
                  We’ll bring <br className="sm:hidden" />
                  FitSync.
                </h2>
                <p className="mt-5 text-base text-background/65">
                  A little more movement. A lot more possibility.
                </p>
              </div>
              <Link
                href="/register"
                className="group flex min-h-14 items-center justify-between gap-7 self-start rounded-full bg-background px-7 py-4 text-base font-semibold text-brand transition-colors hover:bg-background/85 xl:self-end"
              >
                Let’s make a move
                <MoveUpRight
                  size={22}
                  className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
