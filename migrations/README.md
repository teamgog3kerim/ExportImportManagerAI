# Database migrations

This project uses **checked-in raw SQL migrations** that run automatically on
startup, instead of `drizzle-kit push`.

## Why not `db:push`?

`drizzle-kit push` is broken here: `drizzle-kit` `1.0.0-rc.2` is incompatible
with `drizzle-orm` `0.45.2` (it fails with a `_relations` export error). Until
those versions are aligned, **do not run `npm run db:push`**.

## How it works

- Each migration is a numbered `.sql` file in this directory
  (e.g. `0001_users_and_session.sql`), applied in filename order.
- On boot, `server/migrate.ts`:
  1. `runMigrations()` — creates a `_migrations` tracking table and runs any
     `.sql` files not yet recorded there, each in its own transaction. Files are
     written to be idempotent, so re-running against an already-provisioned
     database (e.g. one created earlier by hand-written SQL) is safe.
  2. `verifyAuthSchema()` — checks the `users` and `session` tables and their
     required columns exist, and throws with a clear error if not, so the app
     never boots into a broken-login state.

## Adding a schema change

1. Update `shared/schema.ts` (keeps Drizzle types correct).
2. Add a new numbered SQL file here with idempotent statements
   (`CREATE TABLE IF NOT EXISTS`, guarded `ALTER TABLE`, etc.).
3. If the change affects login, add the new table/columns to `REQUIRED_SCHEMA`
   in `server/migrate.ts`.
4. Restart the app — the migration applies automatically.

> The `migrations/` folder must be present in production. Deploys run
> `npm run build` then `npm run start` from the repo root, where this folder
> lives, so the migration runner finds it via `process.cwd()`.
