import "dotenv/config";
import { readFile } from "node:fs/promises";
import { db } from "../src/config/supabase.js";

// Only fill empty covers on the original starter resources. Existing covers,
// text, publication state, ranks and all other records remain untouched.
const slugs = ["upper-body-warm-up", "hip-mobility-reset", "desk-break", "leg-day-warm-up", "quick-cooldown", "ankle-mobility", "morning-movement", "post-run-reset", "progressive-overload", "first-week-at-gym", "understanding-rpe", "building-a-routine", "warm-up-basics", "training-consistency", "rest-between-sets", "exercise-substitutions"];
const source = JSON.parse(await readFile(new URL("../src/modules/explore/explore.seed-data.json", import.meta.url), "utf8"));
let changed = 0;
for (const [index, slug] of slugs.entries()) {
  const { data, error } = await db.from("explore_resources").update({ cover_url: source.resources[index % source.resources.length].cover_url, updated_at: new Date().toISOString() }).eq("slug", slug).is("cover_url", null).select("id");
  if (error) throw new Error(error.message);
  changed += data?.length ?? 0;
}
console.log(`Added covers to ${changed} original resources. Existing content and images preserved.`);
