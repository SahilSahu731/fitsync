import type { SQLiteDatabase } from "expo-sqlite";

import { CREATE_V1_SCHEMA, DATABASE_VERSION } from "./schema";

interface UserVersionRow {
  user_version: number;
}

async function getDatabaseVersion(database: SQLiteDatabase): Promise<number> {
  const row = await database.getFirstAsync<UserVersionRow>(
    "PRAGMA user_version",
  );

  return row?.user_version ?? 0;
}

export async function migrateDatabase(database: SQLiteDatabase): Promise<void> {
  /*
   * Foreign keys are disabled by default
   * in SQLite connections.
   */
  await database.execAsync("PRAGMA foreign_keys = ON;");

  /*
   * WAL is a much better mode for an app
   * where reads and writes can overlap.
   */
  await database.execAsync("PRAGMA journal_mode = WAL;");

  const currentVersion = await getDatabaseVersion(database);

  if (currentVersion > DATABASE_VERSION) {
    throw new Error("FitSync database is newer " + "than this app version.");
  }

  if (currentVersion === 0) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(CREATE_V1_SCHEMA);

      await database.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
    });
  }

  /*
   * Future migrations:
   *
   * if (currentVersion < 2) {
   *   ...
   *   PRAGMA user_version = 2
   * }
   */
}
