import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isolatedDatabase } from "./sql/isolated-database.mjs";

const db = await isolatedDatabase();
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE public.auth_sessions(id uuid PRIMARY KEY, user_id uuid NOT NULL, refresh_hash text NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz, updated_at timestamptz DEFAULT now());`);
  await db.exec(
    await readFile(new URL("../sql/021_operational_safety.sql", import.meta.url), "utf8"),
  );
  const rate = async () =>
    (await db.query("SELECT * FROM public.consume_rate_limit($1, 60000)", ["a".repeat(64)]))
      .rows[0];
  assert.equal((await rate()).total_hits, 1);
  assert.equal((await rate()).total_hits, 2);
  await db.exec("UPDATE public.api_rate_limits SET reset_at = now() - interval '1 second'");
  assert.equal((await rate()).total_hits, 1);
  const id = "123e4567-e89b-42d3-a456-426614174000";
  const user = "123e4567-e89b-42d3-a456-426614174001";
  const hashes = ["1", "2", "3", "4"].map((s) => s.repeat(64));
  await db.query(
    "INSERT INTO public.auth_sessions(id,user_id,refresh_hash,expires_at) VALUES ($1,$2,$3,now()+interval '1 day')",
    [id, user, hashes[0]],
  );
  const rotate = async (old, next) =>
    (await db.query("SELECT * FROM public.rotate_auth_session_refresh($1,$2,$3)", [id, old, next]))
      .rows[0];
  assert.equal(
    (await rotate(hashes[3], hashes[1])).outcome,
    "invalid",
    "guessed token must not revoke",
  );
  assert.equal(
    (await db.query("SELECT revoked_at FROM public.auth_sessions")).rows[0].revoked_at,
    null,
  );
  assert.equal((await rotate(hashes[0], hashes[1])).outcome, "rotated");
  assert.equal((await rotate(hashes[1], hashes[2])).user_id, user);
  assert.equal((await rotate(hashes[0], hashes[3])).outcome, "replayed");
  assert.ok((await db.query("SELECT revoked_at FROM public.auth_sessions")).rows[0].revoked_at);
  assert.equal(
    (await rotate(hashes[2], hashes[3])).outcome,
    "invalid",
    "current token rejected after family revocation",
  );

  await db.query("UPDATE public.auth_sessions SET revoked_at=null, refresh_hash=$1", [hashes[3]]);
  const concurrent = await Promise.all([
    rotate(hashes[3], hashes[0]),
    rotate(hashes[3], hashes[1]),
  ]);
  assert.deepEqual(concurrent.map((r) => r.outcome).sort(), ["replayed", "rotated"]);
  await db.query(
    "UPDATE public.auth_sessions SET revoked_at=null, expires_at=now()-interval '1 second'",
  );
  assert.equal((await rotate(hashes[0], hashes[1])).outcome, "invalid");
  const permissions = (
    await db.query(`SELECT
    has_function_privilege('anon', 'public.consume_rate_limit(text,integer)', 'EXECUTE') AS anon_rate,
    has_function_privilege('authenticated', 'public.rotate_auth_session_refresh(uuid,text,text)', 'EXECUTE') AS user_rotate,
    has_table_privilege('authenticated', 'public.auth_session_refresh_history', 'SELECT') AS user_history`)
  ).rows[0];
  assert.deepEqual(permissions, { anon_rate: false, user_rotate: false, user_history: false });
  await db.exec("DELETE FROM public.auth_sessions");
  assert.equal(
    (await db.query("SELECT count(*)::int AS n FROM public.auth_session_refresh_history")).rows[0]
      .n,
    0,
  );
  console.log(
    "PASS: atomic shared limits, expiry, replay revocation, concurrent reuse, permissions and cascade cleanup (in-memory PostgreSQL)",
  );
} finally {
  await db.close();
}
