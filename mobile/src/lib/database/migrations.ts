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

async function hasColumn(
  database: SQLiteDatabase,
  table: string,
  column: string,
): Promise<boolean> {
  const rows = await database.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`,
  );

  return rows.some((row) => row.name === column);
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

    return;
  }

  if (currentVersion < 2) {
    await database.withTransactionAsync(async () => {
      const exists = await hasColumn(
        database,
        "local_workouts",
        "payload_version",
      );

      if (!exists) {
        await database.execAsync(`
          ALTER TABLE local_workouts
          ADD COLUMN payload_version
          INTEGER NOT NULL
          DEFAULT 1;
        `);
      }

      await database.execAsync(`
        UPDATE local_workouts
        SET payload_version = 1
        WHERE payload_version IS NULL;
      `);

      await database.execAsync("PRAGMA user_version = 2;");
    });
  }
}
