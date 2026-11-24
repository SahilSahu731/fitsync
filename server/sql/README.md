# Database migrations

Numbered files `001`–`021` are the source migrations. For a new Supabase project,
apply them in numerical order as the database owner.

For an existing project, inspect its schema first and apply only missing changes.
Migrations `004`, `006`, and `008` contain creation statements that cannot be
replayed against an established schema. Content migration `011` preserves existing
entries using `ON CONFLICT (slug) DO NOTHING`.

## Combined Pro migration

From `server/`, run:

```sh
npm run db:generate
npm run db:generate -- --check
```

This generates [apply-pro-migrations.sql](apply-pro-migrations.sql) from the exact
sources `012`–`020`, with source hashes, prerequisite checks, and one transaction.
It requires the baseline schema from `001`–`009`; `010` and `011` remain separate
performance and content migrations. Generation does not connect to a database.

## Verification

Run [verify-migrations.sql](verify-migrations.sql) in the configured project's SQL
Editor as the database owner. It performs read-only checks of tables, feature
columns, indexes, functions, triggers, permissions, storage settings, and curated
content. A successful check returns no rows.

On 2026-11-18, the configured project was checked against all 20 numbered files.
The missing migrations `010`, `018`, `019`, and `020` were applied in one
transaction; `017` had already been applied. Schema comparisons and API probes
passed afterward. This is a deployment note, not a migration execution ledger.

## Operational safety migration

Apply `021_operational_safety.sql` **before** deploying the new API. It adds the
shared PostgreSQL rate-limit counters and atomic refresh-token rotation/replay
revocation RPC. Production fails closed if the shared limiter cannot be reached.
`021` is separate from the combined Pro bundle (`012`–`020`). Run
`verify-migrations.sql` afterward; it now checks `021` too. No Redis service is needed.

SQL integration scripts use PGlite in memory and reject `NODE_ENV=production`,
`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `PGHOST` and `PGSERVICE` in their environment.
Do not source your server `.env` before running them. See `docs/observability-setup.md`
for the complete release and verification steps.
