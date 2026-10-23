import { readFile } from "node:fs/promises";
import { db } from "../src/config/supabase.js";

// Restore only absent tags, using exact names from our curated library.
// No fuzzy/equipment-stripping matches and no status or existing-tag changes.
const apply = process.argv.includes("--apply");
const core: { name: string; primaryMuscles: string[]; secondaryMuscles: string[] }[] =
  JSON.parse(await readFile(new URL("./data/core-exercises.json", import.meta.url), "utf8"));
const aliases: Record<string, string> = {
  "Pull Ups": "Pull Up",
  "Leg Extensions": "Leg Extension (Machine)",
  "Cable Fly Crossovers": "Chest Fly (Cable)"
};
const lookup = new Map(core.map(row => [row.name, row]));
lookup.set("Bench Press (Dumbbell)", {
  name: "Bench Press (Dumbbell)", primaryMuscles: ["chest"], secondaryMuscles: ["triceps", "front-delts"]
});
const [catalog, taxonomy] = await Promise.all([
  db.from("exercise_catalog").select("id,name,primary_muscles,secondary_muscles").eq("status", "published"),
  db.from("exercise_muscle_groups").select("id,code")
]);
if (catalog.error) throw catalog.error;
if (taxonomy.error) throw taxonomy.error;
const muscleIds = new Map(taxonomy.data.map(row => [row.code, row.id]));
const missing = catalog.data.filter(row => !row.primary_muscles.length && !row.secondary_muscles.length);
const plan = missing.map(row => {
  const source = lookup.get(aliases[row.name] ?? row.name);
  if (!source) throw new Error(`No explicit muscle mapping for ${row.name}`);
  const tags = (["primary", "secondary"] as const).flatMap(role =>
    source[role === "primary" ? "primaryMuscles" : "secondaryMuscles"].map(code => {
      const muscle_id = muscleIds.get(code);
      if (!muscle_id) throw new Error(`Unknown muscle code: ${code}`);
      return { exercise_id: row.id, muscle_id, role };
    })
  );
  return { id: row.id, name: row.name, tags };
});
console.log(JSON.stringify({ apply, exercises: plan.length, tags: plan.reduce((sum, row) => sum + row.tags.length, 0), names: plan.map(row => row.name) }));
if (apply && plan.length) {
  // Preserve any exercise tagged since the initial read; conflicts never overwrite.
  const current = await db.from("exercise_muscles").select("exercise_id").in("exercise_id", plan.map(row => row.id));
  if (current.error) throw current.error;
  const tagged = new Set(current.data.map(row => row.exercise_id));
  const tags = plan.filter(row => !tagged.has(row.id)).flatMap(row => row.tags);
  if (tags.length) {
    const result = await db.from("exercise_muscles").upsert(tags, { onConflict: "exercise_id,muscle_id", ignoreDuplicates: true });
    if (result.error) throw result.error;
  }
  console.log(`Inserted missing muscle tags for ${plan.length - tagged.size} exercises.`);
}
