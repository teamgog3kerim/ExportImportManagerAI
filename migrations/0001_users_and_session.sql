-- 0001_users_and_session.sql
-- Codifies the user-accounts and session storage that login depends on.
-- These tables were originally created by hand-written SQL because `db:push`
-- is broken in this project (drizzle-kit 1.0.0-rc.2 vs drizzle-orm 0.45.2).
-- Keep this file in sync with the `users` table in `shared/schema.ts` and with
-- the table connect-pg-simple expects (tableName: "session").
-- Every statement is idempotent so it is safe to run on every startup.

-- Users (see `users` in shared/schema.ts)
CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "full_name" text NOT NULL,
  "role" text NOT NULL DEFAULT 'staff',
  "status" text NOT NULL DEFAULT 'pending',
  "permissions" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" text NOT NULL
);

-- Unique email (matches `.unique()` on users.email)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email");
  END IF;
END $$;

-- Session store for express-session / connect-pg-simple (tableName: "session").
-- Mirrors connect-pg-simple's built-in table definition so behaviour matches
-- its `createTableIfMissing` fallback.
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
  ) THEN
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
