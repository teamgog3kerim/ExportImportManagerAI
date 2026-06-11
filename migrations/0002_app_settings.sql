-- 0002_app_settings.sql
-- Key/value store for small, persistent application-wide settings that admins
-- control at runtime (e.g. whether public self sign-up is enabled).
-- Persisted in Postgres (not in-memory) so the choice survives restarts and
-- redeploys, and matches between this and the production database.
-- Every statement is idempotent so it is safe to run on every startup.

CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL
);

-- Seed the sign-up toggle. Defaults to disabled (visitors request a demo).
-- ON CONFLICT DO NOTHING preserves whatever an admin later chose.
INSERT INTO "app_settings" ("key", "value")
VALUES ('signup_enabled', 'false')
ON CONFLICT ("key") DO NOTHING;
