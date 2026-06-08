---
name: Drizzle push broken in this repo
description: Why db:push fails here and how to apply schema changes instead
---

`drizzle-kit push` fails with a `_relations` export error: drizzle-kit `1.0.0-rc.2` is
incompatible with drizzle-orm `0.45.2`.

**Why:** version mismatch between the rc drizzle-kit and the stable drizzle-orm; the
kit expects an export the orm version doesn't provide.

**How to apply:** Do NOT run `db:push`. Schema changes are versioned as idempotent
raw-SQL files in `migrations/` (numbered, e.g. `0001_users_and_session.sql`) that
run automatically on boot via `server/migrate.ts` (`runMigrations()` tracks applied
files in a `_migrations` table; `verifyAuthSchema()` fails loudly if users/session
tables/columns are missing). Both run at the top of `registerRoutes()` in
`server/routes.ts`. To change schema: edit `shared/schema.ts`, add a new numbered
idempotent `.sql` file, and (if login-critical) extend `REQUIRED_SCHEMA` in
`server/migrate.ts`. See `migrations/README.md`. Still keep `shared/schema.ts` in
sync by hand so Drizzle types stay correct.
