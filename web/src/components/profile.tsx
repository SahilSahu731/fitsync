"use client";
import Link from "next/link";
import { useState } from "react";
import type { Account } from "@/lib/types";
import { api, pretty } from "@/lib/api";
import { useSession } from "./session";
import { Icon } from "./icon";
export function UserOverview() {
  const { account, admin } = useSession();
  const firstName = account?.user.name.split(" ")[0] || "there";
  return (
    <>
      <div className="mb-12 flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs tracking-[.12em] text-white/55 uppercase">Your FitSync</p>
          <h1 className="mt-5 text-[clamp(2.8rem,5vw,4.5rem)] leading-tight font-medium tracking-[-.06em]">
            Good to see you, {firstName}.
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/55">
            A little time for yourself. A little more in sync.
          </p>
        </div>
        {admin && (
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center gap-3 rounded-full bg-white/8 px-5 text-xs"
          >
            Admin workspace
            <Icon name="arrow" size={15} />
          </Link>
        )}
      </div>
      <section className="grid gap-8 rounded-3xl bg-panel p-7 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <div>
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/8">
            <Icon name="dumbbell" size={23} />
          </span>
          <h2 className="mt-8 text-3xl leading-tight font-medium tracking-[-.04em]">
            Where would you like
            <br />
            to take today?
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-white/50">
            Find your next session, get to know a movement, or update the goals that guide your
            training.
          </p>
          <Link
            href="/programs"
            className="mt-7 inline-flex min-h-12 items-center gap-5 rounded-full bg-white px-6 text-sm font-medium text-black"
          >
            Explore training
            <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="grid grid-cols-2 content-center gap-5">
          {[
            ["Your goal", account?.profile ? pretty(account.profile.goal) : "Let’s set one"],
            ["Experience", account?.profile ? pretty(account.profile.experience) : "Not set"],
            [
              "Training days",
              account?.profile ? `${account.profile.trainingDays} / week` : "Not set",
            ],
            [
              "Session length",
              account?.profile ? `${account.profile.minutesPerWorkout} min` : "Not set",
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-black/35 p-5">
              <p className="text-xs text-white/50">{label}</p>
              <p className="mt-4 text-xl font-medium tracking-tight">{value}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {[
          {
            href: "/exercises",
            icon: "dumbbell",
            title: "Find your next movement.",
            text: "Technique, demonstrations and exercises for your equipment.",
          },
          {
            href: "/user/profile",
            icon: "user",
            title: account?.profile
              ? "A profile that grows with you."
              : "Make this a little more you.",
            text: "Keep your goals, experience and preferences in sync with the mobile app.",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-3xl bg-panel p-7 transition-colors hover:bg-panel-raised sm:p-8"
          >
            <div className="flex justify-between text-white/55">
              <Icon name={item.icon} size={24} />
              <Icon
                name="arrow"
                size={19}
                className="transition-transform group-hover:translate-x-1"
              />
            </div>
            <h2 className="mt-8 text-xl font-medium tracking-tight">{item.title}</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/55">{item.text}</p>
          </Link>
        ))}
      </div>
      <div className="mt-12 flex flex-col justify-between gap-5 rounded-3xl bg-white p-7 text-black sm:flex-row sm:items-center sm:p-9">
        <div>
          <h2 className="text-xl font-medium tracking-tight">Take the everyday with you.</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-black/55">
            Log workouts, check in on your health, and follow your plan in FitSync mobile. Your
            account brings it together.
          </p>
        </div>
        <Link
          href="/#app-preview"
          className="inline-flex min-h-12 shrink-0 items-center gap-4 rounded-full bg-black px-6 text-sm text-white"
        >
          Explore the app
          <Icon name="arrow" size={16} />
        </Link>
      </div>
    </>
  );
}

export function ProfileForm({ settings = false }: { settings?: boolean }) {
  const { account, updateAccount } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState(account?.user.name || "");
  const [bio, setBio] = useState(account?.user.bio || "");
  const [profile, setProfile] = useState(
    account?.profile || {
      goal: "fitness",
      experience: "beginner",
      gender: "prefer_not_to_say",
      heightCm: 170,
      weightKg: 70,
      bodyType: null,
      trainingDays: 3,
      minutesPerWorkout: 45,
      equipment: "gym",
    },
  );
  const [preferences, setPreferences] = useState(
    account?.settings || {
      weightUnit: "kg" as "kg" | "lb",
      restSeconds: 90,
      workoutReminders: false,
    },
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (settings)
        updateAccount(await api<Account>("/me/settings", { method: "PATCH", json: preferences }));
      else {
        await api("/me", { method: "PATCH", json: { name, bio } });
        const {
          goal,
          experience,
          gender,
          heightCm,
          weightKg,
          bodyType,
          trainingDays,
          minutesPerWorkout,
          equipment,
        } = profile;
        updateAccount(
          await api<Account>("/me/profile", {
            method: "PUT",
            json: {
              goal,
              experience,
              gender,
              heightCm,
              weightKg,
              bodyType,
              trainingDays,
              minutesPerWorkout,
              equipment,
            },
          }),
        );
      }
      setMessage("Saved. Your web and mobile preferences are now in sync.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save changes.");
    } finally {
      setBusy(false);
    }
  }
  function select(
    label: string,
    key: "goal" | "experience" | "gender" | "equipment",
    values: string[],
  ) {
    return (
      <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
        <span>{label}</span>
        <select
          value={profile[key]}
          onChange={(e) => setProfile({ ...profile, [key]: e.target.value })}
        >
          {values.map((value) => (
            <option value={value} key={value}>
              {pretty(value)}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-5 [&_h1]:mt-3 [&_p:not(:first-child)]:mt-4 [&_p:not(:first-child)]:max-w-2xl [&_p:not(:first-child)]:text-muted">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Make it yours
          </p>
          <h1>{settings ? "Account settings" : "Your fitness profile"}</h1>
          <p>
            {settings
              ? "Set your preferences for a training experience that fits."
              : "Your goals. Your pace. Your starting point."}
          </p>
        </div>
      </div>
      <form
        onSubmit={save}
        className="rounded-3xl bg-panel p-5 sm:p-7 max-w-4xl [&_h2]:mb-6 [&_h2]:text-2xl"
      >
        <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
          {settings ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                <span>Weight unit</span>
                <select
                  value={preferences.weightUnit}
                  onChange={(e) =>
                    setPreferences({ ...preferences, weightUnit: e.target.value as "kg" | "lb" })
                  }
                >
                  <option value="kg">Kilograms (kg)</option>
                  <option value="lb">Pounds (lb)</option>
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                <span>Default rest timer</span>
                <select
                  value={preferences.restSeconds}
                  onChange={(e) =>
                    setPreferences({ ...preferences, restSeconds: Number(e.target.value) })
                  }
                >
                  {[30, 60, 90, 120, 180].map((n) => (
                    <option key={n} value={n}>
                      {n} seconds
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 flex items-center gap-3 text-sm text-muted col-span-full">
                <input
                  type="checkbox"
                  checked={preferences.workoutReminders}
                  onChange={(e) =>
                    setPreferences({ ...preferences, workoutReminders: e.target.checked })
                  }
                />
                <span>Enable workout reminders in the mobile app</span>
              </label>
            </div>
          ) : (
            <>
              <h2>About you</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                  <span>Display name</span>
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                  <span>Google account</span>
                  <input value={account?.user.email || ""} readOnly />
                </label>
                <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2 col-span-full">
                  <span>Bio</span>
                  <textarea
                    maxLength={250}
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="What keeps you moving?"
                  />
                </label>
              </div>
              <h2 className="mt-8  pt-8">Your training</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {select("Primary goal", "goal", ["muscle", "strength", "fat_loss", "fitness"])}
                {select("Experience", "experience", ["beginner", "intermediate", "advanced"])}
                {select("Gender", "gender", ["male", "female", "prefer_not_to_say"])}
                {select("Available equipment", "equipment", ["gym", "dumbbells", "bodyweight"])}
                <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                  <span>Height (cm)</span>
                  <input
                    type="number"
                    required
                    min={100}
                    max={250}
                    step="0.1"
                    value={profile.heightCm}
                    onChange={(e) => setProfile({ ...profile, heightCm: Number(e.target.value) })}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                  <span>Weight (kg)</span>
                  <input
                    type="number"
                    required
                    min={25}
                    max={350}
                    step="0.1"
                    value={profile.weightKg}
                    onChange={(e) => setProfile({ ...profile, weightKg: Number(e.target.value) })}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                  <span>Training days per week</span>
                  <select
                    value={profile.trainingDays}
                    onChange={(e) =>
                      setProfile({ ...profile, trainingDays: Number(e.target.value) })
                    }
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "day" : "days"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                  <span>Minutes per workout</span>
                  <select
                    value={profile.minutesPerWorkout}
                    onChange={(e) =>
                      setProfile({ ...profile, minutesPerWorkout: Number(e.target.value) })
                    }
                  >
                    {[30, 45, 60].map((n) => (
                      <option key={n} value={n}>
                        {n} minutes
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}
          <div className="mt-8 flex justify-end  pt-6">
            <button
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={busy}
            >
              {busy ? "Saving…" : "Save changes"}
              <Icon name="check" size={17} />
            </button>
          </div>
        </fieldset>
        {error && (
          <div
            className="mb-5 flex flex-wrap items-start gap-3 rounded-2xl bg-surface p-4 text-sm leading-7 text-ink  bg-surface! text-ink!"
            role="alert"
          >
            {error}
          </div>
        )}
        {message && (
          <div
            className="mb-5 flex flex-wrap items-start gap-3 rounded-2xl bg-surface p-4 text-sm leading-7 text-ink bg-white/10! text-ink!"
            role="status"
          >
            {message}
          </div>
        )}
      </form>
    </>
  );
}
