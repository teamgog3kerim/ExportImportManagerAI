---
name: User onboarding — self-signup disabled
description: How new EXIMMAN users get accounts now that public self-signup is off
---

Public self sign-up is intentionally DISABLED. `POST /api/auth/signup` returns
403; the `/signup` page is a "Request a demo" lead-capture screen (mailto to
the company address asking for name, position, company, phone).

New users are onboarded ONLY by an admin via `POST /api/users` (admin-only,
gated by both apiAccessGuard `/api/users` block and `requireAdmin`). Admin-
created accounts are `status:"active"` immediately (no pending/approval step),
with `defaultPermsForRole(role)`. UI: "Add employee" dialog in
UserManagementPanel.

**Why:** owner wants to control access for a commercial app and capture demo
leads instead of letting anyone self-register.
**How to apply:** do not re-enable the public signup endpoint without explicit
request. The pending-approval path still exists for any legacy pending rows but
is no longer fed by new signups.

Pre-existing security note (NOT yet addressed, flag before changing): bootstrap
admin email+password are hardcoded constants in server/auth.ts and the account
is auto-provisioned on startup; SESSION_SECRET has a weak dev fallback. Changing
the bootstrap admin can lock the owner out of the live app — confirm with the
user first.
