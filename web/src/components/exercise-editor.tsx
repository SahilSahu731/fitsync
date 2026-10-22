"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, pretty } from "@/lib/api";
import type { Exercise, ExerciseInput, ExerciseMedia, ExerciseTaxonomies, TaxonomyItem } from "@/lib/types";
import { Icon } from "./icon";
import { ConfirmDialog } from "./confirm-dialog";

const empty: ExerciseInput = { name: "", slug: "", description: "", category: "", activityType: "", bodyRegion: "", difficulty: "beginner", trackingType: "reps_weight", movementPattern: "push", primaryMuscles: [], secondaryMuscles: [], equipment: [], instructions: [""], tips: [], mistakes: [], safetyNotes: [], breathingTip: "", status: "draft" };
const splitLines = (text: string) => text.split("\n").map(line => line.trim()).filter(Boolean);
export function ExerciseEditor({ id }: { id?: string }) {
  const [tax, setTax] = useState<ExerciseTaxonomies | null>(null); const [value, setValue] = useState<ExerciseInput>(empty);
  const [saved, setSaved] = useState<Exercise | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [dirty, setDirty] = useState(false); const [retry, setRetry] = useState(0);
  const [image, setImage] = useState<File | null>(null); const [animation, setAnimation] = useState<File | null>(null);
  const [meta, setMeta] = useState({ altText: "", credit: "", license: "", sourceUrl: "" });
  const [removing, setRemoving] = useState<ExerciseMedia | null>(null); const imageInput = useRef<HTMLInputElement>(null); const animationInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true; setLoading(true); setError("");
    Promise.all([api<ExerciseTaxonomies>("/exercises/taxonomies"), id ? api<Exercise>(`/exercises/${id}`) : Promise.resolve(null)]).then(([taxonomy, exercise]) => {
      if (!active) return; setTax(taxonomy);
      if (exercise) { setSaved(exercise); setValue(exercise); }
      else setValue({ ...empty, category: taxonomy.categories[0]?.code || "", activityType: taxonomy.activityTypes.find(a => a.category === taxonomy.categories[0]?.code)?.code || "", bodyRegion: taxonomy.bodyRegions[0]?.code || "" });
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, retry]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty || image || animation) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, image, animation]);
  function update<K extends keyof ExerciseInput>(key: K, next: ExerciseInput[K]) { setValue(v => ({ ...v, [key]: next })); setDirty(true); setMessage(""); }
  function choose(file: File | undefined, type: "image" | "animation") {
    setError(""); if (!file) return;
    const allowed = type === "image" ? ["image/jpeg", "image/png", "image/webp"] : ["image/gif", "video/mp4"];
    if (!allowed.includes(file.type)) { setError(type === "image" ? "Choose a JPEG, PNG, or WebP image." : "Choose a GIF or MP4 animation."); return; }
    if (file.size > 25 * 1024 * 1024) { setError("Each media file must be 25 MB or smaller."); return; }
    if (type === "image") setImage(file); else setAnimation(file); setMessage("");
  }
  async function upload(exercise: Exercise, file: File) {
    const form = new FormData(); form.set("media", file);
    Object.entries(meta).forEach(([key, text]) => form.set(key, text));
    return api<Exercise>(`/exercises/${exercise.id}/media`, { method: "POST", body: form });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    if ((image || animation) && meta.license.trim().length < 3) { setError("Record the media usage rights before uploading."); return; }
    if (value.primaryMuscles.some(m => value.secondaryMuscles.includes(m))) { setError("A muscle cannot be both primary and secondary."); return; }
    if (!value.instructions.some(line => line.trim().length >= 2)) { setError("Add at least one instruction."); return; }
    if (value.status === "published" && !saved?.media.length && !image && !animation) { setError("Add at least one image before publishing. An animation is optional."); return; }
    setBusy(true); let current = saved;
    let detailsSaved = false;
    let stage = "Saving exercise details";
    try {
      // Save a new exercise as a draft first; media needs its persisted ID.
      const payload = { ...value, instructions: value.instructions.map(x => x.trim()).filter(Boolean), status: (!current || !current.media.length) && value.status === "published" ? "draft" : value.status };
      current = await api<Exercise>(current ? `/exercises/${current.id}` : "/exercises", { method: current ? "PATCH" : "POST", json: payload });
      setSaved(current);
      detailsSaved = true;
      stage = "Uploading exercise image";
      if (image) { current = await upload(current, image); setSaved(current); setImage(null); if (imageInput.current) imageInput.current.value = ""; }
      stage = "Uploading animation";
      if (animation) { current = await upload(current, animation); setSaved(current); setAnimation(null); if (animationInput.current) animationInput.current.value = ""; }
      stage = "Updating publication status";
      if (current.status !== value.status) { current = await api<Exercise>(`/exercises/${current.id}`, { method: "PATCH", json: { status: value.status } }); setSaved(current); }
      setValue(current); setDirty(false); setMessage(current.status === "published" ? "Exercise published. It’s now available on web and mobile." : `Exercise saved as ${current.status}. You can add more media anytime.`);
      if (!id) window.history.replaceState(null, "", `/admin/exercises/${current.id}/edit`);
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Please try again.";
      setError(`${stage} failed. ${detail}${detailsSaved ? " Your exercise details were saved. Keep this editor open and retry the unfinished step after resolving the error." : " Your latest changes were not confirmed as saved."}`);
    }
    finally { setBusy(false); }
  }
  async function removeMedia() {
    if (!saved || !removing) return; setBusy(true); setError("");
    try { const next = await api<Exercise>(`/exercises/${saved.id}/media/${removing.id}`, { method: "DELETE" }); setSaved(next); setMessage("Media removed."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not remove media."); }
    finally { setBusy(false); setRemoving(null); }
  }
  function select(label: string, key: "category" | "activityType" | "bodyRegion" | "difficulty" | "trackingType" | "movementPattern", options: TaxonomyItem[]) {
    return <label className="field"><span>{label} <b>*</b></span><select required value={value[key]} onChange={e => { const code = e.target.value; if (key === "category") { setValue(v => ({ ...v, category: code, activityType: tax?.activityTypes.find(a => a.category === code)?.code || "" })); setDirty(true); } else update(key, code as never); }}>{options.map(item => <option value={item.code} key={item.code}>{item.label}</option>)}</select></label>;
  }
  function multiselect(label: string, key: "primaryMuscles" | "secondaryMuscles" | "equipment", options: TaxonomyItem[]) {
    return <fieldset className="chip-field"><legend>{label}</legend><div>{options.map(item => <label className={`check-chip ${value[key].includes(item.code) ? "checked" : ""}`} key={item.code}><input type="checkbox" checked={value[key].includes(item.code)} onChange={e => update(key, e.target.checked ? [...value[key], item.code] : value[key].filter(code => code !== item.code))} />{item.label}</label>)}</div></fieldset>;
  }
  function lines(label: string, key: "instructions" | "tips" | "mistakes" | "safetyNotes", help: string) { return <label className="field"><span>{label}{key === "instructions" && <b> *</b>}</span><textarea rows={key === "instructions" ? 5 : 3} required={key === "instructions"} value={value[key].join("\n")} onChange={e => update(key, e.target.value.split("\n"))} onBlur={() => update(key, splitLines(value[key].join("\n")))} placeholder={help} /><small>One {key === "instructions" ? "step" : "note"} per line. Up to 30 lines, 500 characters each.</small></label>; }
  if (loading) return <div className="empty-state" role="status"><span className="spinner" />Loading editor…</div>;
  if (!tax || (id && !saved)) return <div className="empty-state"><h2>Couldn’t load the editor</h2><p role="alert">{error}</p><button className="button" onClick={() => setRetry(retry + 1)}>Try again</button></div>;
  const options = (items: string[]) => items.map(code => ({ code, label: pretty(code) }));
  return <><Link href="/admin/exercises" className="back-link" onClick={e => { if ((dirty || image || animation) && !window.confirm("Leave without saving your changes?")) e.preventDefault(); }}><Icon name="back" size={16} />All exercises</Link><div className="page-heading"><div><p className="eyebrow">Build the library</p><h1>{saved ? "Edit exercise" : "Add a new exercise"}</h1><p>A clear demonstration. The right details. Better training for everyone.</p></div>{saved && <span className={`badge ${saved.status}`}>{pretty(saved.status)}</span>}</div>
    <form onSubmit={save}><fieldset disabled={busy} className="editor-fieldset"><div className="editor-grid"><div className="editor-main"><section className="panel form-section"><div className="section-title"><span>01</span><div><h2>The essentials</h2><p>Give your exercise a name and a place in the library.</p></div></div><div className="form-grid"><label className="field"><span>Exercise name <b>*</b></span><input required minLength={2} maxLength={120} placeholder="e.g. Incline dumbbell press" value={value.name} onChange={e => { const name = e.target.value; setValue(v => ({ ...v, name, slug: !saved && (!v.slug || v.slug === v.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) : v.slug })); setDirty(true); }} /></label><label className="field"><span>URL slug <b>*</b></span><input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} value={value.slug} onChange={e => update("slug", e.target.value)} placeholder="incline-dumbbell-press" /><small>Lowercase letters, numbers, and hyphens.</small></label><label className="field full"><span>Description</span><textarea rows={3} maxLength={2000} value={value.description} onChange={e => update("description", e.target.value)} placeholder="What does this movement help the athlete do?" /></label>{select("Category", "category", tax.categories)}{select("Activity type", "activityType", tax.activityTypes.filter(a => a.category === value.category))}{select("Body region", "bodyRegion", tax.bodyRegions)}{select("Difficulty", "difficulty", options(["beginner", "intermediate", "advanced"]))}{select("Tracking type", "trackingType", options(["reps_weight", "reps", "duration", "distance_duration"]))}{select("Movement pattern", "movementPattern", options(["push", "pull", "squat", "hinge", "lunge", "carry", "rotation", "locomotion", "mobility", "stillness", "other"]))}</div></section>
    <section className="panel form-section"><div className="section-title"><span>02</span><div><h2>Muscles & equipment</h2><p>Help athletes find the right exercise for their training.</p></div></div>{multiselect("Primary muscles", "primaryMuscles", tax.muscleGroups)}{multiselect("Secondary muscles", "secondaryMuscles", tax.muscleGroups)}{multiselect("Equipment", "equipment", tax.equipmentTypes)}</section>
    <section className="panel form-section"><div className="section-title"><span>03</span><div><h2>Coach the movement</h2><p>Keep instructions clear and easy to follow.</p></div></div><div className="form-grid"> <div className="full">{lines("Step-by-step instructions", "instructions", "Set up in the starting position.\nPerform the movement with control.")}</div>{lines("Coaching tips", "tips", "Helpful cues for better technique")}{lines("Common mistakes", "mistakes", "What should the athlete avoid?")}{lines("Safety notes", "safetyNotes", "Precautions and modifications")}<label className="field"><span>Breathing cue</span><textarea rows={3} maxLength={500} value={value.breathingTip} onChange={e => update("breathingTip", e.target.value)} placeholder="e.g. Exhale as you press, inhale as you lower." /></label></div></section>
    <section className="panel form-section"><div className="section-title"><span>04</span><div><h2>Images & demonstrations</h2><p>Add an image now. Animations are optional and can be added later.</p></div></div>{saved && saved.media.length > 0 && <div className="saved-media">{saved.media.map(media => <div key={media.id} className="saved-media-item">{media.kind === "video" ? <video controls src={media.url} preload="metadata" /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={media.url} alt={media.altText || value.name} />}<div><span>{media.credit || pretty(media.kind)}</span><button type="button" className="icon-button danger-text" aria-label={`Remove ${media.altText || media.kind}`} onClick={() => setRemoving(media)}><Icon name="trash" size={17} /></button></div></div>)}</div>}<div className="form-grid"><label className="upload-zone"><Icon name="image" size={28} /><strong>{image?.name || "Add exercise image"}</strong><span>JPEG, PNG, WebP · up to 25 MB</span><input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => choose(e.target.files?.[0], "image")} /></label><label className="upload-zone"><Icon name="play" size={26} /><strong>{animation?.name || "Add animation (optional)"}</strong><span>GIF or MP4 · up to 25 MB</span><input ref={animationInput} type="file" accept="image/gif,video/mp4" onChange={e => choose(e.target.files?.[0], "animation")} /></label></div>{(image || animation) && <div className="button-row file-actions">{image && <button type="button" className="text-link" onClick={() => { setImage(null); if (imageInput.current) imageInput.current.value = ""; }}>Clear image</button>}{animation && <button type="button" className="text-link" onClick={() => { setAnimation(null); if (animationInput.current) animationInput.current.value = ""; }}>Clear animation</button>}</div>}<div className="form-grid media-metadata"><label className="field"><span>Media description</span><input maxLength={200} value={meta.altText} onChange={e => setMeta({ ...meta, altText: e.target.value })} placeholder="Describe the movement shown" /></label><label className="field"><span>Usage rights {(image || animation) && <b>*</b>}</span><input required={Boolean(image || animation)} minLength={3} maxLength={150} value={meta.license} onChange={e => setMeta({ ...meta, license: e.target.value })} placeholder="e.g. Original content, owned by FitSync" /></label><label className="field"><span>Credit</span><input maxLength={200} value={meta.credit} onChange={e => setMeta({ ...meta, credit: e.target.value })} placeholder="Creator or photographer" /></label><label className="field"><span>Source URL</span><input type="url" maxLength={1000} value={meta.sourceUrl} onChange={e => setMeta({ ...meta, sourceUrl: e.target.value })} placeholder="https://…" /></label></div><p className="helper"><Icon name="upload" size={15} />Files upload when you save. Media details apply to the selected uploads.</p></section></div>
    <aside className="editor-aside"><div className="panel publish-panel"><h2>Publish settings</h2><p>Choose when this exercise is ready for athletes.</p><label className="field"><span>Visibility</span><select value={value.status} onChange={e => update("status", e.target.value as ExerciseInput["status"])}><option value="draft">Draft — only admins</option><option value="published">Published — all athletes</option><option value="archived">Archived — hidden from library</option></select></label><div className="publish-checklist"><p><Icon name="check" size={16} />Drafts can be saved without media</p><p><Icon name="check" size={16} />One image is enough to publish</p><p><Icon name="check" size={16} />Animations can be added later</p></div><button className="button wide" disabled={busy} type="submit">{busy ? "Saving & uploading…" : value.status === "published" ? "Save & publish" : "Save exercise"}{!busy && <Icon name="check" size={17} />}</button>{saved && <Link className="button secondary wide" href={`/exercises/${saved.slug}`}>Preview exercise<Icon name="arrow" size={16} /></Link>}<small>{dirty ? "You have unsaved changes." : saved ? "Your exercise is saved." : "Your new exercise starts as a draft."}</small></div>{error && <div className="notice error" role="alert">{error}</div>}{message && <div className="notice success" role="status">{message}</div>}<div className="editor-note"><Icon name="shield" size={20} /><h3>Shared across FitSync</h3><p>Publishing updates the same library your athletes use in the mobile app.</p></div></aside></div></fieldset></form>{removing && <ConfirmDialog title="Remove this media?" description="This removes the file from the exercise and its storage provider. Save the exercise as a draft before removing its last demonstration." confirm="Remove media" busy={busy} onCancel={() => setRemoving(null)} onConfirm={() => void removeMedia()} />}</>;
}
