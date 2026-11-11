"use client";
import Link from "next/link";
import { badgeClasses } from "@/lib/ui";
import { useEffect, useRef, useState } from "react";
import { api, pretty } from "@/lib/api";
import type {
  Exercise,
  ExerciseInput,
  ExerciseMedia,
  ExerciseTaxonomies,
  TaxonomyItem,
} from "@/lib/types";
import { Icon } from "./icon";
import { ConfirmDialog } from "./confirm-dialog";

const empty: ExerciseInput = {
  name: "",
  slug: "",
  description: "",
  category: "",
  activityType: "",
  bodyRegion: "",
  difficulty: "beginner",
  trackingType: "reps_weight",
  movementPattern: "push",
  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: [],
  instructions: [""],
  tips: [],
  mistakes: [],
  safetyNotes: [],
  breathingTip: "",
  status: "draft",
};
const splitLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
export function ExerciseEditor({ id }: { id?: string }) {
  const [tax, setTax] = useState<ExerciseTaxonomies | null>(null);
  const [value, setValue] = useState<ExerciseInput>(empty);
  const [saved, setSaved] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [retry, setRetry] = useState(0);
  const [image, setImage] = useState<File | null>(null);
  const [animation, setAnimation] = useState<File | null>(null);
  const [dragging, setDragging] = useState<"image" | "animation" | null>(null);
  const [meta, setMeta] = useState({ altText: "", credit: "", license: "", sourceUrl: "" });
  const [removing, setRemoving] = useState<ExerciseMedia | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const animationInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      api<ExerciseTaxonomies>("/exercises/taxonomies"),
      id ? api<Exercise>(`/exercises/${id}`) : Promise.resolve(null),
    ])
      .then(([taxonomy, exercise]) => {
        if (!active) return;
        setTax(taxonomy);
        if (exercise) {
          setSaved(exercise);
          setValue(exercise);
        } else
          setValue({
            ...empty,
            category: taxonomy.categories[0]?.code || "",
            activityType:
              taxonomy.activityTypes.find((a) => a.category === taxonomy.categories[0]?.code)
                ?.code || "",
            bodyRegion: taxonomy.bodyRegions[0]?.code || "",
          });
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, retry]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty || image || animation) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, image, animation]);
  function update<K extends keyof ExerciseInput>(key: K, next: ExerciseInput[K]) {
    setValue((v) => ({ ...v, [key]: next }));
    setDirty(true);
    setMessage("");
  }
  function choose(file: File | undefined, type: "image" | "animation") {
    setError("");
    if (!file) return;
    const allowed =
      type === "image" ? ["image/jpeg", "image/png", "image/webp"] : ["image/gif", "video/mp4"];
    if (!allowed.includes(file.type)) {
      setError(
        type === "image" ? "Choose a JPEG, PNG, or WebP image." : "Choose a GIF or MP4 animation.",
      );
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("Each media file must be 25 MB or smaller.");
      return;
    }
    if (type === "image") setImage(file);
    else setAnimation(file);
    setMessage("");
  }
  function dropZone(type: "image" | "animation") {
    return {
      className: `relative flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-md border border-dashed border-ink/30 bg-surface px-4 py-7 text-center hover:border-ink focus-within:border-ink [&>strong]:pointer-events-none [&>strong]:text-sm [&>strong]:break-all [&>span]:pointer-events-none [&>span]:text-xs [&>span]:text-muted [&>svg]:pointer-events-none [&>input]:absolute [&>input]:inset-0 [&>input]:size-full [&>input]:cursor-pointer [&>input]:opacity-0 has-disabled:cursor-not-allowed has-disabled:opacity-50 ${!busy && dragging === type ? "border-ink! bg-brand/25! ring-2 ring-ink/10" : ""}`,
      onDragEnter(event: React.DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) setDragging(type);
      },
      onDragOver(event: React.DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = busy ? "none" : "copy";
        if (!busy) setDragging(type);
      },
      onDragLeave(event: React.DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        if (
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget)
        )
          return;
        setDragging((current) => (current === type ? null : current));
      },
      onDrop(event: React.DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        event.stopPropagation();
        setDragging(null);
        if (busy) return;
        const files = Array.from(event.dataTransfer.files);
        if (!files.length) {
          for (const item of Array.from(event.dataTransfer.items)) {
            const file = item.kind === "file" ? item.getAsFile() : null;
            if (file) files.push(file);
          }
        }
        if (files.length > 1) {
          setError("Drop one file at a time in each media area.");
          return;
        }
        if (!files.length) {
          setError("Drop a media file from your computer.");
          return;
        }
        choose(files[0], type);
      },
    };
  }
  async function upload(exercise: Exercise, file: File) {
    const form = new FormData();
    form.set("media", file);
    Object.entries(meta).forEach(([key, text]) => form.set(key, text));
    return api<Exercise>(`/exercises/${exercise.id}/media`, { method: "POST", body: form });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if ((image || animation) && meta.license.trim().length < 3) {
      setError("Record the media usage rights before uploading.");
      return;
    }
    if (value.primaryMuscles.some((m) => value.secondaryMuscles.includes(m))) {
      setError("A muscle cannot be both primary and secondary.");
      return;
    }
    if (!value.instructions.some((line) => line.trim().length >= 2)) {
      setError("Add at least one instruction.");
      return;
    }
    if (value.status === "published" && !saved?.media.length && !image && !animation) {
      setError("Add at least one image before publishing. An animation is optional.");
      return;
    }
    setBusy(true);
    let current = saved;
    let detailsSaved = false;
    let stage = "Saving exercise details";
    try {
      // Save a new exercise as a draft first; media needs its persisted ID.
      const payload = {
        ...value,
        instructions: value.instructions.map((x) => x.trim()).filter(Boolean),
        status:
          (!current || !current.media.length) && value.status === "published"
            ? "draft"
            : value.status,
      };
      current = await api<Exercise>(current ? `/exercises/${current.id}` : "/exercises", {
        method: current ? "PATCH" : "POST",
        json: payload,
      });
      setSaved(current);
      detailsSaved = true;
      stage = "Uploading exercise image";
      if (image) {
        current = await upload(current, image);
        setSaved(current);
        setImage(null);
        if (imageInput.current) imageInput.current.value = "";
      }
      stage = "Uploading animation";
      if (animation) {
        current = await upload(current, animation);
        setSaved(current);
        setAnimation(null);
        if (animationInput.current) animationInput.current.value = "";
      }
      stage = "Updating publication status";
      if (current.status !== value.status) {
        current = await api<Exercise>(`/exercises/${current.id}`, {
          method: "PATCH",
          json: { status: value.status },
        });
        setSaved(current);
      }
      setValue(current);
      setDirty(false);
      setMessage(
        current.status === "published"
          ? "Exercise published. It’s now available on web and mobile."
          : `Exercise saved as ${current.status}. You can add more media anytime.`,
      );
      if (!id) window.history.replaceState(null, "", `/admin/exercises/${current.id}/edit`);
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Please try again.";
      setError(
        `${stage} failed. ${detail}${detailsSaved ? " Your exercise details were saved. Keep this editor open and retry the unfinished step after resolving the error." : " Your latest changes were not confirmed as saved."}`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function removeMedia() {
    if (!saved || !removing) return;
    setBusy(true);
    setError("");
    try {
      const next = await api<Exercise>(`/exercises/${saved.id}/media/${removing.id}`, {
        method: "DELETE",
      });
      setSaved(next);
      setMessage("Media removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove media.");
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  }
  function select(
    label: string,
    key:
      | "category"
      | "activityType"
      | "bodyRegion"
      | "difficulty"
      | "trackingType"
      | "movementPattern",
    options: TaxonomyItem[],
  ) {
    return (
      <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
        <span>
          {label} <b>*</b>
        </span>
        <select
          required
          value={value[key]}
          onChange={(e) => {
            const code = e.target.value;
            if (key === "category") {
              setValue((v) => ({
                ...v,
                category: code,
                activityType: tax?.activityTypes.find((a) => a.category === code)?.code || "",
              }));
              setDirty(true);
            } else update(key, code as never);
          }}
        >
          {options.map((item) => (
            <option value={item.code} key={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  function multiselect(
    label: string,
    key: "primaryMuscles" | "secondaryMuscles" | "equipment",
    options: TaxonomyItem[],
  ) {
    return (
      <fieldset className="mb-6 border-0 p-0 last:mb-0 [&_legend]:mb-3 [&_legend]:text-sm [&_legend]:font-medium [&>div]:flex [&>div]:flex-wrap [&>div]:gap-2">
        <legend>{label}</legend>
        <div>
          {options.map((item) => (
            <label
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-surface [&_input]:size-3.5 ${value[key].includes(item.code) ? "border-ink! bg-brand/25!" : ""}`}
              key={item.code}
            >
              <input
                type="checkbox"
                checked={value[key].includes(item.code)}
                onChange={(e) =>
                  update(
                    key,
                    e.target.checked
                      ? [...value[key], item.code]
                      : value[key].filter((code) => code !== item.code),
                  )
                }
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  function lines(
    label: string,
    key: "instructions" | "tips" | "mistakes" | "safetyNotes",
    help: string,
  ) {
    return (
      <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
        <span>
          {label}
          {key === "instructions" && <b> *</b>}
        </span>
        <textarea
          rows={key === "instructions" ? 5 : 3}
          required={key === "instructions"}
          value={value[key].join("\n")}
          onChange={(e) => update(key, e.target.value.split("\n"))}
          onBlur={() => update(key, splitLines(value[key].join("\n")))}
          placeholder={help}
        />
        <small>
          One {key === "instructions" ? "step" : "note"} per line. Up to 30 lines, 500 characters
          each.
        </small>
      </label>
    );
  }
  if (loading)
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-5 py-20 text-center [&>p]:max-w-lg [&>p]:leading-7 [&>p]:text-muted [&>h2]:text-3xl"
        role="status"
      >
        <span className="block size-7 animate-spin rounded-full border-3 border-line border-t-ink motion-reduce:animate-none" />
        Loading editor…
      </div>
    );
  if (!tax || (id && !saved))
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-5 py-20 text-center [&>p]:max-w-lg [&>p]:leading-7 [&>p]:text-muted [&>h2]:text-3xl">
        <h2>Couldn’t load the editor</h2>
        <p role="alert">{error}</p>
        <button
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => setRetry(retry + 1)}
        >
          Try again
        </button>
      </div>
    );
  const options = (items: string[]) => items.map((code) => ({ code, label: pretty(code) }));
  return (
    <>
      <Link
        href="/admin/exercises"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
        onClick={(e) => {
          if (
            (dirty || image || animation) &&
            !window.confirm("Leave without saving your changes?")
          )
            e.preventDefault();
        }}
      >
        <Icon name="back" size={16} />
        All exercises
      </Link>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-5 [&_h1]:mt-3 [&_p:not(:first-child)]:mt-4 [&_p:not(:first-child)]:max-w-2xl [&_p:not(:first-child)]:text-muted">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Build the library
          </p>
          <h1>{saved ? "Edit exercise" : "Add a new exercise"}</h1>
          <p>A clear demonstration. The right details. Better training for everyone.</p>
        </div>
        {saved && (
          <span
            className={`inline-flex w-fit items-center whitespace-nowrap rounded-full bg-white/6 px-3 py-1 text-xs font-semibold text-ink ${badgeClasses[saved.status] ?? ""}`}
          >
            {pretty(saved.status)}
          </span>
        )}
      </div>
      <form onSubmit={save}>
        <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="flex min-w-0 flex-col gap-6">
              <section className="rounded-3xl bg-panel p-5 sm:p-7">
                <div className="mb-6 flex items-start gap-4 [&>span]:flex [&>span]:size-9 [&>span]:shrink-0 [&>span]:items-center [&>span]:justify-center [&>span]:rounded-md [&>span]:bg-brand [&>span]:text-background [&>span]:text-sm [&>span]:font-semibold [&_h2]:text-xl [&_p]:mt-2 [&_p]:text-sm [&_p]:text-muted">
                  <span>
                    <Icon name="dumbbell" size={18} />
                  </span>
                  <div>
                    <h2>The essentials</h2>
                    <p>Give your exercise a name and a place in the library.</p>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                    <span>
                      Exercise name <b>*</b>
                    </span>
                    <input
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder="e.g. Incline dumbbell press"
                      value={value.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setValue((v) => ({
                          ...v,
                          name,
                          slug:
                            !saved &&
                            (!v.slug ||
                              v.slug ===
                                v.name
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, "-")
                                  .replace(/^-|-$/g, ""))
                              ? name
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, "-")
                                  .replace(/^-|-$/g, "")
                                  .slice(0, 80)
                              : v.slug,
                        }));
                        setDirty(true);
                      }}
                    />
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                    <span>
                      URL slug <b>*</b>
                    </span>
                    <input
                      required
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      maxLength={80}
                      value={value.slug}
                      onChange={(e) => update("slug", e.target.value)}
                      placeholder="incline-dumbbell-press"
                    />
                    <small>Lowercase letters, numbers, and hyphens.</small>
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2 col-span-full">
                    <span>Description</span>
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={value.description}
                      onChange={(e) => update("description", e.target.value)}
                      placeholder="What does this movement help the athlete do?"
                    />
                  </label>
                  {select("Category", "category", tax.categories)}
                  {select(
                    "Activity type",
                    "activityType",
                    tax.activityTypes.filter((a) => a.category === value.category),
                  )}
                  {select("Body region", "bodyRegion", tax.bodyRegions)}
                  {select(
                    "Difficulty",
                    "difficulty",
                    options(["beginner", "intermediate", "advanced"]),
                  )}
                  {select(
                    "Tracking type",
                    "trackingType",
                    options(["reps_weight", "reps", "duration", "distance_duration"]),
                  )}
                  {select(
                    "Movement pattern",
                    "movementPattern",
                    options([
                      "push",
                      "pull",
                      "squat",
                      "hinge",
                      "lunge",
                      "carry",
                      "rotation",
                      "locomotion",
                      "mobility",
                      "stillness",
                      "other",
                    ]),
                  )}
                </div>
              </section>
              <section className="rounded-3xl bg-panel p-5 sm:p-7">
                <div className="mb-6 flex items-start gap-4 [&>span]:flex [&>span]:size-9 [&>span]:shrink-0 [&>span]:items-center [&>span]:justify-center [&>span]:rounded-md [&>span]:bg-brand [&>span]:text-background [&>span]:text-sm [&>span]:font-semibold [&_h2]:text-xl [&_p]:mt-2 [&_p]:text-sm [&_p]:text-muted">
                  <span>
                    <Icon name="image" size={18} />
                  </span>
                  <div>
                    <h2>Muscles & equipment</h2>
                    <p>Help athletes find the right exercise for their training.</p>
                  </div>
                </div>
                {multiselect("Primary muscles", "primaryMuscles", tax.muscleGroups)}
                {multiselect("Secondary muscles", "secondaryMuscles", tax.muscleGroups)}
                {multiselect("Equipment", "equipment", tax.equipmentTypes)}
              </section>
              <section className="rounded-3xl bg-panel p-5 sm:p-7">
                <div className="mb-6 flex items-start gap-4 [&>span]:flex [&>span]:size-9 [&>span]:shrink-0 [&>span]:items-center [&>span]:justify-center [&>span]:rounded-md [&>span]:bg-brand [&>span]:text-background [&>span]:text-sm [&>span]:font-semibold [&_h2]:text-xl [&_p]:mt-2 [&_p]:text-sm [&_p]:text-muted">
                  <span>
                    <Icon name="check" size={18} />
                  </span>
                  <div>
                    <h2>Coach the movement</h2>
                    <p>Keep instructions clear and easy to follow.</p>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  {" "}
                  <div className="col-span-full">
                    {lines(
                      "Step-by-step instructions",
                      "instructions",
                      "Set up in the starting position.\nPerform the movement with control.",
                    )}
                  </div>
                  {lines("Coaching tips", "tips", "Helpful cues for better technique")}
                  {lines("Common mistakes", "mistakes", "What should the athlete avoid?")}
                  {lines("Safety notes", "safetyNotes", "Precautions and modifications")}
                  <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                    <span>Breathing cue</span>
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={value.breathingTip}
                      onChange={(e) => update("breathingTip", e.target.value)}
                      placeholder="e.g. Exhale as you press, inhale as you lower."
                    />
                  </label>
                </div>
              </section>
              <section className="rounded-3xl bg-panel p-5 sm:p-7">
                <div className="mb-6 flex items-start gap-4 [&>span]:flex [&>span]:size-9 [&>span]:shrink-0 [&>span]:items-center [&>span]:justify-center [&>span]:rounded-md [&>span]:bg-brand [&>span]:text-background [&>span]:text-sm [&>span]:font-semibold [&_h2]:text-xl [&_p]:mt-2 [&_p]:text-sm [&_p]:text-muted">
                  <span>04</span>
                  <div>
                    <h2>Images & demonstrations</h2>
                    <p>Add an image now. Animations are optional and can be added later.</p>
                  </div>
                </div>
                {saved && saved.media.length > 0 && (
                  <div className="mb-5 grid grid-cols-2 gap-4">
                    {saved.media.map((media) => (
                      <div
                        key={media.id}
                        className="overflow-hidden rounded-xl [&>img]:h-40 [&>img]:w-full [&>img]:bg-surface [&>img]:object-contain [&>video]:h-40 [&>video]:w-full [&>video]:bg-surface [&>video]:object-contain [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-2 [&>div]:px-3 [&>div]:py-2 [&>div]:text-xs [&>div]:text-muted"
                      >
                        {media.kind === "video" ? (
                          <video controls src={media.url} preload="metadata" />
                        ) : (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={media.url} alt={media.altText || value.name} />
                          </>
                        )}
                        <div>
                          <span>{media.credit || pretty(media.kind)}</span>
                          <button
                            type="button"
                            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink text-ink underline decoration-ink/30 underline-offset-4"
                            aria-label={`Remove ${media.altText || media.kind}`}
                            onClick={() => setRemoving(media)}
                          >
                            <Icon name="trash" size={17} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid gap-5 sm:grid-cols-2">
                  <label {...dropZone("image")}>
                    <Icon name="image" size={28} />
                    <strong>
                      {dragging === "image" && !busy
                        ? "Drop image here"
                        : image?.name || "Add exercise image"}
                    </strong>
                    <span>Drag & drop or click to choose a file</span>
                    <span>JPEG, PNG, WebP · up to 25 MB</span>
                    <input
                      ref={imageInput}
                      aria-label="Choose exercise image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => choose(e.target.files?.[0], "image")}
                    />
                  </label>
                  <label {...dropZone("animation")}>
                    <Icon name="play" size={26} />
                    <strong>
                      {dragging === "animation" && !busy
                        ? "Drop animation or video here"
                        : animation?.name || "Add animation or video (optional)"}
                    </strong>
                    <span>Drag & drop or click to choose a file</span>
                    <span>GIF or MP4 · up to 25 MB</span>
                    <input
                      ref={animationInput}
                      aria-label="Choose exercise animation or video"
                      type="file"
                      accept="image/gif,video/mp4"
                      onChange={(e) => choose(e.target.files?.[0], "animation")}
                    />
                  </label>
                </div>
                {(image || animation) && (
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                    {image && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 font-semibold text-ink underline-offset-4 hover:underline"
                        onClick={() => {
                          setImage(null);
                          if (imageInput.current) imageInput.current.value = "";
                        }}
                      >
                        Clear image
                      </button>
                    )}
                    {animation && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 font-semibold text-ink underline-offset-4 hover:underline"
                        onClick={() => {
                          setAnimation(null);
                          if (animationInput.current) animationInput.current.value = "";
                        }}
                      >
                        Clear animation
                      </button>
                    )}
                  </div>
                )}
                <div className="grid gap-5 sm:grid-cols-2 mt-6">
                  <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                    <span>Media description</span>
                    <input
                      maxLength={200}
                      value={meta.altText}
                      onChange={(e) => setMeta({ ...meta, altText: e.target.value })}
                      placeholder="Describe the movement shown"
                    />
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                    <span>Usage rights {(image || animation) && <b>*</b>}</span>
                    <input
                      required={Boolean(image || animation)}
                      minLength={3}
                      maxLength={150}
                      value={meta.license}
                      onChange={(e) => setMeta({ ...meta, license: e.target.value })}
                      placeholder="e.g. Original content, owned by FitSync"
                    />
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                    <span>Credit</span>
                    <input
                      maxLength={200}
                      value={meta.credit}
                      onChange={(e) => setMeta({ ...meta, credit: e.target.value })}
                      placeholder="Creator or photographer"
                    />
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                    <span>Source URL</span>
                    <input
                      type="url"
                      maxLength={1000}
                      value={meta.sourceUrl}
                      onChange={(e) => setMeta({ ...meta, sourceUrl: e.target.value })}
                      placeholder="https://…"
                    />
                  </label>
                </div>
                <p className="mt-6 flex items-start gap-2 text-xs text-muted">
                  <Icon name="upload" size={15} />
                  Files upload when you save. Media details apply to the selected uploads.
                </p>
              </section>
            </div>
            <aside className="xl:sticky xl:top-5 [&>div[role=alert]]:mt-4">
              <div className="rounded-3xl bg-panel p-6 [&_h2]:text-xl [&>p]:mt-3 [&>p]:mb-6 [&>p]:text-sm [&>p]:text-muted [&>small]:mt-4 [&>small]:block [&>small]:text-center [&>small]:text-xs [&>small]:text-muted">
                <h2>Publish settings</h2>
                <p>Choose when this exercise is ready for athletes.</p>
                <label className="flex min-w-0 flex-col gap-2 text-base [&>span:first-child]:text-sm [&>span:first-child]:font-medium [&>small]:text-xs [&>small]:text-muted [&>label]:grid [&>label]:gap-2">
                  <span>Visibility</span>
                  <select
                    value={value.status}
                    onChange={(e) => update("status", e.target.value as ExerciseInput["status"])}
                  >
                    <option value="draft">Draft — only admins</option>
                    <option value="published">Published — all athletes</option>
                    <option value="archived">Archived — hidden from library</option>
                  </select>
                </label>
                <div className="mt-6  pt-5 [&_p]:mb-3 [&_p]:flex [&_p]:items-center [&_p]:gap-2 [&_p]:text-xs [&_p]:text-muted">
                  <p>
                    <Icon name="check" size={16} />
                    Drafts can be saved without media
                  </p>
                  <p>
                    <Icon name="check" size={16} />
                    One image is enough to publish
                  </p>
                  <p>
                    <Icon name="check" size={16} />
                    Animations can be added later
                  </p>
                </div>
                <button
                  className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 mt-3 w-full"
                  disabled={busy}
                  type="submit"
                >
                  {busy
                    ? "Saving & uploading…"
                    : value.status === "published"
                      ? "Save & publish"
                      : "Save exercise"}
                  {!busy && <Icon name="check" size={17} />}
                </button>
                {saved && (
                  <Link
                    className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 bg-panel! text-ink!  hover:bg-surface!  mt-3 w-full"
                    href={`/exercises/${saved.slug}`}
                  >
                    Preview exercise
                    <Icon name="arrow" size={16} />
                  </Link>
                )}
                <small>
                  {dirty
                    ? "You have unsaved changes."
                    : saved
                      ? "Your exercise is saved."
                      : "Your new exercise starts as a draft."}
                </small>
              </div>
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
              <div className="p-6 text-sm text-muted [&_svg]:mb-3 [&_svg]:text-ink [&_h3]:text-base [&_h3]:text-ink [&_p]:mt-2 [&_p]:leading-7">
                <Icon name="shield" size={20} />
                <h3>Shared across FitSync</h3>
                <p>Publishing updates the same library your athletes use in the mobile app.</p>
              </div>
            </aside>
          </div>
        </fieldset>
      </form>
      {removing && (
        <ConfirmDialog
          title="Remove this media?"
          description="This removes the file from the exercise and its storage provider. Save the exercise as a draft before removing its last demonstration."
          confirm="Remove media"
          busy={busy}
          onCancel={() => setRemoving(null)}
          onConfirm={() => void removeMedia()}
        />
      )}
    </>
  );
}
