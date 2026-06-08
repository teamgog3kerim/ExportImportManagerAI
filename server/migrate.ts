import { readdirSync, readFileSync } from "fs";
import path from "path";
import { pool } from "./db";

const MIGRATIONS_DIR = path.join(process.cwd(), "migrations");

// Tables/columns that login depends on. The startup check fails loudly if any
// of these are missing after migrations have run.
const REQUIRED_SCHEMA: Record<string, string[]> = {
  users: [
    "id",
    "email",
    "password_hash",
    "full_name",
    "role",
    "status",
    "permissions",
    "created_at",
  ],
  session: ["sid", "sess", "expire"],
};

function listMigrationFiles(): string[] {
  try {
    return readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    return [];
  }
}

// Applies any checked-in SQL migrations that have not yet run. Each migration is
// tracked by filename in a `_migrations` table so it runs exactly once, and each
// runs inside its own transaction. Migrations are written to be idempotent, so a
// database that already has the tables (e.g. created earlier by hand-written SQL)
// is harmless to re-run.
export async function runMigrations(): Promise<void> {
  const files = listMigrationFiles();
  if (files.length === 0) {
    console.warn(
      `[migrate] No migration files found in ${MIGRATIONS_DIR}. Skipping migrations.`,
    );
    return;
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS "_migrations" (
      "name" text PRIMARY KEY,
      "applied_at" timestamptz NOT NULL DEFAULT now()
    )`,
  );

  const { rows } = await pool.query<{ name: string }>(
    `SELECT name FROM "_migrations"`,
  );
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(`INSERT INTO "_migrations" (name) VALUES ($1)`, [file]);
      await client.query("COMMIT");
      console.log(`[migrate] Applied migration: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[migrate] FAILED migration: ${file}`, err);
      throw err;
    } finally {
      client.release();
    }
  }
}

// Verifies the tables/columns that authentication depends on actually exist.
// Logs a clear, actionable error and throws if the schema is incomplete so the
// app does not silently boot into a broken-login state.
export async function verifyAuthSchema(): Promise<void> {
  const tableNames = Object.keys(REQUIRED_SCHEMA);
  const { rows } = await pool.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [tableNames],
  );

  const found: Record<string, Set<string>> = {};
  for (const row of rows) {
    (found[row.table_name] ??= new Set()).add(row.column_name);
  }

  const problems: string[] = [];
  for (const [table, columns] of Object.entries(REQUIRED_SCHEMA)) {
    const present = found[table];
    if (!present) {
      problems.push(`missing table "${table}"`);
      continue;
    }
    const missingCols = columns.filter((c) => !present.has(c));
    if (missingCols.length > 0) {
      problems.push(`table "${table}" missing column(s): ${missingCols.join(", ")}`);
    }
  }

  if (problems.length > 0) {
    const message =
      `[migrate] Auth schema verification FAILED: ${problems.join("; ")}. ` +
      `Login will not work. Ensure the SQL migrations in ./migrations have been ` +
      `applied (they run automatically on startup) and that DATABASE_URL points ` +
      `at the correct database.`;
    console.error(message);
    throw new Error(message);
  }

  console.log("[migrate] Auth schema verified (users, session).");
}
