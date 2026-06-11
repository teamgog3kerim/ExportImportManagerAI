---
name: User onboarding — admin-toggleable self sign-up
description: How new EXIMMAN users get accounts and how the admin sign-up toggle works
---

Public self sign-up is ADMIN-TOGGLEABLE, persisted in Postgres (`app_settings`
key/value, key `signup_enabled`, default `'false'`; see migration 0002).
Helpers `isSignupEnabled()/setSignupEnabled()` in server/auth.ts use raw `pool`
queries with an ON CONFLICT upsert.

- Public read: `GET /api/auth/signup-status` -> `{ enabled }` (lives under
  /api/auth so the unauthenticated sign-in/sign-up pages can adapt).
- Admin write: `PATCH /api/settings/signup` `{ enabled }` — admin-only via the
  apiAccessGuard settings-write rule AND `requireAdmin`.
- When DISABLED: `POST /api/auth/signup` -> 403; `/signup` page shows the
  "Request a demo" mailto screen (name, position, company, phone); SignIn link
  reads "Request a demo".
- When ENABLED: signup creates a `status:"pending"` staff user awaiting admin
  approval; `/signup` shows the create-account form; SignIn link reads
  "Create one".

Admins can ALSO onboard directly via `POST /api/users` (admin-only) which
creates `status:"active"` accounts immediately with `defaultPermsForRole(role)`.
UI: "Public sign-up" toggle card + "Add employee" dialog in
UserManagementPanel.

**Why:** owner wants to control whether the commercial app accepts public
registrations vs demo-request-only, and capture demo leads otherwise.
**How to apply:** the toggle is the source of truth — do not hardcode signup
on/off. Tests share the dev DB's `signup_enabled` row, so any test touching it
must capture+restore the original value (see authFlow.test.ts).

DB schema changes here use the SQL migration system (migrations/*.sql, run on
startup by server/migrate.ts) because db:push is broken — NOT drizzle-kit push.

Pre-existing security note (NOT yet addressed, flag before changing): bootstrap
admin email+password are hardcoded constants in server/auth.ts and the account
is auto-provisioned on startup; SESSION_SECRET has a weak dev fallback. Changing
the bootstrap admin can lock the owner out of the live app — confirm with the
user first.
