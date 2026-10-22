"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, pretty } from "@/lib/api";
import type { Exercise, ExercisePage, ExerciseTaxonomies } from "@/lib/types";
import { Icon } from "./icon";
import { useSession } from "./session";
import { ConfirmDialog } from "./confirm-dialog";

export function MediaPreview({ exercise }: { exercise: Exercise }) {
  const media = exercise.media.find(item => item.kind === "image") || exercise.media[0];
  if (!media) return <div className="media-placeholder"><Icon name="dumbbell" size={40} /><span>Demonstration coming soon</span></div>;
  if (media.kind === "video") return <video src={media.url} muted preload="metadata" aria-label={`${exercise.name} demonstration`} />;
  // Remote Cloudinary URLs and legacy Supabase assets are both supported.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={media.url} alt={media.altText || exercise.name} loading="lazy" />;
}
export function ExerciseLibrary({ admin = false }: { admin?: boolean }) {
  const { account } = useSession(); const [tax, setTax] = useState<ExerciseTaxonomies | null>(null);
  const [data, setData] = useState<ExercisePage | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", muscle: "", equipment: "", difficulty: "", category: "", status: "" });
  const [applied, setApplied] = useState(filters); const [page, setPage] = useState(1); const [refresh, setRefresh] = useState(0);
  const [deleting, setDeleting] = useState<Exercise | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; api<ExerciseTaxonomies>("/exercises/taxonomies").then(result => { if (active) setTax(result); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [account]);
  useEffect(() => {
    let active = true; setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(page), pageSize: admin ? "12" : "9" });
    Object.entries(applied).forEach(([key, value]) => { if (value) params.set(key, value); });
    if (admin) params.set("includeDrafts", "true");
    api<ExercisePage>(`/exercises?${params}`).then(result => { if (active) setData(result); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admin, page, applied, refresh, account]);
  const maxPage = Math.max(1, Math.ceil((data?.total || 0) / (data?.pageSize || 9)));
  function select(label: string, key: keyof typeof filters, items: { code: string; label: string }[]) { return <label className="field"><span>{label}</span><select value={filters[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })}><option value="">All {label.toLowerCase()}</option>{items.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>; }
  async function remove() {
    if (!deleting) return; setBusy(true);
    try { await api(`/exercises/${deleting.id}`, { method: "DELETE" }); setDeleting(null); if (data?.items.length === 1 && page > 1) setPage(page - 1); else setRefresh(n => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not delete exercise."); setDeleting(null); }
    finally { setBusy(false); }
  }
  return <><div className="page-heading"><div><p className="eyebrow">{admin ? "Exercise management" : "Exercise library"}</p><h1>{admin ? "Your exercise library" : "Find the right movement"}</h1><p>{admin ? "Create, refine, and publish exercises for every FitSync athlete." : "Find your focus. Learn the technique. Make every movement count."}</p></div>{admin ? <Link href="/admin/exercises/new" className="button"><Icon name="plus" size={18} />Add exercise</Link> : <span className="heading-icon"><Icon name="dumbbell" size={42} /></span>}</div>
    {admin && <div className="notice info"><Icon name="image" /><span>Start with an image. Add an optional GIF or MP4 demonstration whenever you’re ready.</span></div>}
    <form className="panel filters" onSubmit={e => { e.preventDefault(); setPage(1); setApplied({ ...filters }); }}><div className="panel-title"><Icon name="filter" /><h2>Search and filter</h2><span className="muted">Make the library yours</span></div><div className="filter-grid"><label className="field search-field"><span>Search exercises</span><span className="input-icon"><Icon name="search" size={18} /><input type="search" placeholder="Search by exercise name…" value={filters.q} maxLength={100} onChange={e => setFilters({ ...filters, q: e.target.value })} /></span></label>{select("Muscles", "muscle", tax?.muscleGroups || [])}{select("Equipment", "equipment", tax?.equipmentTypes || [])}{select("Levels", "difficulty", ["beginner", "intermediate", "advanced"].map(code => ({ code, label: pretty(code) })))}</div><div className="filter-bottom">{select("Categories", "category", tax?.categories || [])}{admin && select("Statuses", "status", ["draft", "published", "archived"].map(code => ({ code, label: pretty(code) })))}<button className="button" type="submit"><Icon name="filter" size={17} />Apply filters</button><button type="button" className="button ghost" onClick={() => { const blank = { q: "", muscle: "", equipment: "", difficulty: "", category: "", status: "" }; setFilters(blank); setApplied(blank); setPage(1); }}>Clear all</button></div></form>
    <div className="results-heading"><p><strong>{data?.total ?? "—"}</strong> {admin ? "exercises" : "movements to explore"}</p><span>Sorted by name, A–Z</span></div>
    {error && <div className="notice error" role="alert">{error}<button className="text-link" onClick={() => setRefresh(n => n + 1)}>Try again</button></div>}
    {loading ? <div className="exercise-grid" aria-label="Loading exercises" aria-busy="true">{Array.from({ length: 6 }, (_, n) => <div className="skeleton-card" key={n}><div /><span /><span /></div>)}</div> : !error && data && (data.items.length ? admin ? <div className="panel table-scroll"><table className="exercise-table"><thead><tr><th>Exercise</th><th>Classification</th><th>Media</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.items.map(exercise => <tr key={exercise.id}><td><Link className="table-exercise" href={`/admin/exercises/${exercise.id}/edit`}><span className="table-thumb"><MediaPreview exercise={exercise} /></span><span><strong>{exercise.name}</strong><small>{pretty(exercise.difficulty)} · {exercise.equipment.map(pretty).join(", ") || "No equipment"}</small></span></Link></td><td>{exercise.categoryLabel}<small>{exercise.primaryMuscles.map(pretty).join(", ") || exercise.regionLabel}</small></td><td><span className="media-count"><Icon name="image" size={16} />{exercise.media.filter(m => m.kind === "image").length}<Icon name="play" size={14} />{exercise.media.filter(m => m.kind === "video").length}</span></td><td><span className={`badge ${exercise.status}`}>{pretty(exercise.status)}</span></td><td><div className="table-actions"><Link className="icon-button" href={`/admin/exercises/${exercise.id}/edit`} aria-label={`Edit ${exercise.name}`}><Icon name="edit" size={18} /></Link><button className="icon-button danger-text" onClick={() => setDeleting(exercise)} aria-label={`Delete ${exercise.name}`}><Icon name="trash" size={18} /></button></div></td></tr>)}</tbody></table></div> : <div className="exercise-grid">{data.items.map(exercise => <Link className="exercise-card" key={exercise.id} href={`/exercises/${exercise.slug}`}><div className="exercise-image"><MediaPreview exercise={exercise} /><span className={`badge difficulty ${exercise.difficulty}`}>{pretty(exercise.difficulty)}</span>{exercise.media.some(m => m.kind === "video") && <span className="video-badge"><Icon name="play" size={12} />Video</span>}</div><div className="exercise-card-content"><p className="eyebrow">{exercise.categoryLabel}</p><h2>{exercise.name}</h2><p>{exercise.primaryMuscles.map(pretty).join(" · ") || exercise.regionLabel}</p><div className="exercise-card-bottom"><span>{exercise.equipment.map(pretty).join(", ") || "No equipment"}</span><Icon name="arrow" size={18} /></div></div></Link>)}</div> : <div className="empty-state panel"><Icon name="search" size={32} /><h2>No exercises found</h2><p>{admin ? "Add your first exercise or try adjusting the filters." : "Try another search or check back as the library grows."}</p>{admin && <Link href="/admin/exercises/new" className="button">Add exercise</Link>}</div>)}
    {data && data.total > 0 && <div className="pagination"><span>Showing {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total}</span><div><button className="button secondary small" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}><Icon name="back" size={16} />Previous</button><span>Page {page} of {maxPage}</span><button className="button secondary small" disabled={page >= maxPage || loading} onClick={() => setPage(page + 1)}>Next<Icon name="arrow" size={16} /></button></div></div>}
    {deleting && <ConfirmDialog title="Delete this exercise?" description={`“${deleting.name}” and its media will be permanently removed from the shared web and mobile library. This cannot be undone. You can archive it in the editor instead.`} confirm="Delete exercise" busy={busy} onCancel={() => setDeleting(null)} onConfirm={() => void remove()} />}
  </>;
}
