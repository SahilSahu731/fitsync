import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderBundle, sources, stripMigration } from "../scripts/generate-pro-migrations.mjs";

test("preserves transaction-like lines inside function bodies and SQL literals", () => {
  const body = `-- The function body must remain byte-for-byte intact.
CREATE FUNCTION example() RETURNS void LANGUAGE plpgsql AS $body$
BEGIN;
  PERFORM 'it''s; COMMIT;';
COMMIT;
END;
$body$;
/* nested /* BEGIN; */ COMMIT; */
SELECT 'NOTIFY pgrst, ''reload schema'';';`;
  assert.equal(
    stripMigration(`BEGIN;\n${body}\nCOMMIT;\nNOTIFY pgrst, 'reload schema';\n`, "fixture.sql"),
    body,
  );
});

test("refuses malformed wrappers or extra top-level transaction statements", () => {
  for (const sql of [
    "SELECT 1;\nCOMMIT;\n",
    "BEGIN;\nSELECT 1;\n",
    "BEGIN;\nBEGIN;\nSELECT 1;\nCOMMIT;\n",
    "BEGIN;\nSELECT 1;\nCOMMIT;\nSELECT 2;\n",
    " BEGIN;\nSELECT 1;\nCOMMIT;\n",
    "BEGIN; SELECT 1;\nCOMMIT;\n",
    "BEGIN;\nSELECT 1;\nCOMMIT; -- trailing wrapper comment\n",
  ])
    assert.throws(() => stripMigration(sql, "fixture.sql"), /fixture.sql/);
});

test("refuses incomplete literals and comments rather than emitting truncated SQL", () => {
  for (const sql of [
    "BEGIN;\nSELECT 'unfinished;",
    "BEGIN;\n/* unfinished",
    "BEGIN;\nDO $body$ unfinished",
  ])
    assert.throws(() => stripMigration(sql, "fixture.sql"), /Unterminated SQL/);
});

test("checked-in bundle matches every numbered source and its deterministic hashes", async () => {
  const migrations = await Promise.all(
    sources.map(async (name: string) => ({
      name,
      sql: await readFile(new URL(`../sql/${name}`, import.meta.url), "utf8"),
    })),
  );
  const generated = renderBundle(migrations);
  assert.equal(
    generated,
    await readFile(new URL("../sql/apply-pro-migrations.sql", import.meta.url), "utf8"),
  );
  let previous = -1;
  for (const { name, sql } of migrations) {
    const position = generated.indexOf(`-- Source: ${name}\n${stripMigration(sql, name)}`);
    assert.ok(position > previous, `${name} must retain its complete body in numbered order`);
    previous = position;
  }
});
