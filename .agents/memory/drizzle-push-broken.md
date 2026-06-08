---
name: Drizzle push broken in this repo
description: Why db:push fails here and how to apply schema changes instead
---

`drizzle-kit push` fails with a `_relations` export error: drizzle-kit `1.0.0-rc.2` is
incompatible with drizzle-orm `0.45.2`.

**Why:** version mismatch between the rc drizzle-kit and the stable drizzle-orm; the
kit expects an export the orm version doesn't provide.

**How to apply:** Do NOT run `db:push`. Create/alter tables with raw SQL using the
`@neondatabase/serverless` Pool from the workspace dir (DATABASE_URL is set). Keep
`shared/schema.ts` in sync manually so types stay correct. This means real schema
drift risk — any users/session table change must be mirrored in SQL by hand.
