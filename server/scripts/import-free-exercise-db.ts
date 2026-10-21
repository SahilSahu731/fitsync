
import "dotenv/config";

import { db } from "../src/config/supabase.js";
import {
  exerciseInputSchema
} from "../src/modules/exercises/exercise.schema.js";

const SOURCE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";

type SourceExercise = {
  id: string;
  name: string;
  category: string;
  level: string;
  force: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
};

const muscles: Record<string, string> = {
  abdominals: "abs",
  abductors: "abductors",
  adductors: "adductors",
  biceps: "biceps",
  calves: "calves",
  chest: "chest",
  forearms: "forearms",
  glutes: "glutes",
  hamstrings: "hamstrings",
  lats: "lats",
  "lower back": "lower-back",
  "middle back": "upper-back",
  quadriceps: "quads",
  traps: "traps",
  triceps: "triceps"
};

const equipment: Record<string, string> = {
  dumbbell: "dumbbell",
  barbell: "barbell",
  cable: "cable",
  machine: "machine",
  kettlebells: "kettlebell",
  bands: "resistance-band",
  "body only": "bodyweight",
  "medicine ball": "medicine-ball",
  "exercise ball": "exercise-ball",
  "e-z curl bar": "ez-bar",
  "foam roll": "foam-roller",
  other: "other"
};

const lower = new Set([
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "adductors",
  "abductors"
]);

const core = new Set([
  "abs",
  "obliques"
]);

function slug(value: string) {
  return value.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function mapMuscles(values: string[]) {
  return [...new Set(
    values
      .map(value => muscles[value.toLowerCase()])
      .filter((value): value is string => Boolean(value))
  )];
}

function mapBodyRegion(targets: string[]) {
  if (targets.length === 0) return "full-body";

  if (targets.every(target => lower.has(target))) {
    return "lower-body";
  }

  if (targets.every(target => core.has(target))) {
    return "core";
  }

  if (targets.some(target => lower.has(target))) {
    return "full-body";
  }

  return "upper-body";
}

function normalize(item: SourceExercise) {
  // Restrict the importer to categories we can classify reliably.
  if (![
    "strength",
    "powerlifting",
    "olympic weightlifting",
    "stretching"
  ].includes(item.category)) {
    return null;
  }

  const primaryMuscles = mapMuscles(item.primaryMuscles ?? []);

  // Skip ambiguous muscle classifications for manual review.
  if (
    !item.primaryMuscles?.length ||
    primaryMuscles.length !== new Set(item.primaryMuscles).size
  ) {
    return null;
  }

  const secondaryMuscles = mapMuscles(
    item.secondaryMuscles ?? []
  ).filter(value => !primaryMuscles.includes(value));

  const category = item.category === "stretching"
    ? "mobility"
    : "strength";

  const mappedEquipment = item.equipment
    ? equipment[item.equipment.toLowerCase()]
    : "bodyweight";

  if (!mappedEquipment) return null;

  const instructions = (item.instructions ?? [])
    .map(value => value.trim())
    .filter(value => value.length >= 2 && value.length <= 500)
    .slice(0, 30);

  if (!instructions.length) return null;

  return exerciseInputSchema.parse({
    slug: slug(item.id),
    name: item.name.trim().slice(0, 120),

    description:
      `Imported draft for editorial review. Source: ${SOURCE}`,

    category,
    activityType: category === "mobility"
      ? "stretching"
      : "weight-training",

    bodyRegion: mapBodyRegion(primaryMuscles),

    difficulty: item.level === "expert"
      ? "advanced"
      : item.level === "intermediate"
        ? "intermediate"
        : "beginner",

    trackingType: category === "mobility"
      ? "duration"
      : "reps_weight",

    movementPattern: category === "mobility"
      ? "mobility"
      : item.force === "push"
        ? "push"
        : item.force === "pull"
          ? "pull"
          : "other",

    primaryMuscles,
    secondaryMuscles,
    equipment: [mappedEquipment],

    instructions,
    tips: [],
    mistakes: [],
    safetyNotes: [],
    breathingTip: "",
    status: "draft"
  });
}

async function main() {
  const adminId = process.env.SEED_ADMIN_USER_ID;

  if (!adminId) {
    throw new Error("Set SEED_ADMIN_USER_ID.");
  }

  const { data: admin, error } = await db
    .from("app_users")
    .select("role")
    .eq("id", adminId)
    .single();

  if (error || admin?.role !== "admin") {
    throw new Error("Seed user must be admin.");
  }

  const limitArg = process.argv.find(arg =>
    arg.startsWith("--limit=")
  );

  const limit = limitArg
    ? Number(limitArg.split("=")[1])
    : 25;

  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error("Limit must be between 1 and 1000.");
  }

  const response = await fetch(SOURCE);

  if (!response.ok) {
    throw new Error("Could not download exercise metadata.");
  }

  const items = await response.json() as SourceExercise[];

  let imported = 0;
  let skipped = 0;

  for (const item of items) {
    if (imported >= limit) break;

    let input;

    try {
      input = normalize(item);
    } catch {
      skipped++;
      continue;
    }

    if (!input) {
      skipped++;
      continue;
    }

    const { error } = await db.rpc(
      "save_fitsync_exercise",
      {
        p_id: null,
        p_actor: adminId,
        p_data: input
      }
    );

    if (error?.code === "23505") {
      skipped++;
      continue;
    }

    if (error) {
      console.error(item.name, error.message);
      skipped++;
      continue;
    }

    imported++;
    console.log(`${imported}. ${item.name}`);
  }

  console.log({ imported, skipped });
  console.log("All imported entries remain drafts.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
