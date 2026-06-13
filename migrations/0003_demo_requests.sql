-- 0003_demo_requests.sql
-- Stores demo requests submitted by prospective clients from the public
-- sign-up page when self sign-up is disabled. Persisted in Postgres so an
-- admin can review the leads and follow up. Every statement is idempotent so
-- it is safe to run on every startup.

CREATE TABLE IF NOT EXISTS "demo_requests" (
  "id" varchar PRIMARY KEY NOT NULL,
  "full_name" text NOT NULL,
  "company_name" text NOT NULL,
  "company_category" text NOT NULL,
  "category_other" text,
  "position" text NOT NULL,
  "phone" text NOT NULL,
  "email" text NOT NULL,
  "status" text NOT NULL DEFAULT 'new',
  "created_at" text NOT NULL
);
