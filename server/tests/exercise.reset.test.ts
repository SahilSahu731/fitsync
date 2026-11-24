import test from "node:test";
import assert from "node:assert/strict";
import { publicExercises, resetPublicExerciseBaseline } from "../scripts/lib/exercise-reset.js";

const original = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  updated_at: "2026-11-24T10:00:00+00:00",
  owner_user_id: null,
};
const privateExercise = {
  ...original,
  id: "123e4567-e89b-42d3-a456-426614174001",
  owner_user_id: "private-owner",
};

test("resetting the shared exercise catalog preserves custom rows, including old mixed checkpoints", async () => {
  assert.deepEqual(publicExercises([original, privateExercise]), [original]);
  const batches: unknown[] = [];
  const removed = await resetPublicExerciseBaseline(
    [original, privateExercise],
    async () => [original, privateExercise],
    async (batch) => {
      batches.push(batch);
      return batch.map((row) => row.id);
    },
  );
  assert.equal(removed, 1);
  assert.deepEqual(batches, [[original]]);
});

test("a resumed reset validates saved timestamps before deleting any remaining baseline", async () => {
  let writes = 0;
  for (const edited of [
    { ...original, updated_at: "2026-11-24T10:01:00+00:00" },
    { ...original, owner_user_id: "private-owner" },
  ])
    await assert.rejects(
      resetPublicExerciseBaseline(
        [original],
        async () => [edited],
        async () => {
          writes++;
          return [];
        },
      ),
      /changed since the backup/,
    );
  assert.equal(writes, 0);
});

test("resume skips rows already deleted by a partial reset without touching new exercises", async () => {
  const remaining = { ...original, id: "123e4567-e89b-42d3-a456-426614174002" };
  const newlyAdded = { ...original, id: "123e4567-e89b-42d3-a456-426614174003" };
  const batches: unknown[] = [];
  const removed = await resetPublicExerciseBaseline(
    [original, remaining],
    async () => [remaining, newlyAdded, privateExercise],
    async (batch) => {
      batches.push(batch);
      return batch.map((row) => row.id);
    },
  );
  assert.equal(removed, 1);
  assert.deepEqual(batches, [[remaining]]);
});

test("a timestamp mismatch at the actual delete stops later batches and can be resumed safely", async () => {
  const baseline = Array.from({ length: 26 }, (_, index) => ({
    ...original,
    id: `123e4567-e89b-42d3-a456-${index.toString().padStart(12, "0")}`,
  }));
  const batches: unknown[] = [];
  await assert.rejects(
    resetPublicExerciseBaseline(
      baseline,
      async () => baseline,
      async (batch) => {
        batches.push(batch);
        return batch.slice(0, -1).map((row) => row.id);
      },
    ),
    /changed during cleanup/,
  );
  assert.equal(batches.length, 1);
  assert.equal((batches[0] as unknown[]).length, 25);
});

test("invalid checkpoint fields never become database filter expressions", async () => {
  let writes = 0;
  for (const invalid of [
    { ...original, id: "other),owner_user_id.not.is.null" },
    { ...original, updated_at: "2026-11-24T10:00:00Z),id.not.is.null" },
  ])
    await assert.rejects(
      resetPublicExerciseBaseline(
        [invalid],
        async () => [invalid],
        async () => {
          writes++;
          return [];
        },
      ),
      /Invalid exercise reset checkpoint/,
    );
  assert.equal(writes, 0);
});
