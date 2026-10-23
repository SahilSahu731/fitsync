"use client";

import { useEffect, useState } from "react";
import { api, pretty } from "@/lib/api";
import { ConfirmDialog } from "./confirm-dialog";
import { Icon } from "./icon";

type Kind = "categories" | "routines" | "programs";
type Fields = Record<string, string | number | boolean | null>;
type Item = Fields & { id?: string };
type Entry = { [key: string]: Fields[string] | Item[] | undefined; id: string; name: string; slug: string };
type RecordData = Entry & { training_routine_exercises?: Item[]; training_program_days?: Item[] };
type Choice = { id: string; name: string; status?: string; published?: boolean };
const endpoint = "/catalog/admin";
const defaults = (kind: Kind): Fields => ({
  name: "", slug: "", description: "",
  ...(kind === "categories" ? { image_url: "", position: 0 } : {
    level: "beginner", goal: "general", equipment: "gym", author: "FitSync", published: false,
    ...(kind === "routines" ? { image_url: "", category_id: null, estimated_minutes: 45 } : { cover_url: "", tagline: "", duration_weeks: 8, featured_rank: null }),
  }),
});
function details(record: RecordData, kind: Kind): Fields {
  return Object.fromEntries(Object.keys(defaults(kind)).map(key => [key, record[key] ?? defaults(kind)[key]])) as Fields;
}
function message(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please try again."; }

export function CatalogAdmin({ kind }: { kind: Kind }) {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [categories, setCategories] = useState<Choice[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<RecordData | null>(null);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<Fields>(defaults(kind));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<RecordData | null>(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      api<RecordData[]>(`${endpoint}/${kind}`),
      kind === "routines" ? api<Choice[]>(`${endpoint}/categories`) : Promise.resolve([]),
      kind === "categories" ? Promise.resolve([]) : api<Choice[]>(`${endpoint}/${kind === "routines" ? "exercises" : "routines"}`),
    ]).then(([rows, cats, options]) => { if (active) { setRecords(rows); setCategories(cats); setChoices(options); setError(""); } })
      .catch(e => { if (active) setError(message(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, retry]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    const navigate = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (link && (dirty || document.querySelector("[data-unsaved=true]")) && !window.confirm("Leave without saving your changes?")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", navigate, true); };
  }, [dirty]);
  function update(key: string, next: Fields[string]) { setValue(v => ({ ...v, [key]: next })); setDirty(true); setNotice(""); }
  function open(record: RecordData | null) {
    setSelected(record); setValue(record ? details(record, kind) : defaults(kind)); setEditing(true); setDirty(false); setError(""); setNotice("");
  }
  function store(record: RecordData) {
    setRecords(rows => [...rows.filter(row => row.id !== record.id), record].sort((a, b) => a.name.localeCompare(b.name)));
    setSelected(record);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (value.published && document.querySelector("[data-unsaved=true]")) { setError("Save each content row before publishing."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const record = await api<RecordData>(`${endpoint}/${kind}${selected ? `/${selected.id}` : ""}`, { method: selected ? "PATCH" : "POST", json: value });
      store(record); setValue(details(record, kind)); setDirty(false); setNotice("Details saved.");
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  async function remove() {
    if (!removing) return; setBusy(true); setError("");
    try { await api(`${endpoint}/${kind}/${removing.id}`, { method: "DELETE" }); setRecords(rows => rows.filter(row => row.id !== removing.id)); setNotice(`${removing.name} deleted.`); setRemoving(null); }
    catch (e) { setError(message(e)); setRemoving(null); } finally { setBusy(false); }
  }
  const singular = kind === "categories" ? "category" : kind.slice(0, -1);
  function field(label: string, key: string, type = "text", min?: number, max?: number) {
    return <label className="field"><span>{label}</span><input type={type} required={["name", "slug", "author"].includes(key) || type === "number" && key !== "featured_rank"} min={min} max={max} maxLength={key === "slug" ? 80 : type === "url" ? 1000 : key === "tagline" ? 200 : 120} pattern={key === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined} value={String(value[key] ?? "")} onChange={e => {
      const next = e.target.value;
      if (key === "name" && !selected) {
        setValue(v => ({ ...v, name: next, slug: v.slug === String(v.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ? next.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) : v.slug })); setDirty(true);
      } else update(key, type === "number" ? next === "" ? null : Number(next) : next);
    }} /></label>;
  }
  function select(label: string, key: string, options: string[]) { return <label className="field"><span>{label}</span><select value={String(value[key])} onChange={e => update(key, e.target.value)}>{options.map(option => <option key={option} value={option}>{pretty(option)}</option>)}</select></label>; }
  const visible = records.filter(row => row.name.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || Boolean(row.published) === (filter === "published")));
  if (loading) return <div className="empty-state" role="status">Loading {kind}…</div>;
  return <>
    <div className="page-heading"><div><p className="eyebrow">Training catalog</p><h1>{editing ? `${selected ? "Edit" : "New"} ${singular}` : pretty(kind)}</h1><p>{kind === "categories" ? "Categories organize routines by style or equipment. They are not training programs." : kind === "routines" ? "A routine is one reusable session: exercises, sets, targets, and rest." : "A program schedules routines and recovery across a repeating week."}</p></div>{!editing && <button className="button" onClick={() => open(null)}><Icon name="plus" size={18} />Add {singular}</button>}</div>
    {error && <div className="notice error" role="alert">{error}{!editing && <button className="text-link" onClick={() => { setLoading(true); setRetry(r => r + 1); }}>Retry</button>}</div>}
    {notice && <div className="notice success" role="status">{notice}</div>}
    {!editing ? <>
      <div className="catalog-toolbar"><label className="field"><span>Search {kind}</span><input type="search" placeholder={`Search ${kind}…`} value={query} onChange={e => setQuery(e.target.value)} /></label>{kind !== "categories" && <label className="field"><span>Visibility</span><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All records</option><option value="draft">Drafts</option><option value="published">Published</option></select></label>}<span>{visible.length} {kind}</span></div>
      <div className="catalog-list">{visible.map(row => <article className="panel catalog-card" key={row.id}><div><span className={`badge ${row.published ? "published" : "draft"}`}>{kind === "categories" ? `Position ${row.position}` : row.published ? "Published" : "Draft"}</span><h2>{row.name}</h2><p>{String(row.description || "No description yet.")}</p><small>{kind === "routines" ? `${row.training_routine_exercises?.length ?? 0} exercises · ${row.estimated_minutes} min` : kind === "programs" ? `${row.duration_weeks} weeks · ${row.training_program_days?.filter(d => d.routine_id).length ?? 0} training days` : row.slug}</small></div><div className="button-row"><button className="button secondary small" onClick={() => open(row)}>Edit {singular}</button><button className="icon-button danger-text" aria-label={`Delete ${row.name}`} onClick={() => setRemoving(row)}><Icon name="trash" size={18} /></button></div></article>)}</div>
      {!visible.length && <div className="empty-state"><h2>{query || filter !== "all" ? "No matches" : `No ${kind} yet`}</h2><p>{query || filter !== "all" ? "Try another search or filter." : `Create your first ${singular} to get started.`}</p></div>}
    </> : <>
      <button className="back-link" onClick={() => { if ((!dirty && !document.querySelector("[data-unsaved=true]")) || window.confirm("Leave without saving your changes?")) { setEditing(false); setDirty(false); setError(""); } }}>← All {kind}</button>
      <form onSubmit={save}><fieldset className="editor-fieldset" disabled={busy}><section className="panel form-section"><h2>Details</h2><div className="form-grid">
        {field("Name", "name")}{field("URL slug", "slug")}
        <label className="field full"><span>Description</span><textarea rows={3} maxLength={2000} value={String(value.description)} onChange={e => update("description", e.target.value)} /></label>
        {field("Image URL (optional)", kind === "programs" ? "cover_url" : "image_url", "url")}
        {kind === "categories" ? field("Display position", "position", "number", 0, 10000) : <>
          {select("Level", "level", ["beginner", "intermediate", "advanced"])}{select("Goal", "goal", ["muscle", "strength", "fat_loss", "endurance", "general"])}{select("Equipment", "equipment", ["gym", "dumbbells", "bodyweight", "bands", "mixed"])}{field("Author", "author")}
          {kind === "routines" ? <><label className="field"><span>Category</span><select value={String(value.category_id ?? "")} onChange={e => update("category_id", e.target.value || null)}><option value="">Uncategorized</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{field("Estimated minutes", "estimated_minutes", "number", 1, 600)}</> : <>{field("Tagline", "tagline")}{field("Duration (weeks)", "duration_weeks", "number", 1, 52)}{field("Featured rank (optional)", "featured_rank", "number", 1, 1000)}</>}
          <label className="field"><span>Visibility</span><select value={value.published ? "published" : "draft"} onChange={e => update("published", e.target.value === "published")}><option value="draft">Draft — admins only</option><option value="published" disabled={!selected}>Published — all athletes</option></select><small>Save as a draft before editing contents. Publish when everything is ready.</small></label>
        </>}
      </div><div className="catalog-save"><button className="button" type="submit">{busy ? "Saving…" : "Save details"}</button><small>{dirty ? "Unsaved details" : "Details up to date"}</small></div></section></fieldset></form>
      {kind !== "categories" && (selected ? <CatalogContents key={selected.id} kind={kind} record={selected} choices={choices} onUpdate={store} busy={busy} setBusy={setBusy} /> : <div className="panel form-section"><p>Save the draft first, then add {kind === "routines" ? "exercises" : "schedule days"}.</p></div>)}
    </>}
    {removing && <ConfirmDialog title={`Delete ${removing.name}?`} description="This permanently deletes the record. Published records must be saved as drafts first. Records used elsewhere cannot be deleted." confirm="Delete" busy={busy} onCancel={() => setRemoving(null)} onConfirm={() => void remove()} />}
  </>;
}

function CatalogContents({ kind, record, choices, onUpdate, busy, setBusy }: { busy: boolean; setBusy: (busy: boolean) => void; kind: "routines" | "programs"; record: RecordData; choices: Choice[]; onUpdate: (record: RecordData) => void }) {
  const routine = kind === "routines";
  const key = routine ? "training_routine_exercises" : "training_program_days";
  const items = record[key] ?? [];
  const ordered = [...items].sort((a, b) => Number(a[routine ? "position" : "day_number"]) - Number(b[routine ? "position" : "day_number"]));
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<Item | null>(null);
  async function save(item: Item) {
    setBusy(true); setError("");
    try {
      const saved = await api<Item>(`${endpoint}/${kind}/${record.id}/items`, { method: "POST", json: item });
      onUpdate({ ...record, [key]: [...items.filter(row => row.id !== saved.id), saved] }); setAdding(false);
    } catch (e) { setError(message(e)); throw e; } finally { setBusy(false); }
  }
  async function remove() {
    if (!removing) return; setBusy(true); setError("");
    try { await api(`${endpoint}/${kind}/${record.id}/items/${removing.id}`, { method: "DELETE" }); onUpdate({ ...record, [key]: items.filter(row => row.id !== removing.id) }); }
    catch (e) { setError(message(e)); } finally { setBusy(false); setRemoving(null); }
  }
  const next: Item = routine ? { exercise_id: "", position: Math.max(-1, ...items.map(i => Number(i.position))) + 1, sets: 3, min_reps: 8, max_reps: 12, rest_seconds: 90, notes: "", set_type: "normal" } : {};
  return <section className="panel form-section"><h2>{routine ? "Exercises" : "Weekly schedule · repeats each week"}</h2><p>{record.published ? "Save details as a draft to edit contents." : "Each row saves separately. Programs repeat this weekly schedule; routines describe one session. Save every row before publishing."}</p>{error && <div className="notice error" role="alert">{error}</div>}
    {routine ? ordered.map(item => <ContentRow key={`${item.id}-${JSON.stringify(item)}`} routine item={item} choices={choices} disabled={busy || Boolean(record.published)} onSave={save} onRemove={() => setRemoving(item)} />) : Array.from({ length: 7 }, (_, index) => {
      const item = items.find(d => d.day_number === index + 1) ?? { day_number: index + 1, routine_id: null, label: "Rest Day" };
      return <ContentRow key={`${index}-${JSON.stringify(item)}`} routine={false} item={item} choices={choices} disabled={busy || Boolean(record.published)} onSave={save} />;
    })}
    {routine && !record.published && (adding ? <ContentRow routine item={next} choices={choices} disabled={busy} onSave={save} onRemove={() => setAdding(false)} /> : <button className="button secondary" onClick={() => setAdding(true)}>+ Add exercise</button>)}
    {removing && <ConfirmDialog title="Remove exercise?" description="This removes the exercise from this routine only." confirm="Remove" busy={busy} onCancel={() => setRemoving(null)} onConfirm={() => void remove()} />}
  </section>;
}
function ContentRow({ routine, item, choices, disabled, onSave, onRemove }: { routine: boolean; item: Item; choices: Choice[]; disabled: boolean; onSave: (item: Item) => Promise<void>; onRemove?: () => void }) {
  const [value, setValue] = useState(item);
  const [dirty, setDirty] = useState(!item.id);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const update = (key: string, next: Fields[string]) => { setValue(v => ({ ...v, [key]: next })); setDirty(true); };
  return <form className="catalog-item" data-unsaved={dirty} onSubmit={async e => { e.preventDefault(); try { await onSave(value); setDirty(false); } catch { /* Parent displays the error and retains the row. */ } }}><fieldset className="editor-fieldset" disabled={disabled}><strong>{routine ? `Exercise ${Number(item.position) + 1}` : `Day ${item.day_number}`}</strong><div className="form-grid">
    <label className="field"><span>{routine ? "Exercise" : "Routine"}</span><select required={routine} value={String(value[routine ? "exercise_id" : "routine_id"] ?? "")} onChange={e => { update(routine ? "exercise_id" : "routine_id", e.target.value || null); if (!routine) update("label", choices.find(c => c.id === e.target.value)?.name ?? "Rest Day"); }}><option value="">{routine ? "Choose an exercise" : "Rest day"}</option>{choices.map(c => <option key={c.id} value={c.id}>{c.name}{c.status ? ` (${c.status})` : c.published ? "" : " (draft)"}</option>)}</select></label>
    {routine ? <>{[["Sets", "sets", 1, 20], ["Minimum reps", "min_reps", 1, 10000], ["Maximum reps", "max_reps", 1, 10000], ["Rest (seconds)", "rest_seconds", 0, 3600]].map(([label, key, min, max]) => <label className="field" key={key}><span>{label}</span><input required type="number" min={Number(min)} max={Number(max)} value={String(value[key] ?? "")} onChange={e => update(String(key), Number(e.target.value))} /></label>)}<label className="field"><span>Set type</span><select value={String(value.set_type)} onChange={e => update("set_type", e.target.value)}>{["normal", "warmup", "heavy", "drop", "failure"].map(v => <option key={v} value={v}>{pretty(v)}</option>)}</select></label><label className="field full"><span>Coaching notes</span><textarea maxLength={2000} value={String(value.notes)} onChange={e => update("notes", e.target.value)} /></label></> : <label className="field"><span>Day label</span><input required maxLength={120} value={String(value.label)} onChange={e => update("label", e.target.value)} /></label>}
    </div><div className="button-row"><button type="submit" className="button secondary small">Save {routine ? "exercise" : "day"}</button>{onRemove && <button type="button" className="text-link danger-text" onClick={onRemove}>Remove</button>}<small role="status">{dirty ? "Unsaved" : "Saved"}</small></div></fieldset></form>;
}
