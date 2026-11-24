export type ExerciseBaseline = {
  id: string;
  updated_at: string;
  owner_user_id?: string | null;
};

// Older checkpoints predate owner_user_id. The final database predicate still
// requires a NULL owner, so an old snapshot can never authorize a private row.
export function publicExercises<T extends { owner_user_id?: string | null }>(
  rows: readonly T[],
): T[] {
  return rows.filter((row) => row.owner_user_id == null);
}

export async function resetPublicExerciseBaseline(
  baseline: readonly ExerciseBaseline[],
  readCurrent: () => Promise<readonly ExerciseBaseline[]>,
  removeBatch: (rows: readonly ExerciseBaseline[]) => Promise<readonly string[]>,
) {
  const current = new Map((await readCurrent()).map((row) => [row.id, row]));
  const pending = publicExercises(baseline).filter((original) => {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(original.id) ||
      !/^\d{4}-\d\d-\d\dT[\d:.]+(?:Z|[+-]\d\d:\d\d)$/.test(original.updated_at) ||
      !Number.isFinite(Date.parse(original.updated_at))
    )
      throw new Error("Invalid exercise reset checkpoint. Existing exercises were retained.");
    const latest = current.get(original.id);
    if (!latest) return false; // A previous partial reset already removed it.
    if (latest.owner_user_id != null || latest.updated_at !== original.updated_at)
      throw new Error(
        "An existing exercise changed since the backup. Reset stopped before deletion.",
      );
    return true;
  });
  let removed = 0;
  for (let index = 0; index < pending.length; index += 25) {
    const batch = pending.slice(index, index + 25);
    const deleted = new Set(await removeBatch(batch));
    if (deleted.size !== batch.length || batch.some((row) => !deleted.has(row.id)))
      throw new Error(
        "An exercise changed during cleanup. Reset stopped to preserve edits; resume from the backup after review.",
      );
    removed += deleted.size;
  }
  return removed;
}
