// Always runs against a fresh in-memory PostgreSQL instance; accepts no database URL.
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { PGlite } = await import(process.env.FITSYNC_PGLITE_MODULE ?? "@electric-sql/pglite");
const db = new PGlite();
const owner = "00000000-0000-4000-8000-000000000001",
  other = "00000000-0000-4000-8000-000000000002";
try {
  await db.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE TABLE app_users(id uuid PRIMARY KEY); CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
  );
  for (const name of ["012_progress_tracking.sql", "017_pro_companion.sql"])
    await db.exec(await readFile(new URL(`../sql/${name}`, import.meta.url), "utf8"));
  await db.query("INSERT INTO app_users(id) VALUES($1),($2)", [owner, other]);
  const save = (
    user,
    id,
    revision,
    data = { energy: 3 },
    remove = false,
    kind = "readiness",
    day = "2026-11-14",
  ) =>
    db.query("SELECT * FROM save_fitsync_companion_record($1,$2,$3,$4,$5::jsonb,$6,$7)", [
      user,
      id,
      kind,
      day,
      JSON.stringify(data),
      revision,
      remove,
    ]);
  assert.equal((await save(owner, "ready", 0)).rows[0].revision, 1);
  assert.equal(
    (await db.query("SELECT count(*)::int AS count FROM progress_events WHERE user_id=$1", [owner]))
      .rows[0].count,
    1,
  );
  await assert.rejects(save(owner, "another-id", 0), /already exists/);
  assert.equal((await save(other, "ready", 0)).rows[0].revision, 1);
  assert.equal((await save(owner, "ready", 1, { energy: 5 })).rows[0].revision, 2);
  assert.equal(
    (
      await db.query(
        "SELECT payload->>'value' AS value FROM progress_events WHERE user_id=$1 ORDER BY observed_at DESC LIMIT 1",
        [owner],
      )
    ).rows[0].value,
    "5",
  );
  await assert.rejects(save(owner, "ready", 1, { energy: 1 }), /changed on another device/);
  assert.equal(
    (await db.query("SELECT count(*)::int AS count FROM progress_events WHERE user_id=$1", [owner]))
      .rows[0].count,
    2,
  );
  await assert.rejects(save(other, "foreign", 2), /changed on another device/);
  assert.equal((await save(owner, "ready", 2, {}, true)).rows[0].deleted, true);
  assert.equal(
    (await db.query("SELECT count(*)::int AS count FROM progress_events WHERE user_id=$1", [owner]))
      .rows[0].count,
    2,
    "Deleting readiness preserves canonical health history",
  );
  await assert.rejects(save(owner, "ready", 0), /already exists/);
  await assert.rejects(save(owner, "ready", 3), /changed on another device/);
  assert.equal((await save(owner, "new-ready", 0)).rows[0].revision, 1);
  await assert.rejects(
    save(owner, "invalid", 0, { sleepHours: 99 }, false, "readiness", "2026-11-15"),
    /Invalid readiness health reading/,
  );
  assert.equal(
    (await db.query("SELECT count(*)::int AS count FROM companion_records WHERE id='invalid'"))
      .rows[0].count,
    0,
    "Invalid readings roll back the check-in too",
  );
  await save(owner, "sleep", 0, { sleepHours: 7.5, energy: 4 }, false, "readiness", "2026-11-15");
  const readings = await db.query(
    "SELECT payload->>'metric' AS metric,payload->>'value' AS value FROM progress_events WHERE user_id=$1 AND payload->>'date'='2026-11-15' ORDER BY payload->>'metric'",
    [owner],
  );
  assert.deepEqual(readings.rows, [
    { metric: "energy", value: "4" },
    { metric: "sleep", value: "7.5" },
  ]);
  await save(owner, "sleep", 1, { availableMinutes: 30 }, false, "readiness", "2026-11-15");
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS count FROM progress_events WHERE user_id=$1 AND payload->>'date'='2026-11-15'",
        [owner],
      )
    ).rows[0].count,
    2,
    "Omitted readings do not clear or duplicate health values",
  );
  await save(owner, "reminders", 0, { enabled: true }, false, "reminders", null);
  await assert.rejects(
    save(owner, "second-reminders", 0, {}, false, "reminders", null),
    /already exists/,
  );
  assert.equal(
    (await db.query("SELECT public FROM storage.buckets WHERE id='progress-photos'")).rows[0]
      .public,
    false,
  );
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    await assert.rejects(db.query("SELECT * FROM companion_records"), /permission denied/);
    await assert.rejects(db.query("SELECT * FROM companion_photos"), /permission denied/);
    await assert.rejects(db.query("SELECT * FROM companion_shares"), /permission denied/);
    await assert.rejects(save(owner, "unauthorized", 0), /permission denied/);
    await db.exec("RESET ROLE");
  }
  await db.query(
    "INSERT INTO companion_photos(user_id,date,view,storage_path,width,height) VALUES($1,'2026-11-14','front',$2,100,100)",
    [owner, `${owner}/photo.webp`],
  );
  await db.query(
    "INSERT INTO companion_shares(user_id,label,token_hash,fields,expires_at) VALUES($1,'Coach',$2,ARRAY['plan'],now()+interval '1 day')",
    [owner, "a".repeat(64)],
  );
  await db.query("DELETE FROM app_users WHERE id=$1", [owner]);
  for (const table of ["companion_records", "companion_photos", "companion_shares"])
    assert.equal(
      (await db.query(`SELECT count(*)::int AS count FROM ${table} WHERE user_id=$1`, [owner]))
        .rows[0].count,
      0,
    );
  assert.equal(
    (
      await db.query("SELECT count(*)::int AS count FROM companion_records WHERE user_id=$1", [
        other,
      ])
    ).rows[0].count,
    1,
  );
  console.log(
    "Companion migration passed: CAS conflicts, singleton/date uniqueness, tombstones, private access, account cascades.",
  );
} finally {
  await db.close();
}
