import Link from "next/link";
import { PublicShell } from "@/components/shell";
import { Icon } from "@/components/icon";
export default function Page() {
  return (
    <PublicShell>
      <main
        id="main"
        className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12 py-16 sm:py-24 [&>h1]:my-6 [&>h1]:text-5xl sm:[&>h1]:text-6xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Made for your movement
        </p>
        <h1>
          Everything in sync.
          <br />
          Every step of the way.
        </h1>
        <p className="mt-5 mb-10 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
          A place to learn, prepare, and make your fitness journey your own.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            [
              "dumbbell",
              "Learn every movement",
              "Explore exercises by muscle, equipment, and experience. Follow step-by-step instructions and visual demonstrations.",
              "/exercises",
              "Explore exercises",
            ],
            [
              "user",
              "A profile that grows with you",
              "Set your goals, experience, and training preferences. Update them as your fitness journey evolves.",
              "/user/profile",
              "Build your profile",
            ],
            [
              "chart",
              "From your screen to your session",
              "Your web profile and exercise library connect to the same account you use in the FitSync mobile app.",
              "/login",
              "Connect your account",
            ],
          ].map(([icon, title, description, href, action]) => (
            <section
              className="rounded-lg border border-line bg-panel flex flex-col items-start gap-5 p-7 [&_h2]:text-2xl [&_p]:flex-1 [&_p]:leading-7 [&_p]:text-muted"
              key={title}
            >
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-brand text-background">
                <Icon name={icon} size={25} />
              </span>
              <h2>{title}</h2>
              <p>{description}</p>
              <Link
                className="inline-flex items-center gap-2 font-semibold text-ink underline-offset-4 hover:underline"
                href={href}
              >
                {action}
                <Icon name="arrow" size={16} />
              </Link>
            </section>
          ))}
        </div>
        <div className="flex flex-col items-center gap-6 py-20 text-center [&_h2]:text-3xl [&_p]:text-muted">
          <h2>One account. Your whole journey.</h2>
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-brand px-5 py-3 text-base font-semibold text-background transition-colors hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            href="/register"
          >
            Start free
            <Icon name="arrow" size={17} />
          </Link>
        </div>
      </main>
    </PublicShell>
  );
}
