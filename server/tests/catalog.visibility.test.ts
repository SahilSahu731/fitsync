import test from "node:test";
import assert from "node:assert/strict";

Object.assign(process.env, {
  NODE_ENV: "test",
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key-not-real",
  GOOGLE_WEB_CLIENT_ID: "test.apps.googleusercontent.com",
  JWT_SECRET: "test-secret-".repeat(6),
  CLOUDINARY_CLOUD_NAME: "test",
  CLOUDINARY_API_KEY: "test",
  CLOUDINARY_API_SECRET: "test",
});
const { db } = await import("../src/config/supabase.js");
const { getProgram, getRoutine } =
  await import("../src/modules/training-catalog/catalog.service.js");

function routine() {
  return {
    id: "routine",
    name: "Published training",
    published: true,
    training_routine_exercises: [
      {
        exercise_id: "exercise",
        position: 0,
        exercises: {
          id: "exercise",
          name: "Press",
          tracking_type: "reps_weight",
          status: "published",
          owner_user_id: null,
        },
      },
    ],
  };
}

function fixture(t: test.TestContext, row: unknown, table: string) {
  t.mock.method(db, "from", (name: string) => {
    assert.equal(name, table);
    const filters: Record<string, unknown> = {};
    const builder: any = {
      select(columns: string) {
        assert.ok(columns.includes("status,owner_user_id"));
        return builder;
      },
      eq(key: string, value: unknown) {
        filters[key] = value;
        return builder;
      },
      maybeSingle: async () => {
        assert.equal(filters.published, true);
        assert.equal(filters.id, table === "training_routines" ? "routine" : "program");
        return { data: structuredClone(row), error: null };
      },
    };
    return builder;
  });
}

test("public routines reject exercises unpublished, archived or privately owned after routine publication", async (t) => {
  for (const exercise of [
    null,
    { status: "draft", owner_user_id: null },
    { status: "archived", owner_user_id: null },
    { status: "published", owner_user_id: "private-owner" },
  ]) {
    const row: any = routine();
    row.training_routine_exercises[0].exercises = exercise;
    fixture(t, row, "training_routines");
    await assert.rejects(getRoutine("routine"), (error: any) => error.status === 404);
    t.mock.restoreAll();
  }
});

test("published program details do not expose a routine that was later changed to draft", async (t) => {
  const unpublished = { ...routine(), name: "Private upcoming draft", published: false };
  for (const child of [unpublished, null]) {
    fixture(
      t,
      {
        id: "program",
        published: true,
        training_program_days: [{ routine_id: "routine", training_routines: child }],
      },
      "training_programs",
    );
    await assert.rejects(
      getProgram("program"),
      (error: any) => error.status === 404 && !error.message.includes("Private"),
    );
    t.mock.restoreAll();
  }
});

test("catalog routines cannot expose prescriptions that fail when copied into a workout", async (t) => {
  for (const invalid of [{ rest_seconds: 901 }, { max_reps: 1001 }]) {
    const row = routine();
    Object.assign(row.training_routine_exercises[0], invalid);
    fixture(t, row, "training_routines");
    await assert.rejects(getRoutine("routine"), (error: any) => error.status === 404);
    t.mock.restoreAll();
  }
  const timed = routine();
  Object.assign(timed.training_routine_exercises[0], { rest_seconds: 900, max_reps: 3600 });
  timed.training_routine_exercises[0].exercises.tracking_type = "duration";
  fixture(t, timed, "training_routines");
  assert.equal((await getRoutine("routine")).training_routine_exercises[0].max_reps, 3600);
});

test("available public routines and program rest days keep their existing response shape", async (t) => {
  fixture(t, routine(), "training_routines");
  const row = await getRoutine("routine");
  assert.deepEqual(row.training_routine_exercises[0].exercises, {
    id: "exercise",
    name: "Press",
    tracking_type: "reps_weight",
  });
  t.mock.restoreAll();
  fixture(
    t,
    {
      id: "program",
      published: true,
      training_program_days: [
        { routine_id: "routine", training_routines: routine() },
        { routine_id: null, training_routines: null },
      ],
    },
    "training_programs",
  );
  const program = await getProgram("program");
  assert.equal(program.training_program_days[0].training_routines.name, "Published training");
  assert.equal(program.training_program_days[1].training_routines, null);
  assert.deepEqual(
    program.training_program_days[0].training_routines.training_routine_exercises[0].exercises,
    { id: "exercise", name: "Press", tracking_type: "reps_weight" },
  );
});
