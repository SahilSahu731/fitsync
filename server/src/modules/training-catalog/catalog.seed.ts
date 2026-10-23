import "dotenv/config";

import { db } from "../../config/supabase.js";
import {
  categories,
  routines,
  programs
} from "./catalog.data.js";

const IMAGES = {
  gym: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=85",
  home: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=1200&q=85",
  dumbbells: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=85",
  cardio: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=85",
  travel: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=1200&q=85",
  bands: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=1200&q=85",
  strength: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=85"
};

const categoryImages: Record<string, string> = {
  "at-home": IMAGES.home,
  "travel": IMAGES.travel,
  "dumbbells": IMAGES.dumbbells,
  "bands": IMAGES.bands,
  "cardio-hiit": IMAGES.cardio,
  "gym": IMAGES.gym,
  "bodyweight": IMAGES.home,
  "suspension": IMAGES.strength
};

function imageForRoutine(category: string) {
  return categoryImages[category] ?? IMAGES.gym;
}

function imageForProgram(equipment: string) {
  if (equipment === "bodyweight") return IMAGES.home;
  if (equipment === "dumbbells") return IMAGES.dumbbells;
  if (equipment === "bands") return IMAGES.bands;
  return IMAGES.gym;
}

function normalize(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

async function upsertBySlug(
  table: string,
  row: Record<string, unknown>
): Promise<string> {
  const { data, error } = await db
    .from(table)
    .upsert(row, { onConflict: "slug" })
    .select("id")
    .single();

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return data.id;
}

async function main() {
  console.log("\nStarting FitSync training catalog seed...\n");

  // STEP 1: Load published exercises.

  const { data: exercises, error: exerciseError } = await db
    .from("exercises")
    .select("id,name,status")
    .eq("status", "published");

  if (exerciseError) {
    throw new Error(exerciseError.message);
  }

  const exerciseMap = new Map<string, string>();

  for (const exercise of exercises ?? []) {
    exerciseMap.set(normalize(exercise.name), exercise.id);
  }

  console.log(`Published exercises: ${exerciseMap.size}`);

  if (exerciseMap.size === 0) {
    throw new Error("No published exercises found.");
  }

  // STEP 2: Validate all routines before modifying the catalog.

  const missingExercises = new Set<string>();

  for (const routine of routines) {
    for (const exercise of routine.exercises) {
      if (!exerciseMap.has(normalize(exercise.name))) {
        missingExercises.add(exercise.name);
      }
    }
  }

  if (missingExercises.size > 0) {
    console.error("\nMissing exercises:");

    for (const name of missingExercises) {
      console.error(`  - ${name}`);
    }

    throw new Error(
      `Catalog validation failed: ${missingExercises.size} exercises missing.`
    );
  }

  const routineSlugs = new Set(routines.map(r => r.slug));

  for (const program of programs) {
    for (const slug of program.schedule) {
      if (slug && !routineSlugs.has(slug)) {
        throw new Error(
          `Program ${program.slug} references missing routine ${slug}`
        );
      }
    }
  }

  console.log("All routine and program references validated.\n");

  // STEP 3: Seed categories.

  const categoryIds = new Map<string, string>();

  for (const [index, category] of categories.entries()) {
    const id = await upsertBySlug(
      "training_routine_categories",
      {
        slug: category.slug,
        name: category.name,
        description: category.description,
        image_url: categoryImages[category.slug] ?? null,
        position: index
      }
    );

    categoryIds.set(category.slug, id);
    console.log(`CATEGORY: ${category.name}`);
  }

  // STEP 4: Seed routines.

  const routineIds = new Map<string, string>();

  for (const routine of routines) {
    const categoryId = categoryIds.get(routine.category);

    if (!categoryId) {
      throw new Error(
        `Missing category for ${routine.slug}: ${routine.category}`
      );
    }

    const routineId = await upsertBySlug(
      "training_routines",
      {
        slug: routine.slug,
        name: routine.name,
        description: routine.description,
        category_id: categoryId,
        image_url: imageForRoutine(routine.category),
        level: routine.level,
        goal: routine.goal,
        equipment: routine.equipment,
        estimated_minutes: routine.minutes,
        author: "FitSync",
        published: false
      }
    );

    const { error: deleteError } = await db
      .from("training_routine_exercises")
      .delete()
      .eq("routine_id", routineId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const rows = routine.exercises.map((exercise, index) => ({
      routine_id: routineId,
      exercise_id: exerciseMap.get(normalize(exercise.name))!,
      position: index,
      sets: exercise.sets,
      min_reps: exercise.minReps,
      max_reps: exercise.maxReps,
      rest_seconds: exercise.rest,
      set_type: "normal",
      notes: exercise.notes
    }));

    const { error: insertError } = await db
      .from("training_routine_exercises")
      .insert(rows);

    if (insertError) {
      throw new Error(
        `Could not seed ${routine.name}: ${insertError.message}`
      );
    }

    const { error: publishError } = await db
      .from("training_routines")
      .update({ published: true })
      .eq("id", routineId);

    if (publishError) {
      throw new Error(publishError.message);
    }

    routineIds.set(routine.slug, routineId);

    console.log(
      `ROUTINE: ${routine.name} (${rows.length} exercises)`
    );
  }

  // STEP 5: Seed programs.

  for (const program of programs) {
    const programId = await upsertBySlug(
      "training_programs",
      {
        slug: program.slug,
        name: program.name,
        tagline: program.tagline,
        description: program.description,
        cover_url: imageForProgram(program.equipment),
        level: program.level,
        goal: program.goal,
        equipment: program.equipment,
        duration_weeks: program.weeks,
        days_per_week: program.schedule.filter(Boolean).length,
        featured_rank: program.featuredRank ?? null,
        author: "FitSync",
        published: false
      }
    );

    const { error: deleteError } = await db
      .from("training_program_days")
      .delete()
      .eq("program_id", programId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const days = program.schedule.map((slug, index) => ({
      program_id: programId,
      day_number: index + 1,
      routine_id: slug ? routineIds.get(slug)! : null,
      label: slug
        ? routines.find(r => r.slug === slug)!.name
        : "Rest Day"
    }));

    const { error: insertError } = await db
      .from("training_program_days")
      .insert(days);

    if (insertError) {
      throw new Error(
        `Could not seed ${program.name}: ${insertError.message}`
      );
    }

    const { error: publishError } = await db
      .from("training_programs")
      .update({ published: true })
      .eq("id", programId);

    if (publishError) {
      throw new Error(publishError.message);
    }

    console.log(`PROGRAM: ${program.name}`);
  }

  console.log("\n==================================");
  console.log("FITSYNC CATALOG SEED COMPLETE");
  console.log(`Categories: ${categories.length}`);
  console.log(`Routines: ${routines.length}`);
  console.log(`Programs: ${programs.length}`);
  console.log("==================================\n");
}

main().catch(error => {
  console.error("\nSEED FAILED:", error);
  process.exitCode = 1;
});