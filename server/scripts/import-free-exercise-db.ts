import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/config/supabase.js";
import { addExerciseMedia } from "../src/modules/exercises/exercise.service.js";
import { uploadExerciseAsset } from "../src/modules/exercises/exercise.media.js";
import type { ExerciseInput } from "../src/modules/exercises/exercise.schema.js";
import { SOURCE, imageUrls, normalize, type SourceExercise } from "./lib/free-exercise-source.js";

type Row = Record<string, any>;
type Entry = { input: ExerciseInput; images: string[]; stageSlug: string; id?: string; done?: boolean; error?: string };
type State = {
  version: 1; run: string; reset: boolean; source: string; startedAt: string;
  adminId: string; entries: Entry[]; backup: Record<string, Row[]>;
  phase: "importing" | "replacing" | "complete";
};
const args = process.argv.slice(2);
const reset = args.includes("--reset");
const dryRun = args.includes("--dry-run");
const argValue = (name: string) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const limit = Number(argValue("limit") ?? 1000);
const concurrency = Number(argValue("concurrency") ?? 4);
const resume = argValue("resume");
for (const arg of args) {
  if (!/^(--reset|--dry-run|--limit=\d+|--concurrency=\d+|--resume=.+)$/.test(arg)) throw new Error(`Unknown argument: ${arg}`);
}
if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("Limit must be between 1 and 1000.");
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6) throw new Error("Concurrency must be between 1 and 6.");
if (resume && (reset || dryRun || argValue("limit"))) throw new Error("Use --resume by itself (optionally with --concurrency).");

function check(error: { message: string } | null, action: string) {
  if (error) throw new Error(`${action}: ${error.message}`);
}
async function rows(table: string): Promise<Row[]> {
  const all: Row[] = [];
  for (let from = 0; ; from += 500) {
    const query = db.from(table).select("*");
    const result = await (table === "exercise_muscles" || table === "exercise_equipment" ? query.order("exercise_id") : query.order("id")).range(from, from + 499);
    check(result.error, `Read ${table}`);
    all.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) return all;
  }
}
async function download(url: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: "error" });
      if (!response.ok) throw new Error(`Source download returned HTTP ${response.status}`);
      if (Number(response.headers.get("content-length") ?? 0) > 25 * 1024 * 1024) throw new Error("Source file exceeds 25 MB.");
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length > 25 * 1024 * 1024) throw new Error("Source file exceeds 25 MB.");
      return data;
    } catch (error) {
      if (attempt >= 3) throw error;
      await new Promise(resolve => setTimeout(resolve, attempt * 700));
    }
  }
}
async function main() {
  const adminId = process.env.SEED_ADMIN_USER_ID;
  if (!adminId) throw new Error("Set SEED_ADMIN_USER_ID.");
  const admin = await db.from("app_users").select("role").eq("id", adminId).single();
  check(admin.error, "Verify seed administrator");
  if (admin.data?.role !== "admin") throw new Error("Seed user must be admin.");

  let state: State;
  let directory: string;
  if (resume) {
    directory = path.resolve(resume);
    state = JSON.parse(await readFile(path.join(directory, "state.json"), "utf8"));
    if (state.version !== 1 || state.adminId !== adminId) throw new Error("Import checkpoint does not match this administrator.");
    if (state.phase === "complete") { console.log("This import is already complete."); return; }
  } else {
    const source = await download(SOURCE);
    const items = JSON.parse(source.toString()) as SourceExercise[];
    if (!Array.isArray(items)) throw new Error("Exercise source must be an array.");
    const run = randomUUID().slice(0, 8);
    const entries: Entry[] = [];
    const skipped: { id: string; reason: string }[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      try {
        const input = normalize(item);
        if (!input) { skipped.push({ id: item.id, reason: "Unsupported or ambiguous classification" }); continue; }
        const images = imageUrls(item);
        if (!images.length) { skipped.push({ id: item.id, reason: "No source images" }); continue; }
        if (seen.has(input.slug)) throw new Error("Duplicate normalized slug");
        seen.add(input.slug);
        entries.push({ input, images, stageSlug: `import-${run}-${entries.length + 1}` });
      } catch (error) { skipped.push({ id: item.id, reason: error instanceof Error ? error.message : "Invalid source record" }); }
    }
    const selected = entries.slice(0, limit);
    if (!selected.length) throw new Error("No valid exercises with images to import.");
    const existing = await rows("exercises");
    console.log(JSON.stringify({ sourceRecords: items.length, eligible: entries.length, selected: selected.length, imageUploads: selected.reduce((n, entry) => n + entry.images.length, 0), skipped: skipped.length, existingExercises: existing.length, mode: reset ? "replace after staging and backup" : "add missing exercises/images", status: "draft" }, null, 2));
    if (dryRun) return;
    directory = path.resolve(".exercise-imports", `${new Date().toISOString().replace(/[:.]/g, "-")}-${run}`);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const backup: Record<string, Row[]> = { exercises: existing };
    for (const table of ["exercise_muscles", "exercise_equipment", "exercise_media", "exercise_categories", "exercise_activity_types", "exercise_body_regions", "exercise_muscle_groups", "exercise_equipment_types"]) backup[table] = await rows(table);
    // Keep provider assets for the backup; replacement only removes database rows.
    await writeFile(path.join(directory, "backup.json"), JSON.stringify(backup, null, 2), { mode: 0o600 });
    await writeFile(path.join(directory, "source.json"), source, { mode: 0o600 });
    await writeFile(path.join(directory, "skipped.json"), JSON.stringify(skipped, null, 2), { mode: 0o600 });
    state = { version: 1, run, reset, source: SOURCE, startedAt: new Date().toISOString(), adminId, entries: selected, backup, phase: "importing" };
  }
  console.log(`Backup/checkpoint: ${directory}`);
  let checkpointQueue = Promise.resolve();
  function checkpoint() {
    const serialized = JSON.stringify(state, null, 2);
    checkpointQueue = checkpointQueue.then(async () => {
      await writeFile(path.join(directory, "state.tmp"), serialized, { mode: 0o600 });
      await rename(path.join(directory, "state.tmp"), path.join(directory, "state.json"));
    });
    return checkpointQueue;
  }
  await checkpoint();

  async function importEntry(entry: Entry) {
    entry.error = undefined;
    const lookupSlug = state.reset ? entry.stageSlug : entry.input.slug;
    if (!entry.id) {
      const lookup = await db.from("exercises").select("id").eq("slug", lookupSlug).maybeSingle();
      check(lookup.error, "Find existing import");
      entry.id = lookup.data?.id;
      if (!entry.id) {
        const result = await db.rpc("save_fitsync_exercise", { p_id: null, p_actor: adminId, p_data: { ...entry.input, slug: lookupSlug } });
        check(result.error, `Create ${entry.input.name}`);
        entry.id = result.data as string;
      }
      await checkpoint();
    }
    const media = await db.from("exercise_media").select("source_url").eq("exercise_id", entry.id);
    check(media.error, "Read existing source images");
    const imported = new Set((media.data ?? []).map(item => item.source_url));
    for (let index = 0; index < entry.images.length; index++) {
      const url = entry.images[index];
      if (imported.has(url)) continue;
      const buffer = await download(url);
      let asset;
      for (let attempt = 1; ; attempt++) {
        try { asset = await uploadExerciseAsset(entry.id!, { buffer, mimetype: "image/jpeg" } as Express.Multer.File); break; }
        catch (error) { if (attempt >= 3) throw error; await new Promise(resolve => setTimeout(resolve, attempt * 1000)); }
      }
      await addExerciseMedia(entry.id!, asset, {
        altText: `${entry.input.name} — demonstration ${index + 1}`,
        sourceUrl: url,
        credit: "yuhonas/free-exercise-db",
        license: "Unlicense / public domain (source repository)"
      });
    }
    entry.done = true;
    await checkpoint();
    console.log(`[${state.entries.filter(e => e.done).length}/${state.entries.length}] ${entry.input.name}: ${entry.images.length} images`);
  }
  if (state.phase === "importing") {
    // One pilot validates Cloudinary credentials AND the database image constraint
    // before a bulk upload starts. The old catalog remains untouched on failure.
    const pilot = state.entries.find(entry => !entry.done);
    if (pilot) {
      try { await importEntry(pilot); }
      catch (error) {
        pilot.error = error instanceof Error ? error.message : String(error);
        // A failed first image must not leave a blank staged exercise behind.
        if (state.reset && pilot.id) {
          const media = await db.from("exercise_media").select("id", { count: "exact", head: true }).eq("exercise_id", pilot.id);
          if (!media.error && media.count === 0) {
            const removed = await db.from("exercises").delete().eq("id", pilot.id).eq("slug", pilot.stageSlug).select("id");
            if (!removed.error && removed.data?.length === 1) pilot.id = undefined;
          }
        }
        await checkpoint();
        throw error;
      }
    }
    const pending = state.entries.filter(entry => !entry.done);
    let cursor = 0;
    await Promise.all(Array.from({ length: concurrency }, async () => {
      while (cursor < pending.length) {
        const entry = pending[cursor++];
        try { await importEntry(entry); }
        catch (error) {
          entry.error = error instanceof Error ? error.message : String(error);
          await checkpoint();
          console.error(`${entry.input.name}: ${entry.error}`);
        }
      }
    }));
    const failed = state.entries.filter(entry => !entry.done);
    if (failed.length) throw new Error(`${failed.length} imports failed. Old catalog was not removed. Resume with --resume=${directory}`);
    const uploaded = await rows("exercise_media");
    for (const entry of state.entries) {
      if (!entry.images.every(url => uploaded.some(media => media.exercise_id === entry.id && media.source_url === url && media.provider === "cloudinary" && media.delivery_url))) {
        entry.done = false; await checkpoint(); throw new Error(`Image verification failed for ${entry.input.name}. Old catalog retained.`);
      }
    }
    if (state.reset) {
      const current = await rows("exercises");
      const allowed = new Set([...state.backup.exercises.map(row => row.id), ...state.entries.map(entry => entry.id)]);
      if (current.some(row => !allowed.has(row.id))) throw new Error("Catalog changed during import; replacement stopped before deletion.");
      for (const original of state.backup.exercises) {
        const now = current.find(row => row.id === original.id);
        if (!now || now.updated_at !== original.updated_at) throw new Error("An existing exercise changed during import; replacement stopped before deletion.");
      }
      state.phase = "replacing";
      await checkpoint();
    }
  }
  if (state.reset && state.phase === "replacing") {
    const ids = state.backup.exercises.map(row => row.id as string);
    for (let start = 0; start < ids.length; start += 100) {
      const result = await db.from("exercises").delete().in("id", ids.slice(start, start + 100));
      check(result.error, "Remove backed-up old exercises");
    }
    for (const entry of state.entries) {
      const result = await db.from("exercises").update({ slug: entry.input.slug }).eq("id", entry.id!).select("id").single();
      check(result.error, `Finalize ${entry.input.name}`);
    }
    console.log(`Removed ${ids.length} old exercise records. Their snapshot is in backup.json.`);
  }
  state.phase = "complete";
  await checkpoint();
  console.log(JSON.stringify({ imported: state.entries.length, images: state.entries.reduce((n, entry) => n + entry.images.length, 0), status: "draft", backup: directory }, null, 2));
}
main().catch(error => {
  console.error(error instanceof Error ? error.message : "Exercise import failed.");
  process.exitCode = 1;
});
