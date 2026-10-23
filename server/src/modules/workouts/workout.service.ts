import { db } from "../../config/supabase.js";
import { ApiError, checkDbError } from "../../common/errors.js";
import type { CreateTemplateInput } from "./workout.schema.js";
import { planPositionChanges } from "./workout.order.js";

function ensure<T>(
    data: T | null,
    message = "Resource not found."
): T {
    if (!data) throw new ApiError(404, message);
    return data;
}

async function getOwnedSession(userId: string, sessionId: string) {
    const { data, error } = await db
        .from("workout_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();

    checkDbError(error, "get workout session");
    return ensure(data);
}

async function assertActive(userId: string, sessionId: string) {
    const session = await getOwnedSession(userId, sessionId);

    if (session.status !== "active") {
        throw new ApiError(409, "Workout is no longer active.");
    }

    return session;
}

type MediaRow = { kind: string; delivery_url: string | null; sort_order: number };
type SessionExerciseWithMuscles = {
    [key: string]: unknown;
    exercises: {
        exercise_media?: { kind: string; provider: string; storage_path: string; delivery_url: string | null; sort_order: number }[];
        exercise_muscles: {
            role: string;
            exercise_muscle_groups: { code: string } | null;
        }[];
    } | null;
};

// Cover image: catalog routine image if it came from Explore/program,
// otherwise the first exercise's demo image.
function templateImage(row: any): string | null {
    const catalog =
        row.user_saved_routines?.[0]?.training_routines?.image_url ??
        row.user_saved_program_routines?.[0]?.training_routines?.image_url;
    if (catalog) return catalog;

    const exercises = [...(row.workout_template_exercises ?? [])].sort(
        (a: any, b: any) => a.position - b.position
    );
    for (const item of exercises) {
        const media: MediaRow[] = [...(item.exercises?.exercise_media ?? [])]
            .filter(m => m.kind === "image" && m.delivery_url)
            .sort((a, b) => a.sort_order - b.sort_order);
        if (media[0]?.delivery_url) return media[0].delivery_url;
    }
    return null;
}

export async function listTemplates(userId: string) {
    const { data, error } = await db
        .from("workout_templates")
        .select(`
      *,
      workout_template_exercises(
        id,
        position,
        exercises(name, exercise_media(kind, delivery_url, sort_order))
      ),
      user_saved_routines(routine_id, training_routines(image_url)),
      user_saved_program_routines(id, training_routines(image_url))
    `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    checkDbError(error, "list workout templates");
    return (data ?? []).map(row => {
        const { user_saved_routines, user_saved_program_routines, ...rest } = row as any;
        return {
            ...rest,
            workout_template_exercises: (row.workout_template_exercises ?? []).map((e: any) => ({
                id: e.id,
                position: e.position,
                exercises: { name: e.exercises?.name }
            })),
            image_url: templateImage(row),
            can_rename: !user_saved_routines?.length && !user_saved_program_routines?.length
        };
    });
}
export async function getTemplate(userId: string, id: string) {
    const { data, error } = await db
        .from("workout_templates")
        .select(`
      *,
      workout_template_exercises(
        *,
        exercises(name),
        workout_template_sets(*)
      )
    `)
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

    checkDbError(error, "get workout template");
    return ensure(data);
}

export async function createTemplate(
    userId: string,
    input: CreateTemplateInput
) {
    const exerciseIds = [
        ...new Set(input.exercises.map(e => e.exerciseId))
    ];

    const { data: validExercises, error: exerciseError } = await db
        .from("exercises")
        .select("id")
        .in("id", exerciseIds)
        .eq("status", "published");

    checkDbError(exerciseError, "validate exercises");

    if ((validExercises ?? []).length !== exerciseIds.length) {
        throw new ApiError(400, "Some exercises are unavailable.");
    }

    const { data: template, error } = await db
        .from("workout_templates")
        .insert({
            user_id: userId,
            name: input.name,
            description: input.description
        })
        .select()
        .single();

    checkDbError(error, "create workout template");

    try {
        for (const [position, item] of input.exercises.entries()) {
            const { data: exercise, error: insertError } = await db
                .from("workout_template_exercises")
                .insert({
                    template_id: template.id,
                    exercise_id: item.exerciseId,
                    position,
                    notes: item.notes,
                    rest_seconds: item.restSeconds
                })
                .select()
                .single();

            checkDbError(insertError, "insert template exercise");

            const { error: setError } = await db
                .from("workout_template_sets")
                .insert(
                    item.sets.map((set, index) => ({
                        template_exercise_id: exercise.id,
                        position: index,
                        set_type: set.setType,
                        target_reps: set.targetReps ?? null,
                        target_weight: set.targetWeight ?? null,
                        target_duration_seconds:
                            set.targetDurationSeconds ?? null
                    }))
                );

            checkDbError(setError, "insert template sets");
        }
    } catch (error) {
        await db
            .from("workout_templates")
            .delete()
            .eq("id", template.id)
            .eq("user_id", userId);

        throw error;
    }

    return getTemplate(userId, template.id);
}

export async function deleteTemplate(userId: string, id: string) {
    await getTemplate(userId, id);

    const { error } = await db
        .from("workout_templates")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

    checkDbError(error, "delete workout template");
}

export async function getSession(userId: string, id: string) {
    await getOwnedSession(userId, id);

    const { data, error } = await db
        .from("workout_sessions")
        .select(`
      *,
      workout_session_exercises(
        *,
        exercises(exercise_muscles(role,exercise_muscle_groups(code)),exercise_media(kind,provider,storage_path,delivery_url,sort_order)),
        workout_logged_sets(*)
      )
    `)
        .eq("id", id)
        .eq("user_id", userId)
        .single();

    checkDbError(error, "load workout session");
    return {
        ...data,
        workout_session_exercises: (data.workout_session_exercises ?? []).map((item: SessionExerciseWithMuscles) => {
            // Muscle arrays belong to exercise_catalog, not the exercises table.
            // Keep the mobile response shape while reading the underlying relations.
            const muscles = item.exercises?.exercise_muscles ?? [];
            const image = [...(item.exercises?.exercise_media ?? [])]
                .filter(media => media.kind === "image")
                .sort((a, b) => a.sort_order - b.sort_order)[0];
            const codesFor = (role: string) => muscles
                .filter(muscle => muscle.role === role)
                .flatMap(muscle => muscle.exercise_muscle_groups?.code
                    ? [muscle.exercise_muscle_groups.code]
                    : []);

            return {
                ...item,
                image_url: image ? (image.provider === "supabase"
                    ? db.storage.from("exercise-images").getPublicUrl(image.storage_path).data.publicUrl
                    : image.delivery_url) : null,
                exercises: {
                    primary_muscles: codesFor("primary"),
                    secondary_muscles: codesFor("secondary")
                }
            };
        })
    };
}

export async function getActiveSession(userId: string) {
    const { data, error } = await db
        .from("workout_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

    checkDbError(error, "find active workout");

    if (!data) return null;
    return getSession(userId, data.id);
}

export async function startWorkout(
    userId: string,
    templateId?: string
) {
    const active = await getActiveSession(userId);

    if (active) {
        throw new ApiError(409, "Finish or discard your current workout.");
    }

    const template = templateId
        ? await getTemplate(userId, templateId)
        : null;

    const { data: session, error } = await db
        .from("workout_sessions")
        .insert({
            user_id: userId,
            template_id: templateId ?? null,
            name: template?.name ?? "Quick Workout"
        })
        .select()
        .single();

    if (error?.code === "23505") {
        throw new ApiError(409, "You already have an active workout.");
    }

    checkDbError(error, "start workout");

    try {
        if (template) {
            const items = [...template.workout_template_exercises]
                .sort((a, b) => a.position - b.position);

            for (const item of items) {
                await addSessionExercise(
                    userId,
                    session.id,
                    item.exercise_id,
                    item.rest_seconds,
                    [...item.workout_template_sets]
                        .sort((a, b) => a.position - b.position),
                    false
                );
            }
        }
    } catch (error) {
        await db
            .from("workout_sessions")
            .delete()
            .eq("id", session.id)
            .eq("user_id", userId);

        throw error;
    }

    return getSession(userId, session.id);
}

export async function removeSessionExercise(userId: string, sessionId: string, exerciseItemId: string) {
    await assertActive(userId, sessionId);
    const { data, error } = await db.from("workout_session_exercises").delete()
        .eq("session_id", sessionId).eq("id", exerciseItemId).select("id");
    checkDbError(error, "remove workout exercise");
    if (!data?.length) throw new ApiError(404, "Exercise not found in this workout.");
    return getSession(userId, sessionId);
}

// Serialize reorder requests within this server; conditional writes also reject
// stale positions from other instances instead of silently overwriting them.
const ordering = new Set<string>();
export async function reorderSessionExercises(userId: string, sessionId: string, ids: string[]) {
    await assertActive(userId, sessionId);
    if (ordering.has(sessionId)) throw new ApiError(409, "An order update is already in progress. Try again.");
    ordering.add(sessionId);
    try {
        const rows = await db.from("workout_session_exercises").select("id,position").eq("session_id", sessionId);
        checkDbError(rows.error, "load exercise order");
        let changes: ReturnType<typeof planPositionChanges>;
        try { changes = planPositionChanges(rows.data ?? [], ids); }
        catch { throw new ApiError(409, "Exercise list changed. Reload the workout and try again."); }
        const attempted: typeof changes = [];
        try {
            for (const change of changes) {
                attempted.push(change);
                const result = await db.from("workout_session_exercises").update({ position: change.to })
                    .eq("session_id", sessionId).eq("id", change.id).eq("position", change.from).select("id");
                checkDbError(result.error, "save exercise order");
                if (!result.data?.length) throw new ApiError(409, "Exercise order changed. Reload the workout and try again.");
            }
        } catch (error) {
            // Undo in reverse order, including an uncertain network response.
            // The position condition avoids overwriting unrelated concurrent edits.
            for (const change of attempted.reverse()) {
                const rollback = await db.from("workout_session_exercises").update({ position: change.from })
                    .eq("session_id", sessionId).eq("id", change.id).eq("position", change.to);
                if (rollback.error) console.error("[DATABASE] restore exercise order:", rollback.error.message);
            }
            throw error;
        }
        return getSession(userId, sessionId);
    } finally { ordering.delete(sessionId); }
}

export async function addSessionExercises(
    userId: string, sessionId: string, exerciseIds: string[], restSeconds = 90
) {
    await assertActive(userId, sessionId);
    const [catalog, existing] = await Promise.all([
        db.from("exercises").select("id,name,tracking_type").in("id", exerciseIds).eq("status", "published"),
        db.from("workout_session_exercises").select("exercise_id,position").eq("session_id", sessionId)
    ]);
    checkDbError(catalog.error, "validate selected exercises");
    checkDbError(existing.error, "load workout exercises");
    const available = catalog.data ?? [];
    if (available.length !== exerciseIds.length) throw new ApiError(400, "Some selected exercises are unavailable. Refresh the list and try again.");
    const alreadyAdded = new Set((existing.data ?? []).map(row => row.exercise_id));
    const ids = exerciseIds.filter(id => !alreadyAdded.has(id));
    // Retrying after a lost response must not duplicate the selected exercises.
    if (!ids.length) return getSession(userId, sessionId);
    const firstPosition = Math.max(-1, ...(existing.data ?? []).map(row => row.position)) + 1;
    const rows = ids.map((id, index) => {
        const exercise = available.find(row => row.id === id)!;
        return {
            session_id: sessionId, exercise_id: id, exercise_name: exercise.name,
            tracking_type: exercise.tracking_type, position: firstPosition + index, rest_seconds: restSeconds
        };
    });
    const inserted = await db.from("workout_session_exercises").insert(rows).select("id");
    checkDbError(inserted.error, "add selected exercises");
    const itemIds = (inserted.data ?? []).map(row => row.id);
    const sets = await db.from("workout_logged_sets").insert(itemIds.map(id => ({
        session_exercise_id: id, position: 0, set_type: "normal"
    })));
    if (sets.error) {
        const cleanup = await db.from("workout_session_exercises").delete().eq("session_id", sessionId).in("id", itemIds);
        checkDbError(cleanup.error, "remove incomplete exercise additions");
        checkDbError(sets.error, "create selected exercise sets");
    }
    return getSession(userId, sessionId);
}

export async function addSessionExercise(
    userId: string,
    sessionId: string,
    exerciseId: string,
    restSeconds = 90,
    plannedSets?: Array<{
        set_type: string;
        target_weight: number | null;
        target_reps: number | null;
        target_duration_seconds: number | null;
    }>,
    hydrate = true
) {
    await assertActive(userId, sessionId);

    const { data: exercise, error: exerciseError } = await db
        .from("exercises")
        .select("id, name, tracking_type")
        .eq("id", exerciseId)
        .eq("status", "published")
        .maybeSingle();

    checkDbError(exerciseError, "find exercise");
    ensure(exercise, "Exercise not found.");

    const { data: existing, error: listError } = await db
        .from("workout_session_exercises")
        .select("position")
        .eq("session_id", sessionId)
        .order("position", { ascending: false })
        .limit(1);

    checkDbError(listError, "find next exercise position");

    const position = existing?.length
        ? existing[0].position + 1
        : 0;

    const { data: item, error } = await db
        .from("workout_session_exercises")
        .insert({
            session_id: sessionId,
            exercise_id: exercise?.id,
            exercise_name: exercise?.name,
            tracking_type: exercise?.tracking_type,
            position,
            rest_seconds: restSeconds
        })
        .select()
        .single();

    checkDbError(error, "add workout exercise");

    const sets = plannedSets?.length
        ? plannedSets.map((set, index) => ({
            session_exercise_id: item.id,
            position: index,
            set_type: set.set_type,
            weight_kg: set.target_weight,
            reps: set.target_reps,
            duration_seconds: set.target_duration_seconds
        }))
        : [{
            session_exercise_id: item.id,
            position: 0,
            set_type: "normal"
        }];

    const { error: setError } = await db
        .from("workout_logged_sets")
        .insert(sets);

    if (setError) {
        await db
            .from("workout_session_exercises")
            .delete()
            .eq("id", item.id);

        checkDbError(setError, "create exercise sets");
    }

    return hydrate ? getSession(userId, sessionId) : null;
}

export async function addSet(
    userId: string,
    sessionId: string,
    exerciseItemId: string,
    input: {
        setType: string;
        weightKg: number | null;
        reps: number | null;
    }
) {
    await assertActive(userId, sessionId);

    const { data: exercise, error } = await db
        .from("workout_session_exercises")
        .select("id")
        .eq("id", exerciseItemId)
        .eq("session_id", sessionId)
        .maybeSingle();

    checkDbError(error, "find session exercise");
    ensure(exercise);

    const { data: sets, error: setsError } = await db
        .from("workout_logged_sets")
        .select("position,weight_kg,reps,duration_seconds,distance_meters")
        .eq("session_exercise_id", exerciseItemId)
        .order("position", { ascending: false })
        .limit(1);

    checkDbError(setsError, "find next set");

    const position = sets?.length ? sets[0].position + 1 : 0;

    const { error: insertError } = await db
        .from("workout_logged_sets")
        .insert({
            session_exercise_id: exerciseItemId,
            position,
            set_type: input.setType,
            weight_kg: input.weightKg ?? sets?.[0]?.weight_kg ?? null,
            reps: input.reps ?? sets?.[0]?.reps ?? null,
            duration_seconds: sets?.[0]?.duration_seconds ?? null,
            distance_meters: sets?.[0]?.distance_meters ?? null
        });

    checkDbError(insertError, "add workout set");

    return getSession(userId, sessionId);
}

export async function updateSet(
    userId: string,
    sessionId: string,
    setId: string,
    input: Record<string, unknown>,
    compact = false
) {
    await assertActive(userId, sessionId);

    const { data: exercises, error: exerciseError } = await db
        .from("workout_session_exercises")
        .select("id")
        .eq("session_id", sessionId);

    checkDbError(exerciseError, "find workout exercises");

    const ids = (exercises ?? []).map(e => e.id);
    if (!ids.length) throw new ApiError(404, "Set not found.");

    const { data: set, error: lookupError } = await db
        .from("workout_logged_sets")
        .select("id")
        .eq("id", setId)
        .in("session_exercise_id", ids)
        .maybeSingle();

    checkDbError(lookupError, "find workout set");
    ensure(set);

    const columns: Record<string, string> = {
        setType: "set_type",
        weightKg: "weight_kg",
        reps: "reps",
        durationSeconds: "duration_seconds",
        distanceMeters: "distance_meters",
        rpe: "rpe",
        rir: "rir",
        notes: "notes"
    };

    const update: Record<string, unknown> = {};

    for (const [key, column] of Object.entries(columns)) {
        if (input[key] !== undefined) {
            update[column] = input[key];
        }
    }

    if (input.completed !== undefined) {
        update.completed_at = input.completed
            ? new Date().toISOString()
            : null;
    }

    const { data: savedSet, error } = await db
        .from("workout_logged_sets")
        .update(update)
        .eq("id", setId).select("*").single();

    checkDbError(error, "update workout set");

    return compact ? savedSet : getSession(userId, sessionId);
}

export async function finishWorkout(
    userId: string,
    sessionId: string,
    status: "completed" | "discarded",
    notes = "",
    elapsedSeconds?: number
) {
    const session = await assertActive(userId, sessionId);

    const finishedAt = new Date();
    const elapsed = elapsedSeconds ??
        Math.floor(
            (finishedAt.getTime() -
                new Date(session.started_at).getTime()) / 1000
        );

    const { error } = await db
        .from("workout_sessions")
        .update({
            status,
            notes,
            finished_at: finishedAt.toISOString(),
            elapsed_seconds: elapsed,
            updated_at: finishedAt.toISOString()
        })
        .eq("id", sessionId)
        .eq("user_id", userId)
        .eq("status", "active");

    checkDbError(error, "finish workout");

    return getSession(userId, sessionId);
}

export async function listHistory(userId: string) {
    const { data, error } = await db
        .from("workout_sessions")
        .select("id, name, started_at, finished_at, elapsed_seconds")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("started_at", { ascending: false })
        .limit(100);

    checkDbError(error, "list workout history");
    return data ?? [];
}
export async function renameTemplate(userId: string, id: string, name: string) {
    const templates = await listTemplates(userId);
    const template = templates.find(row => row.id === id);
    if (!template) throw new ApiError(404, "Routine not found.");
    if (!template.can_rename) throw new ApiError(403, "Only routines you created can be renamed.");
    const { error } = await db.from("workout_templates").update({ name }).eq("id", id).eq("user_id", userId);
    checkDbError(error, "rename routine");
    return { id, name };
}

export async function updateSessionNotes(userId: string, id: string, notes: string) {
    await assertActive(userId, id);
    const { error } = await db.from("workout_sessions").update({ notes }).eq("id", id).eq("user_id", userId).eq("status", "active");
    checkDbError(error, "save workout notes");
    return { notes };
}
