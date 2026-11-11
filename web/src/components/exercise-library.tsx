"use client";
import Link from "next/link";
import { badgeClasses } from "@/lib/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, pretty } from "@/lib/api";
import type { Exercise, ExercisePage, ExerciseTaxonomies } from "@/lib/types";
import { Icon } from "./icon";
import { useSession } from "./session";
import { ConfirmDialog } from "./confirm-dialog";

export function MediaPreview({ exercise }: { exercise: Exercise }) {
  const media = exercise.media.find((item) => item.kind === "image") || exercise.media[0];
  if (!media)
    return (
      <div className="flex h-full min-h-45 flex-col items-center justify-center gap-4 bg-surface text-sm text-muted">
        <Icon name="dumbbell" size={40} />
        <span>Demonstration coming soon</span>
      </div>
    );
  if (media.kind === "video")
    return (
      <video
        src={media.url}
        muted
        preload="metadata"
        aria-label={`${exercise.name} demonstration`}
      />
    );
  // Remote Cloudinary URLs and legacy Supabase assets are both supported.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={media.url} alt={media.altText || exercise.name} loading="lazy" />;
}
export function ExerciseLibrary({ admin = false }: { admin?: boolean }) {
  const { account } = useSession();
  const [tax, setTax] = useState<ExerciseTaxonomies | null>(null);
  const [data, setData] = useState<ExercisePage | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: "",
    muscle: "",
    equipment: "",
    difficulty: "",
    category: "",
    status: "",
  });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [deleting, setDeleting] = useState<Exercise | null>(null);
  const [busy, setBusy] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const lastQuery = useRef("");
  const [hasMore, setHasMore] = useState(false);
  const queryKey = JSON.stringify([admin, applied, account]);
  useEffect(() => {
    let active = true;
    api<ExerciseTaxonomies>("/exercises/taxonomies")
      .then((result) => {
        if (active) setTax(result);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [account]);
  useEffect(() => {
    let active = true;
    if (lastQuery.current !== queryKey) {
      lastQuery.current = queryKey;
      setData(null);
      setHasMore(false);
      if (page !== 1) {
        setPage(1);
        return;
      }
    }
    pending.current = true;
    setLoading(true);
    setError("");
    if (page === 1) setData(null);
    const params = new URLSearchParams({ page: String(page), pageSize: "15" });
    Object.entries(applied).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (admin) params.set("includeDrafts", "true");
    api<ExercisePage>(`/exercises?${params}`)
      .then((result) => {
        if (!active) return;
        setData((previous) => {
          if (page === 1 || !previous) return result;
          const seen = new Set(previous.items.map((item) => item.id));
          return {
            ...result,
            items: [...previous.items, ...result.items.filter((item) => !seen.has(item.id))],
          };
        });
        setHasMore(result.items.length > 0 && result.page * result.pageSize < result.total);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) {
          pending.current = false;
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [admin, page, applied, refresh, queryKey]);
  const loadMore = useCallback(() => {
    if (
      pending.current ||
      loading ||
      error ||
      !hasMore ||
      data?.page !== page ||
      lastQuery.current !== queryKey
    )
      return;
    pending.current = true;
    setPage((current) => current + 1);
  }, [loading, error, hasMore, data?.page, page, queryKey]);
  useEffect(() => {
    if (
      !sentinel.current ||
      !hasMore ||
      loading ||
      error ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [hasMore, loading, error, loadMore]);
  function select(
    label: string,
    key: keyof typeof filters,
    items: { code: string; label: string }[],
  ) {
    return (
      <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
        <span>{label}</span>
        <select
          value={filters[key]}
          onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
        >
          <option value="">All {label.toLowerCase()}</option>
          {items.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/exercises/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      setData(null);
      setHasMore(false);
      setPage(1);
      setRefresh((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete exercise.");
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-5 [&_h1]:mt-3 [&_p:not(:first-child)]:mt-4 [&_p:not(:first-child)]:max-w-2xl [&_p:not(:first-child)]:text-muted">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {admin ? "Exercise management" : "Exercise library"}
          </p>
          <h1>{admin ? "Your exercise library" : "Find the right movement"}</h1>
          <p>
            {admin
              ? "Create, refine, and publish exercises for every FitSync athlete."
              : "Find your focus. Learn the technique. Make every movement count."}
          </p>
        </div>
        {admin ? (
          <Link
            href="/admin/exercises/new"
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="plus" size={18} />
            Add exercise
          </Link>
        ) : (
          <span className="hidden size-20 shrink-0 -rotate-6 items-center justify-center bg-white text-black sm:flex">
            <Icon name="dumbbell" size={42} />
          </span>
        )}
      </div>
      {admin && (
        <div className="mb-5 flex flex-wrap items-start gap-3 rounded-2xl bg-surface p-4 text-sm leading-7 text-ink  bg-surface! text-ink!">
          <Icon name="image" />
          <span>
            Start with an image. Add an optional GIF or MP4 demonstration whenever you’re ready.
          </span>
        </div>
      )}
      <form
        className="rounded-3xl bg-panel mb-7 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setApplied({ ...filters });
        }}
      >
        <div className="mb-6 flex items-center gap-3 [&_h2]:text-xl [&>span]:ml-auto [&>span]:text-sm [&>span]:text-muted max-sm:[&>span]:hidden">
          <Icon name="filter" />
          <h2>Search and filter</h2>
          <span className="text-muted">Make the library yours</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2 max-sm:col-span-full">
            <span>Search exercises</span>
            <span className="relative block [&>svg]:pointer-events-none [&>svg]:absolute [&>svg]:top-1/2 [&>svg]:left-3.5 [&>svg]:-translate-y-1/2 [&>svg]:text-muted [&>input]:pl-11!">
              <Icon name="search" size={18} />
              <input
                type="search"
                placeholder="Search by exercise name…"
                value={filters.q}
                maxLength={100}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              />
            </span>
          </label>
          {select("Muscles", "muscle", tax?.muscleGroups || [])}
          {select("Equipment", "equipment", tax?.equipmentTypes || [])}
          {select(
            "Levels",
            "difficulty",
            ["beginner", "intermediate", "advanced"].map((code) => ({ code, label: pretty(code) })),
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-3 [&>label]:min-w-44 [&>label]:flex-1">
          {select("Categories", "category", tax?.categories || [])}
          {admin &&
            select(
              "Statuses",
              "status",
              ["draft", "published", "archived"].map((code) => ({ code, label: pretty(code) })),
            )}
          <button
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
          >
            <Icon name="filter" size={17} />
            Apply filters
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 bg-transparent! text-muted! hover:bg-surface! hover:text-ink!"
            onClick={() => {
              const blank = {
                q: "",
                muscle: "",
                equipment: "",
                difficulty: "",
                category: "",
                status: "",
              };
              setFilters(blank);
              setApplied(blank);
              setPage(1);
            }}
          >
            Clear all
          </button>
        </div>
      </form>
      <div className="my-6 flex items-center justify-between gap-4 text-sm text-muted [&_strong]:text-ink [&>span]:text-xs">
        <p>
          <strong>{data?.total ?? "—"}</strong> {admin ? "exercises" : "movements to explore"}
        </p>
        <span>Sorted by name, A–Z</span>
      </div>
      {error && (
        <div
          className="mb-5 flex flex-wrap items-start gap-3 rounded-2xl bg-surface p-4 text-sm leading-7 text-ink  bg-surface! text-ink!"
          role="alert"
        >
          {error}
          <button
            className="inline-flex items-center gap-2 font-semibold text-ink underline-offset-4 hover:underline"
            onClick={() => setRefresh((n) => n + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {loading && !data ? (
        <div
          className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="Loading exercises"
          aria-busy="true"
        >
          {Array.from({ length: 6 }, (_, n) => (
            <div
              className="h-80 overflow-hidden rounded-3xl bg-panel [&>div]:h-50 [&>div]:animate-pulse [&>div]:bg-surface [&>span]:m-5 [&>span]:block [&>span]:h-4 [&>span]:w-2/3 [&>span]:bg-surface"
              key={n}
            >
              <div />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : (
        data &&
        (data.items.length ? (
          admin ? (
            <div className="rounded-3xl bg-panel overflow-x-auto">
              <table className="w-full border-collapse text-left whitespace-nowrap [&_th]:border-b [&_th]:border-line [&_th]:bg-surface [&_th]:px-5 [&_th]:py-4 [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-muted [&_th]:uppercase [&_td]:border-b [&_td]:border-line [&_td]:px-5 [&_td]:py-4 [&_td]:text-sm [&_tr:last-child_td]:border-b-0 [&_tbody_tr]:hover:bg-surface/60 [&_small]:mt-1 [&_small]:block [&_small]:text-xs [&_small]:text-muted">
                <thead>
                  <tr>
                    <th>Exercise</th>
                    <th>Classification</th>
                    <th>Media</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((exercise) => (
                    <tr key={exercise.id}>
                      <td>
                        <Link
                          className="flex items-center gap-3 [&_strong]:block [&_strong]:max-w-64 [&_strong]:whitespace-normal"
                          href={`/admin/exercises/${exercise.id}/edit`}
                        >
                          <span className="block size-14 shrink-0 overflow-hidden rounded-xl [&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover [&>div]:min-h-0 [&>div]:h-full [&>div]:gap-0 [&_svg]:size-6 [&_span]:hidden">
                            <MediaPreview exercise={exercise} />
                          </span>
                          <span>
                            <strong>{exercise.name}</strong>
                            <small>
                              {pretty(exercise.difficulty)} ·{" "}
                              {exercise.equipment.map(pretty).join(", ") || "No equipment"}
                            </small>
                          </span>
                        </Link>
                      </td>
                      <td>
                        {exercise.categoryLabel}
                        <small>
                          {exercise.primaryMuscles.map(pretty).join(", ") || exercise.regionLabel}
                        </small>
                      </td>
                      <td>
                        <span className="flex items-center gap-2 text-muted">
                          <Icon name="image" size={16} />
                          {exercise.media.filter((m) => m.kind === "image").length}
                          <Icon name="play" size={14} />
                          {exercise.media.filter((m) => m.kind === "video").length}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex w-fit items-center whitespace-nowrap rounded-full bg-white/6 px-3 py-1 text-xs font-semibold text-ink ${badgeClasses[exercise.status] ?? ""}`}
                        >
                          {pretty(exercise.status)}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
                            href={`/admin/exercises/${exercise.id}/edit`}
                            aria-label={`Edit ${exercise.name}`}
                          >
                            <Icon name="edit" size={18} />
                          </Link>
                          <button
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink text-ink underline decoration-ink/30 underline-offset-4"
                            onClick={() => setDeleting(exercise)}
                            aria-label={`Delete ${exercise.name}`}
                          >
                            <Icon name="trash" size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {data.items.map((exercise) => (
                <Link
                  className="overflow-hidden rounded-3xl bg-panel transition-transform hover:-translate-y-1 "
                  key={exercise.id}
                  href={`/exercises/${exercise.slug}`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-surface [&>img]:size-full [&>img]:object-contain [&>video]:size-full [&>video]:object-contain">
                    <MediaPreview exercise={exercise} />
                    <span
                      className={`inline-flex w-fit items-center whitespace-nowrap rounded-full bg-white/6 px-3 py-1 text-xs font-semibold text-ink absolute top-3 left-3 ${badgeClasses[exercise.difficulty] ?? ""}`}
                    >
                      {pretty(exercise.difficulty)}
                    </span>
                    {exercise.media.some((m) => m.kind === "video") && (
                      <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-sm bg-background/85 px-2 py-1 text-xs text-white">
                        <Icon name="play" size={12} />
                        Video
                      </span>
                    )}
                  </div>
                  <div className="p-5 sm:p-6 [&_h2]:my-3 [&_h2]:text-2xl [&>p]:text-sm [&>p]:text-muted">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      {exercise.categoryLabel}
                    </p>
                    <h2>{exercise.name}</h2>
                    <p>{exercise.primaryMuscles.map(pretty).join(" · ") || exercise.regionLabel}</p>
                    <div className="mt-5 flex items-center justify-between gap-3  pt-4 text-sm text-muted">
                      <span>{exercise.equipment.map(pretty).join(", ") || "No equipment"}</span>
                      <Icon name="arrow" size={18} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-5 py-20 text-center [&>p]:max-w-lg [&>p]:leading-7 [&>p]:text-muted [&>h2]:text-3xl rounded-3xl bg-panel">
            <Icon name="search" size={32} />
            <h2>No exercises found</h2>
            <p>
              {admin
                ? "Add your first exercise or try adjusting the filters."
                : "Try another search or check back as the library grows."}
            </p>
            {admin && (
              <Link
                href="/admin/exercises/new"
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add exercise
              </Link>
            )}
          </div>
        ))
      )}
      <div
        ref={sentinel}
        className="mt-7 flex flex-wrap items-center justify-between gap-5 text-sm text-muted [&>div]:flex [&>div]:items-center [&>div]:gap-4"
        aria-live="polite"
        aria-busy={loading}
      >
        {data && data.total > 0 && (
          <span>
            Showing {data.items.length} of {data.total}
          </span>
        )}
        {loading && data && <span role="status">Loading more exercises…</span>}
        {!loading && !error && hasMore && (
          <button
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 bg-panel! text-ink!  hover:bg-surface!  min-h-10! px-4! py-2! text-sm!"
            onClick={loadMore}
          >
            Load more
          </button>
        )}
        {!loading && data && data.items.length > 0 && !hasMore && !error && (
          <span>All exercises loaded</span>
        )}
      </div>
      {deleting && (
        <ConfirmDialog
          title="Delete this exercise?"
          description={`“${deleting.name}” and its media will be permanently removed from the shared web and mobile library. This cannot be undone. You can archive it in the editor instead.`}
          confirm="Delete exercise"
          busy={busy}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void remove()}
        />
      )}
    </>
  );
}
