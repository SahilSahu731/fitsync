import type { SQLiteDatabase } from "expo-sqlite";

import type { WorkoutTemplate } from "@/features/workouts/types";

interface TemplateCacheRow {
  payload_json: string;
}

export async function cacheWorkoutTemplate(
  database: SQLiteDatabase,

  userId: string,

  template: WorkoutTemplate,
): Promise<void> {
  const now = new Date().toISOString();

  await database.runAsync(
    `
    INSERT INTO cached_templates (
      user_id,
      template_id,
      payload_json,
      cached_at
    )
    VALUES (?, ?, ?, ?)

    ON CONFLICT (
      user_id,
      template_id
    )
    DO UPDATE SET
      payload_json =
        excluded.payload_json,

      cached_at =
        excluded.cached_at
    `,
    userId,
    template.id,
    JSON.stringify(template),
    now,
  );
}

export async function cacheWorkoutTemplates(
  database: SQLiteDatabase,

  userId: string,

  templates: WorkoutTemplate[],
): Promise<void> {
  await database.withTransactionAsync(async () => {
    for (const template of templates) {
      await cacheWorkoutTemplate(database, userId, template);
    }
  });
}

export async function getCachedWorkoutTemplates(
  database: SQLiteDatabase,

  userId: string,
): Promise<WorkoutTemplate[]> {
  const rows = await database.getAllAsync<TemplateCacheRow>(
    `
        SELECT payload_json
        FROM cached_templates
        WHERE user_id = ?
        ORDER BY cached_at DESC
        `,
    userId,
  );

  const templates: WorkoutTemplate[] = [];

  for (const row of rows) {
    try {
      templates.push(JSON.parse(row.payload_json) as WorkoutTemplate);
    } catch {
      // Ignore malformed cache row.
    }
  }

  return templates;
}

export async function getCachedWorkoutTemplate(
  database: SQLiteDatabase,

  userId: string,

  templateId: string,
): Promise<WorkoutTemplate | null> {
  const row = await database.getFirstAsync<TemplateCacheRow>(
    `
        SELECT payload_json
        FROM cached_templates
        WHERE user_id = ?
          AND template_id = ?
        LIMIT 1
        `,
    userId,
    templateId,
  );

  if (!row) {
    return null;
  }

  try {
    return JSON.parse(row.payload_json) as WorkoutTemplate;
  } catch {
    return null;
  }
}

export async function removeCachedWorkoutTemplate(
  database: SQLiteDatabase,

  userId: string,

  templateId: string,
): Promise<void> {
  await database.runAsync(
    `
    DELETE FROM cached_templates
    WHERE user_id = ?
      AND template_id = ?
    `,
    userId,
    templateId,
  );
}
