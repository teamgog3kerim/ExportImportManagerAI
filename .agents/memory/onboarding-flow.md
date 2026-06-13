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
- When DISABLED: `POST /api/auth/signup` -> 403; `/signup` page shows a
  DB-backed "Request a demo" form (full name, company name, company category =
  export/import/export_import/other, position, phone, email) that POSTs to the
  PUBLIC endpoint `POST /api/auth/demo-request` (under /api/auth so no auth
  needed) and persists a `demo_requests` row (status default `'new'`). The
  bottom "Or write to ...@gmail.com" mailto link is kept. SignIn link reads
  "Request a demo". `categoryOther` is required ONLY when category === 'other'
  (refined `demoRequestSubmissionSchema`); server nulls it otherwise.
  Admins review/manage leads via admin-only `GET/PATCH/DELETE /api/demo-requests`
  (status new|contacted), surfaced in the Settings "Demo Requests" tab
  (DemoRequestsPanel).
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
