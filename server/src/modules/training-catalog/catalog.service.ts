import { programError } from "../program-follow/program.service.js";
import { db } from "../../config/supabase.js";
import { ApiError, checkDbError } from "../../common/errors.js";

type Filters = {
    level?: string;
    goal?: string;
    equipment?: string;
};

function required<T>(value: T | null, message: string): T {
    if (!value) throw new ApiError(404, message);
    return value;
}

export async function listPrograms(filters: Filters = {}) {
    let query = db
        .from("training_programs")
        .select("*")
        .eq("published", true);

    if (filters.level) query = query.eq("level", filters.level);
    if (filters.goal) query = query.eq("goal", filters.goal);
    if (filters.equipment) query = query.eq("equipment", filters.equipment);

    const { data, error } = await query
        .order("featured_rank", { ascending: true, nullsFirst: false })
        .order("name");

    checkDbError(error, "list programs");
    return data ?? [];
}

export async function getProgram(id: string) {
    const { data, error } = await db
        .from("training_programs")
        .select(`
      *,
      training_program_days(
        *,
        training_routines(
          *,
          training_routine_exercises(
            *,
            exercises(id,name,tracking_type)
          )
        )
      )
    `)
        .eq("id", id)
        .eq("published", true)
        .maybeSingle();

    checkDbError(error, "get program");
    return required(data, "Program not found.");
}

export async function listCategories() {
    const { data, error } = await db
        .from("training_routine_categories")
        .select("*")
        .order("position");

    checkDbError(error, "list categories");
    return data ?? [];
}

export async function listRoutines(categorySlug?: string) {
    let query = db
        .from("training_routines")
        .select("*, training_routine_categories(slug,name)")
        .eq("published", true);

    if (categorySlug) {
        const { data: category, error } = await db
            .from("training_routine_categories")
            .select("id")
            .eq("slug", categorySlug)
            .maybeSingle();

        checkDbError(error, "find category");
        if (!category) return [];

        query = query.eq("category_id", category.id);
    }

    const { data, error } = await query.order("name");
    checkDbError(error, "list routines");
    return data ?? [];
}

export async function getRoutine(id: string) {
    const { data, error } = await db
        .from("training_routines")
        .select(`
      *,
      training_routine_exercises(
        *,
        exercises(id,name,tracking_type)
      )
    `)
        .eq("id", id)
        .eq("published", true)
        .maybeSingle();

    checkDbError(error, "get routine");
    return required(data, "Routine not found.");
}

async function copyRoutine(
    userId: string,
    routineId: string
): Promise<string> {
    const routine = await getRoutine(routineId);

    const { data: template, error } = await db
        .from("workout_templates")
        .insert({
            user_id: userId,
            name: routine.name,
            description: routine.description
        })
        .select("id")
        .single();

    checkDbError(error, "create personal routine");
    if (!template) throw new ApiError(500, "Could not create personal routine.");

    try {
        const exercises = [...routine.training_routine_exercises]
            .sort((a, b) => a.position - b.position);

        for (const [position, item] of exercises.entries()) {
            const { data: exercise, error: exerciseError } = await db
                .from("workout_template_exercises")
                .insert({
                    template_id: template.id,
                    exercise_id: item.exercise_id,
                    position,
                    notes: item.notes,
                    rest_seconds: item.rest_seconds
                })
                .select("id")
                .single();

            checkDbError(exerciseError, "copy routine exercise");
            if (!exercise) throw new ApiError(500, "Could not copy routine exercise.");

            const { error: setsError } = await db
                .from("workout_template_sets")
                .insert(Array.from({ length: item.sets }, (_, index) => ({
                    template_exercise_id: exercise.id,
                    position: index,
                    set_type: item.set_type,
                    target_reps: item.exercises?.tracking_type === "duration" ? null : item.max_reps,
                    target_weight: null,
                    target_duration_seconds: item.exercises?.tracking_type === "duration" ? item.max_reps : null
                })));

            checkDbError(setsError, "copy routine sets");
        }

        return template.id;
    } catch (error) {
        await db.from("workout_templates")
            .delete()
            .eq("id", template.id)
            .eq("user_id", userId);

        throw error;
    }
}

export async function saveRoutine(userId: string, routineId: string) {
    const { data: existing, error: lookupError } = await db
        .from("user_saved_routines")
        .select("template_id")
        .eq("user_id", userId)
        .eq("routine_id", routineId)
        .maybeSingle();

    checkDbError(lookupError, "find saved routine");

    if (existing) return {
        saved: true,
        templateId: existing.template_id
    };

    const templateId = await copyRoutine(userId, routineId);

    const { error } = await db
        .from("user_saved_routines")
        .insert({
            user_id: userId,
            routine_id: routineId,
            template_id: templateId
        });

    if (error) {
        await db.from("workout_templates")
            .delete()
            .eq("id", templateId)
            .eq("user_id", userId);

        checkDbError(error, "save routine");
    }

    return { saved: true, templateId };
}

export async function saveProgram(userId: string, programId: string) {
    const program = await getProgram(programId);

    const { data: existing, error: lookupError } = await db
        .from("user_saved_programs")
        .select("id")
        .eq("user_id", userId)
        .eq("program_id", programId)
        .maybeSingle();

    checkDbError(lookupError, "find saved program");

    if (existing) return {
        saved: true,
        savedProgramId: existing.id
    };

    const { data: saved, error } = await db
        .from("user_saved_programs")
        .insert({
            user_id: userId,
            program_id: programId
        })
        .select("id")
        .single();

    checkDbError(error, "save program");
    if (!saved) throw new ApiError(500, "Could not save program.");

    try {
        const routineIds = [
            ...new Set<string>(
                program.training_program_days
                    .map((day: { routine_id: string | null }) => day.routine_id)
                    .filter((id: string | null): id is string => Boolean(id))
            )
        ];

        for (const routineId of routineIds) {
            const templateId = await copyRoutine(userId, routineId);

            const { error: linkError } = await db
                .from("user_saved_program_routines")
                .insert({
                    saved_program_id: saved?.id,
                    source_routine_id: routineId,
                    template_id: templateId
                });

            checkDbError(linkError, "link saved routine");
        }
    } catch (error) {
        const { data: links } = await db
            .from("user_saved_program_routines")
            .select("template_id")
            .eq("saved_program_id", saved.id);

        for (const link of links ?? []) {
            await db.from("workout_templates")
                .delete()
                .eq("id", link.template_id)
                .eq("user_id", userId);
        }

        await db.from("user_saved_programs")
            .delete()
            .eq("id", saved.id)
            .eq("user_id", userId);

        throw error;
    }

    return {
        saved: true,
        savedProgramId: saved.id
    };
}

export async function myPrograms(userId: string) {
    const { data, error } = await db
        .from("user_saved_programs")
        .select(`
      id,
      saved_at,
      training_programs(id,name,tagline,cover_url,level,goal,equipment,days_per_week,duration_weeks),
      user_saved_program_routines(
        source_routine_id,
        template_id
      )
    `)
        .eq("user_id", userId)
        .order("saved_at", { ascending: false });

    checkDbError(error, "list saved programs");
    return data ?? [];
}
export async function myRoutines(userId: string) {
    const { data, error } = await db.from("user_saved_routines")
        .select("routine_id,template_id").eq("user_id", userId);
    checkDbError(error, "list saved routines");
    return data ?? [];
}

export async function deleteSavedProgram(userId: string, id: string) {
    const { data, error } = await db.from("user_saved_programs")
        .select("id,user_saved_program_routines(template_id)").eq("id", id).eq("user_id", userId).maybeSingle();
    checkDbError(error, "find saved program");
    if (!data) throw new ApiError(404, "Saved program not found.");
    const ids = data.user_saved_program_routines.map(row => row.template_id);
    if (ids.length) {
        const { error: deleteError } = await db.from("workout_templates").delete().in("id", ids).eq("user_id", userId);
        programError(deleteError, "remove program routines");
    }
    const { error: removeError } = await db.from("user_saved_programs").delete().eq("id", id).eq("user_id", userId);
    checkDbError(removeError, "remove saved program");
}
