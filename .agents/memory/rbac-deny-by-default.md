---
name: RBAC permission semantics
description: How per-page view/record authorization decides what to allow
---

Authorization is per-page with two levels: `view` (read) and `record` (read+write).
A central server guard maps each `/api` request to a page and checks the user's
level; admins bypass everything.

**Rule 1 — deny by default:** an `/api` path that isn't explicitly mapped to a page
(and isn't an auth/settings/users route handled separately) is forbidden for
non-admins. New endpoints must be mapped or they're blocked.
**Why:** an "allow if unmapped" default silently let non-admins hit new endpoints
regardless of permissions — a real authorization bypass.

**Rule 2 — write vs read is about persistence, not HTTP verb:** a non-GET request
that only computes/generates a response without persisting (e.g. AI chat, report
generation) is a *read* and is allowed at `view` level. Only requests that create,
update, or delete stored data require `record`.
**Why:** treating every POST as a write made read-only features (generate-a-report,
chat) 403 for view users and forced the UI to hide genuinely-readable actions.

**How to apply:** keep client `canView`/`canRecord` gating in lockstep with the
server — same page keys, and read-style POST controls (generate/chat) shown to view
users while persist actions (save/delete) stay behind `canRecord`.
