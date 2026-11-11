"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ExercisePage } from "@/lib/types";
import { Icon } from "./icon";
import { useSession } from "./session";
export function AdminOverview() {
  const { account } = useSession();
  const [counts, setCounts] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    Promise.all(
      ["", "published", "draft", "archived"].map((status) =>
        api<ExercisePage>(
          `/exercises?includeDrafts=true&pageSize=1${status ? `&status=${status}` : ""}`,
        ),
      ),
    )
      .then((results) => {
        if (active) setCounts(results.map((item) => item.total));
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-5 [&_h1]:mt-3 [&_p:not(:first-child)]:mt-4 [&_p:not(:first-child)]:max-w-2xl [&_p:not(:first-child)]:text-muted">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Admin overview
          </p>
          <h1>Welcome back, {account?.user.name.split(" ")[0]}.</h1>
          <p>A stronger library starts with the details. Let’s make them count.</p>
        </div>
        <Link
          href="/admin/exercises/new"
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="plus" size={18} />
          Add exercise
        </Link>
      </div>
      {error && (
        <div
          className="mb-5 flex flex-wrap items-start gap-3 rounded-2xl bg-surface p-4 text-sm leading-7 text-ink  bg-surface! text-ink!"
          role="alert"
        >
          {error}
          <button
            className="inline-flex items-center gap-2 font-semibold text-ink underline-offset-4 hover:underline"
            onClick={() => setRetry(retry + 1)}
          >
            Try again
          </button>
        </div>
      )}
      <div className="mb-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {["Total exercises", "Published", "Drafts", "Archived"].map((label, i) => (
          <div
            key={label}
            className="rounded-3xl bg-panel relative p-5 sm:p-6 [&>span]:text-sm [&>span]:text-muted [&>strong]:mt-3 [&>strong]:block [&>strong]:text-4xl [&>strong]:font-semibold [&>svg]:absolute [&>svg]:top-6 [&>svg]:right-5 [&>svg]:text-ink max-sm:[&>svg]:hidden"
          >
            <span>{label}</span>
            <strong>{counts[i] ?? "—"}</strong>
            <Icon name={["dumbbell", "check", "edit", "book"][i]} size={23} />
          </div>
        ))}
      </div>
      <div className="mb-7 bg-background p-7 text-white sm:p-10 [&_h2]:text-3xl [&_p]:mt-4 [&_p]:max-w-xl [&_p]:text-white/65 [&_a]:mt-6">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/8 text-white">
          <Icon name="dumbbell" size={32} />
        </span>
        <h2>One library. Every athlete.</h2>
        <p>
          Manage exercise instructions, images, and optional animations in one place. Publish when
          it’s ready, and your mobile and web athletes see the same movement.
        </p>
        <Link
          href="/admin/exercises"
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Manage exercises
          <Icon name="arrow" size={18} />
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          [
            "Create",
            "Create the movement",
            "Add the name, muscle groups, equipment, and clear instructions.",
          ],
          ["Technique", "Show the technique", "Upload an image. Add a GIF or MP4 now or later."],
          [
            "Publish",
            "Make it available",
            "Publish to the library, or keep a draft until it’s ready.",
          ],
        ].map(([n, title, text]) => (
          <div
            className="rounded-3xl bg-panel flex flex-col items-start gap-5 p-7 [&_h2]:text-2xl [&_p]:flex-1 [&_p]:leading-7 [&_p]:text-muted"
            key={n}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {n}
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </>
  );
}
