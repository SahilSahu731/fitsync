"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, pretty } from "@/lib/api";
import type { Exercise } from "@/lib/types";
import { Icon } from "./icon";
import { useSession } from "./session";
export function ExerciseDetail({ id }: { id: string }) {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const { admin } = useSession();
  useEffect(() => {
    let active = true;
    setError("");
    api<Exercise>(`/exercises/${encodeURIComponent(id)}`)
      .then((data) => {
        if (active) setExercise(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, retry]);
  if (error)
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-5 py-20 text-center [&>p]:max-w-lg [&>p]:leading-7 [&>p]:text-muted [&>h2]:text-3xl">
        <h2>Couldn’t load this exercise</h2>
        <p role="alert">{error}</p>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-brand px-5 py-3 text-base font-semibold text-background transition-colors hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setRetry(retry + 1)}
        >
          Try again
        </button>
        <Link href="/exercises">Back to library</Link>
      </div>
    );
  if (!exercise)
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-5 py-20 text-center [&>p]:max-w-lg [&>p]:leading-7 [&>p]:text-muted [&>h2]:text-3xl"
        role="status"
      >
        <span className="block size-7 animate-spin rounded-full border-3 border-line border-t-ink motion-reduce:animate-none" />
        Loading exercise…
      </div>
    );
  return (
    <>
      <Link
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
        href="/exercises"
      >
        <Icon name="back" size={16} />
        Exercise library
      </Link>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-5 [&_h1]:mt-3 [&_p:not(:first-child)]:mt-4 [&_p:not(:first-child)]:max-w-2xl [&_p:not(:first-child)]:text-muted">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {exercise.categoryLabel} / {exercise.activityLabel}
          </p>
          <h1>{exercise.name}</h1>
          <p>{exercise.description}</p>
        </div>
        {admin && (
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-brand px-5 py-3 text-base font-semibold text-background transition-colors hover:bg-brand-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 bg-panel! text-ink! ring-1 ring-inset ring-line hover:bg-surface! hover:ring-ink"
            href={`/admin/exercises/${exercise.id}/edit`}
          >
            <Icon name="edit" size={16} />
            Edit exercise
          </Link>
        )}
      </div>
      <div className="grid items-start gap-7 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="rounded-lg border border-line bg-panel mb-6 p-4 [&_figure]:mb-5 [&_figure:last-child]:mb-0 [&_img]:max-h-130 [&_img]:w-full [&_img]:object-contain [&_img]:bg-surface [&_video]:max-h-130 [&_video]:w-full [&_video]:object-contain [&_video]:bg-surface [&_figcaption]:px-1 [&_figcaption]:pt-3 [&_figcaption]:text-xs [&_figcaption]:text-muted [&_a]:underline">
            {exercise.media.length ? (
              exercise.media.map((media) => (
                <figure key={media.id}>
                  {media.kind === "video" ? (
                    <video
                      src={media.url}
                      controls
                      playsInline
                      preload="metadata"
                      aria-label={media.altText || `${exercise.name} demonstration`}
                    />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={media.url} alt={media.altText || exercise.name} />
                    </>
                  )}
                  <figcaption>
                    {media.altText}
                    {media.credit && ` · ${media.credit}`}
                    {media.license && ` · ${media.license}`}
                    {media.sourceUrl && (
                      <>
                        {" "}
                        ·{" "}
                        <a href={media.sourceUrl} target="_blank" rel="noreferrer">
                          Source
                        </a>
                      </>
                    )}
                  </figcaption>
                </figure>
              ))
            ) : (
              <div className="flex h-full min-h-45 flex-col items-center justify-center gap-4 bg-surface text-sm text-muted">
                <Icon name="dumbbell" size={50} />
                <p>No demonstration added yet.</p>
              </div>
            )}
          </div>
          <section className="rounded-lg border border-line bg-panel p-6 sm:p-8 [&_h2]:mt-3 [&_ol]:mt-6 [&_li]:flex [&_li]:items-start [&_li]:gap-5 [&_li]:border-b [&_li]:border-line [&_li]:py-5 [&_li:last-child]:border-0 [&_li>span]:min-w-6 [&_li>span]:text-sm [&_li>span]:font-semibold [&_li>p]:leading-7 [&_li>p]:text-muted">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              The technique
            </p>
            <h2>How to do it</h2>
            <ol>
              {exercise.instructions.map((line, i) => (
                <li key={i}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <p>{line}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside>
          <div className="rounded-lg border border-line bg-panel mb-6 p-6 [&_h2]:mb-5 [&>div]:flex [&>div]:justify-between [&>div]:gap-5 [&>div]:border-b [&>div]:border-line [&>div]:py-4 [&>div]:text-sm [&>div:last-child]:border-0 [&_span]:shrink-0 [&_span]:text-muted [&_strong]:text-right [&_strong]:font-medium">
            <h2>At a glance</h2>
            {[
              ["Level", pretty(exercise.difficulty)],
              ["Primary muscles", exercise.primaryMuscles.map(pretty).join(", ")],
              ["Secondary muscles", exercise.secondaryMuscles.map(pretty).join(", ")],
              ["Equipment", exercise.equipment.map(pretty).join(", ") || "None"],
              ["Body region", exercise.regionLabel],
              ["Movement", pretty(exercise.movementPattern)],
              ["Tracking", pretty(exercise.trackingType)],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
          </div>
          {[
            ["Coaching tips", exercise.tips],
            ["Common mistakes", exercise.mistakes],
            ["Safety notes", exercise.safetyNotes],
          ].map(
            ([title, lines]) =>
              (lines as string[]).length > 0 && (
                <section
                  className="rounded-lg border border-line bg-panel mb-6 p-6 [&_h2]:text-xl [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-2 [&_li]:text-sm [&_li]:leading-7 [&_li]:text-muted"
                  key={title as string}
                >
                  <h2>{title}</h2>
                  <ul>
                    {(lines as string[]).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </section>
              ),
          )}
          {exercise.breathingTip && (
            <div className="mb-5 flex flex-wrap items-start gap-3 rounded-md border border-line bg-surface p-4 text-sm leading-7 text-ink border-line! bg-surface! text-ink!">
              <span>
                <strong>Keep breathing</strong>
                <br />
                {exercise.breathingTip}
              </span>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
