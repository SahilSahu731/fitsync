import test from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, {
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
  GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com",
  JWT_SECRET: "test-secret-".repeat(6),
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test",
});
const { db } = await import("../src/config/supabase.js");
const { createTemplateSchema } = await import("../src/modules/workouts/workout.schema.js");
const { createTemplate } = await import("../src/modules/workouts/workout.service.js");

const owner = "00000000-0000-4000-8000-000000000001";
const exerciseId = "00000000-0000-4000-8000-000000000002";
const templateId = "00000000-0000-4000-8000-000000000003";
type Row = Record<string, unknown>;
type DbError = { code: string; message: string };

function database(
  t: test.TestContext,
  options: {
    baseline?: boolean;
    insertError?: { table: string; error: DbError };
    unavailable?: boolean;
  } = {},
) {
  const writes: { table: string; data: Row | Row[] }[] = [];
  const deletes: Record<string, unknown>[] = [];
  const visibility: string[] = [];
  const readOwners: unknown[] = [];
  t.mock.method(db, "from", (table: string) => {
    let inserted: Row | Row[] | undefined;
    let deleting = false;
    const filters: Row = {};
    const result = async () => {
      if (deleting) {
        deletes.push({ table, ...filters });
        return { data: null, error: null };
      }
      if (inserted !== undefined) {
        if (options.insertError?.table === table)
          return { data: null, error: options.insertError.error };
        if (options.baseline) {
          for (const row of Array.isArray(inserted) ? inserted : [inserted]) {
            const unknown =
              table === "workout_template_exercises"
                ? ["superset_group"].find((key) => Object.hasOwn(row, key))
                : table === "workout_template_sets"
                  ? ["rest_seconds", "tempo"].find((key) => Object.hasOwn(row, key))
                  : undefined;
            if (unknown)
              return {
                data: null,
                error: {
                  code: "PGRST204",
                  message: `Could not find the '${unknown}' column of '${table}' in the schema cache`,
                },
              };
          }
        }
        return {
          data: { id: table === "workout_templates" ? templateId : "template-exercise" },
          error: null,
        };
      }
      if (table === "exercises")
        return { data: options.unavailable ? [] : [{ id: exerciseId }], error: null };
      readOwners.push(filters.user_id);
      return {
        data: { id: templateId, name: "Upper body", workout_template_exercises: [] },
        error: null,
      };
    };
    const query: any = {
      select: () => query,
      in: () => query,
      eq: (key: string, value: unknown) => {
        filters[key] = value;
        return query;
      },
      or: (value: string) => {
        visibility.push(value);
        return query;
      },
      insert: (data: Row | Row[]) => {
        inserted = data;
        writes.push({ table, data });
        return query;
      },
      delete: () => {
        deleting = true;
        return query;
      },
      single: result,
      maybeSingle: result,
      then: (resolve: any, reject: any) => result().then(resolve, reject),
    };
    return query;
  });
  return { writes, deletes, visibility, readOwners };
}

function input(advanced = false) {
  return createTemplateSchema.parse({
    name: "Upper body",
    description: "Reusable targets",
    exercises: [
      {
        exerciseId,
        restSeconds: 90,
        ...(advanced ? { supersetGroup: "A" } : { supersetGroup: null }),
        sets: [
          {
            setType: advanced ? "rest_pause" : "normal",
            targetReps: 8,
            targetWeight: 22.5,
            ...(advanced
              ? { restSeconds: 0, tempo: "3-1-X-0" }
              : { restSeconds: null, tempo: null }),
          },
          {
            setType: "warmup",
            targetReps: 12,
            targetWeight: 10,
          },
        ],
      },
    ],
  });
}

test("ordinary routine creation works on the base workout schema without optional advanced columns", async (t) => {
  const state = database(t, { baseline: true });
  const saved = await createTemplate(owner, input());
  assert.equal(saved.id, templateId);
  assert.deepEqual(
    state.writes.map((row) => row.table),
    ["workout_templates", "workout_template_exercises", "workout_template_sets"],
  );
  assert.deepEqual(state.writes[0].data, {
    user_id: owner,
    name: "Upper body",
    description: "Reusable targets",
  });
  assert.deepEqual(state.writes[1].data, {
    template_id: templateId,
    exercise_id: exerciseId,
    position: 0,
    notes: "",
    rest_seconds: 90,
  });
  assert.deepEqual(state.writes[2].data, [
    {
      template_exercise_id: "template-exercise",
      position: 0,
      set_type: "normal",
      target_reps: 8,
      target_weight: 22.5,
      target_duration_seconds: null,
    },
    {
      template_exercise_id: "template-exercise",
      position: 1,
      set_type: "warmup",
      target_reps: 12,
      target_weight: 10,
      target_duration_seconds: null,
    },
  ]);
  assert.deepEqual(state.readOwners, [owner]);
  assert.deepEqual(state.visibility, [`owner_user_id.is.null,owner_user_id.eq.${owner}`]);
  assert.deepEqual(state.deletes, []);
});

test("creation retains requested superset, rest-pause, tempo and zero-second set rest", async (t) => {
  const state = database(t);
  await createTemplate(owner, input(true));
  assert.equal((state.writes[1].data as Row).superset_group, "A");
  const sets = state.writes[2].data as Row[];
  assert.equal(sets[0].set_type, "rest_pause");
  assert.equal(sets[0].rest_seconds, 0);
  assert.equal(sets[0].tempo, "3-1-X-0");
  assert.equal(Object.hasOwn(sets[1], "rest_seconds"), false);
  assert.equal(Object.hasOwn(sets[1], "tempo"), false);
});

for (const [table, error] of [
  [
    "workout_template_exercises",
    { code: "PGRST204", message: "Could not find the 'superset_group' column in the schema cache" },
  ],
  [
    "workout_template_sets",
    { code: "42703", message: 'column "tempo" of relation "workout_template_sets" does not exist' },
  ],
  [
    "workout_template_sets",
    { code: "PGRST204", message: "Could not find the 'rest_seconds' column in the schema cache" },
  ],
  [
    "workout_template_sets",
    {
      code: "23514",
      message: 'new row violates check constraint "workout_template_sets_set_type_check"',
    },
  ],
] as const) {
  test(`unavailable advanced storage (${error.code}, ${error.message}) fails clearly and removes the incomplete owned draft`, async (t) => {
    t.mock.method(console, "error", () => {});
    const state = database(t, { insertError: { table, error } });
    await assert.rejects(
      createTemplate(owner, input(true)),
      (failure: any) =>
        failure.status === 503 && /Advanced routine settings are unavailable/.test(failure.message),
    );
    assert.deepEqual(state.deletes, [
      { table: "workout_templates", id: templateId, user_id: owner },
    ]);
  });
}

test("unrelated storage failures keep their database error and clean up the incomplete owned routine", async (t) => {
  t.mock.method(console, "error", () => {});
  const state = database(t, {
    insertError: {
      table: "workout_template_sets",
      error: { code: "42703", message: 'column "target_weight" does not exist' },
    },
  });
  await assert.rejects(
    createTemplate(owner, input(true)),
    (failure: any) => failure.status === 500 && failure.message === "A database operation failed.",
  );
  assert.deepEqual(state.deletes, [{ table: "workout_templates", id: templateId, user_id: owner }]);
});

test("unavailable exercise selections create no partial routine", async (t) => {
  const state = database(t, { unavailable: true });
  await assert.rejects(createTemplate(owner, input()), /Some exercises are unavailable/);
  assert.deepEqual(state.writes, []);
});
