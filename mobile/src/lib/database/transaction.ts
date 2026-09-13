import type { SQLiteDatabase } from "expo-sqlite";

const transactionQueues = new WeakMap<SQLiteDatabase, Promise<void>>();

/**
 * Expo SQLite uses one native connection for withTransactionAsync. Starting a
 * second transaction before the first settles causes BEGIN/ROLLBACK failures.
 * Queue every application transaction per database connection.
 */
export async function runSerializedTransaction(
  database: SQLiteDatabase,
  task: () => Promise<void>,
): Promise<void> {
  const previous = transactionQueues.get(database) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      await database.withTransactionAsync(task);
    });

  transactionQueues.set(database, current);

  try {
    await current;
  } finally {
    if (transactionQueues.get(database) === current) {
      transactionQueues.delete(database);
    }
  }
}
