"use client";
import Link from "next/link";
import { useState } from "react";
import type { Account } from "@/lib/types";
import { api, pretty } from "@/lib/api";
import { useSession } from "./session";
import { Icon } from "./icon";
export function UserOverview() {
  const { account, admin } = useSession();
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-5 [&_h1]:mt-3 [&_p:not(:first-child)]:mt-4 [&_p:not(:first-child)]:max-w-2xl [&_p:not(:first-child)]:text-muted">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Your fitness, in sync
          </p>
          <h1>Hey, {account?.user.name.split(" ")[0]}.</h1>
          <p>Every session is another step forward. Make today count.</p>
        </div>
        {admin && (
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-brand px-5 py-3 text-base font-semibold text-background transition-colors hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 bg-panel! text-ink! ring-1 ring-inset ring-line hover:bg-surface! hover:ring-ink"
            href="/admin"
          >
            Admin workspace
            <Icon name="arrow" size={16} />
          </Link>
        )}
      </div>
      <div className="mb-7 bg-background p-7 text-white sm:p-10 [&_h2]:text-3xl [&_p]:mt-4 [&_p]:max-w-xl [&_p]:text-white/65 [&_a]:mt-6">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-brand text-background">
          <Icon name="dumbbell" size={32} />
        </span>
        <h2>Find your next movement.</h2>
        <p>
          Explore exercises for your goals, your equipment, and the way you train. Learn the
          technique before your next session.
        </p>
        <Link
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-brand px-5 py-3 text-base font-semibold text-background transition-colors hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          href="/exercises"
        >
          Explore the library
          <Icon name="arrow" size={17} />
        </Link>
      </div>
      <div className="mb-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
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
          <div
            className="rounded-lg border border-line bg-panel relative p-5 sm:p-6 [&>span]:text-sm [&>span]:text-muted [&>strong]:mt-3 [&>strong]:block [&>strong]:text-4xl [&>strong]:font-semibold [&>svg]:absolute [&>svg]:top-6 [&>svg]:right-5 [&>svg]:text-ink max-sm:[&>svg]:hidden [&>strong]:text-2xl!"
            key={label}
          >
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-line bg-panel flex flex-col items-start justify-between gap-6 p-7 sm:flex-row sm:items-center [&_p]:mt-3 [&_p]:max-w-xl [&_p]:text-muted">
        <div>
          <h2>
            {account?.profile ? "A profile that moves with you." : "Let’s make this personal."}
          </h2>
          <p>
            {account?.profile
              ? "Update your goals and preferences as your training evolves."
              : "Tell us about your goals and training preferences. Your profile also appears in the mobile app."}
          </p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-brand px-5 py-3 text-base font-semibold text-background transition-colors hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 bg-panel! text-ink! ring-1 ring-inset ring-line hover:bg-surface! hover:ring-ink"
          href="/user/profile"
        >
          {account?.profile ? "Edit profile" : "Set up profile"}
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
        className="rounded-lg border border-line bg-panel p-5 sm:p-7 max-w-4xl [&_h2]:mb-6 [&_h2]:text-2xl"
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
              <h2 className="mt-8 border-t border-line pt-8">Your training</h2>
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
          <div className="mt-8 flex justify-end border-t border-line pt-6">
            <button
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-brand px-5 py-3 text-base font-semibold text-background transition-colors hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
            className="mb-5 flex flex-wrap items-start gap-3 rounded-md border border-line bg-surface p-4 text-sm leading-7 text-ink border-ink/25! bg-surface! text-ink!"
            role="alert"
          >
            {error}
          </div>
        )}
        {message && (
          <div
            className="mb-5 flex flex-wrap items-start gap-3 rounded-md border border-line bg-surface p-4 text-sm leading-7 text-ink border-brand! bg-brand/20! text-ink!"
            role="status"
          >
            {message}
          </div>
        )}
      </form>
    </>
  );
}
