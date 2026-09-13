import type { SQLiteDatabase } from "expo-sqlite";

import {
  CREATE_PHASE_5_SCHEMA,
  CREATE_V1_SCHEMA,
  DATABASE_VERSION,
} from "./schema";
import { runSerializedTransaction } from "./transaction";

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
    await runSerializedTransaction(database, async () => {
      await database.execAsync(CREATE_V1_SCHEMA);

      await database.execAsync(CREATE_PHASE_5_SCHEMA);

      await database.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
    });

    return;
  }

  if (currentVersion < 2) {
    await runSerializedTransaction(database, async () => {
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

  if (currentVersion < 3) {
    await runSerializedTransaction(database, async () => {
      await database.execAsync(CREATE_PHASE_5_SCHEMA);

      await database.execAsync(`
        INSERT OR IGNORE INTO local_templates (
          local_id, user_id, client_template_id, server_id, server_revision,
          payload_json, payload_version, archived, sync_status, dirty,
          local_version, last_synced_payload_json, last_sync_error, retry_count,
          next_retry_at, created_at, updated_at, last_synced_at
        )
        SELECT
          template_id, user_id, template_id, template_id, 1,
          payload_json, 1, 0, 'SYNCED', 0,
          1, payload_json, NULL, 0,
          NULL, cached_at, cached_at, cached_at
        FROM cached_templates;
      `);

      await database.execAsync("PRAGMA user_version = 3;");
    });
  }
}
