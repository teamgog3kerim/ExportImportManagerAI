---
name: RBAC deny-by-default guard
description: How per-page API authorization works and the trap with new endpoints
---

The server `apiAccessGuard` (server/auth.ts) authorizes every `/api/*` request for
non-admins by mapping the path to a page key via `API_PAGE_RULES`
(shared/permissions.ts), then checking the user's per-page level (none/view/record).
Writes (non-GET) require `record`.

**Rule:** unmapped `/api` paths are DENIED (403), not allowed through. Auth routes
(`/api/auth/*`), `/api/settings*` (read=any active user, write=admin), and
`/api/users*` (admin only) are handled explicitly before the page-rule check. Admins
bypass all of it.

**Why:** an earlier version did `if (!pageKey) return next()`, which silently let
any authenticated non-admin hit unmapped endpoints (e.g. `/api/reports`) regardless
of permissions — a real authorization bypass.

**How to apply:** when you add a new `/api` resource, add a matching entry to
`API_PAGE_RULES` (and a page in `PAGES` if it's a new section) or it will be blocked
for everyone except admins. Client `canView`/`canRecord` (client/src/lib/auth.ts)
must use the same page keys so UI gating matches server enforcement.
