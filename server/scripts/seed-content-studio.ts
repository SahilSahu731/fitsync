import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../src/config/supabase.js";
import { uploadExerciseAsset } from "../src/modules/exercises/exercise.media.js";
import { resourceSchema, toolSchema } from "../src/modules/explore/explore.schema.js";

import { storeTool } from "../src/modules/explore/explore.tools.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
async function main() {
  let json = await readFile(resolve(root, "src/modules/explore/explore.seed-data.json"), "utf8");
  const keys = [...new Set([...json.matchAll(/asset:([a-z]+)/g)].map(match => match[1]))];
  let media: Record<string, string> = {};
  const manifest = resolve(root, "assets/explore/media.json");
  try { media = JSON.parse(await readFile(manifest, "utf8")); } catch { /* First seed. */ }
  for (const key of keys) {
    if (media[key]) { json = json.replaceAll(`asset:${key}`, media[key]); continue; }
    // Original SVG diagrams are rendered to WebP through the existing image pipeline.
    const sharp = (await import("sharp")).default;
    const buffer = await sharp(await readFile(resolve(root, `assets/explore/${key}.svg`))).webp({ quality: 90 }).toBuffer();
    const asset = await uploadExerciseAsset("explore-diagrams", { buffer, mimetype: "image/webp" } as Express.Multer.File);
    if (!asset.url) throw new Error(`No URL for ${key}`);
    media[key] = asset.url;
    await writeFile(manifest, JSON.stringify(media, null, 2) + "\n");
    json = json.replaceAll(`asset:${key}`, asset.url);
  }
  const source = JSON.parse(json);
  const resources = source.resources.map((r: unknown) => resourceSchema.parse(r));
  const tools = source.tools.map((t: unknown) => toolSchema.parse(t));
  // Also produce a single, reviewable SQL file for projects without a SQL connection here.
  const literal = (value: unknown) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  const all = [...resources, ...tools.map(storeTool)];
  const sql = `-- Additive curated catalog. Existing slugs and admin edits are preserved.\nBEGIN;\nINSERT INTO public.explore_resources (slug,kind,title,summary,cover_url,duration_minutes,tags,steps,body,featured_rank,published)\nSELECT slug,kind,title,summary,cover_url,duration_minutes,tags,steps,body,featured_rank,published FROM jsonb_populate_recordset(NULL::public.explore_resources, ${literal(all)}) ON CONFLICT (slug) DO NOTHING;\nCOMMIT;\n`;
  await writeFile(resolve(root, "sql/011_explore_curated_content.sql"), sql);
  const { data, error } = await db.from("explore_resources").upsert(all, { onConflict: "slug", ignoreDuplicates: true }).select("slug");
  if (error) throw new Error(`Content seed failed: ${error.message}`);
  console.log(`Added ${data?.length ?? 0} records; existing records preserved. Catalog: ${resources.length} resources and ${tools.length} calculators.`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Content seed failed."); process.exitCode = 1; });
