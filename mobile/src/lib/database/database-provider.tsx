import type { PropsWithChildren } from "react";

import { SQLiteProvider } from "expo-sqlite";

import { migrateDatabase } from "./migrations";

import { DATABASE_NAME } from "./schema";

export function DatabaseProvider({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
      {children}
    </SQLiteProvider>
  );
}
