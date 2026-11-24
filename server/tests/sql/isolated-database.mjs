// SQL tests never accept a connection URL, including from a developer's shell.
export async function isolatedDatabase(environment = process.env) {
  if (
    environment.NODE_ENV === "production" ||
    ["DATABASE_URL", "DIRECT_URL", "SUPABASE_URL", "PGHOST", "PGSERVICE"].some(
      (key) => environment[key],
    )
  ) {
    throw new Error(
      "SQL tests require an isolated environment with no database connection variables.",
    );
  }
  const { PGlite } = await import(environment.FITSYNC_PGLITE_MODULE ?? "@electric-sql/pglite");
  return new PGlite(); // No URL or dataDir: a new in-memory database on every run.
}
