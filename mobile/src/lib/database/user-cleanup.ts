import type {
  SQLiteDatabase,
} from "expo-sqlite";


export async function deleteLocalUserData(
  database:
    SQLiteDatabase,

  userId:
    string,
): Promise<void> {
  await database
    .withTransactionAsync(
      async () => {
        await database
          .runAsync(
            `
            DELETE FROM workout_runtime
            WHERE workout_local_id IN (
              SELECT local_id
              FROM local_workouts
              WHERE user_id = ?
            )
            `,
            userId,
          );


        await database
          .runAsync(
            `
            DELETE FROM local_workouts
            WHERE user_id = ?
            `,
            userId,
          );


        /*
         * Exercise/template caches may contain
         * private user-created data.
         *
         * Clear them during permanent account deletion.
         */
        await database
          .runAsync(
            `
            DELETE FROM cached_exercises
            `
          );


        await database
          .runAsync(
            `
            DELETE FROM cached_templates
            `
          );
      },
    );
}