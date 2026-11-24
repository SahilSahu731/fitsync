// SQL tests never accept a connection URL, including from a developer's shell.
export const CONNECTION_VARIABLES = [
  "DATABASE_URL",
  "DIRECT_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPABASE_URL",
  "SUPABASE_DB_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PGHOST",
  "PGHOSTADDR",
  "PGPORT",
  "PGDATABASE",
  "PGUSER",
  "PGPASSWORD",
  "PGSERVICE",
  "PGSERVICEFILE",
  "PGPASSFILE",
];
export async function isolatedDatabase(environment = process.env) {
  if (
    environment.NODE_ENV === "production" ||
    CONNECTION_VARIABLES.some((key) => environment[key])
  ) {
    throw new Error(
      "SQL tests require an isolated environment with no database connection variables.",
    );
  }
  const { PGlite } = await import(environment.FITSYNC_PGLITE_MODULE ?? "@electric-sql/pglite");
  return new PGlite(); // No URL or dataDir: a new in-memory database on every run.
}
