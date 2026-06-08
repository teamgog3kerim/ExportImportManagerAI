---
name: Testing setup
description: How automated tests run in this repo (no test framework installed) and a gotcha that hangs the process.
---

# Running tests

There is no test framework (no vitest/jest) and `package.json` is off-limits. Use Node's
built-in runner via tsx:

`npx tsx --test --test-force-exit server/__tests__/*.test.ts`

Registered as the `test` validation command (validation skill).

**`--test-force-exit` is required.** Without it the process never exits after tests
finish.
**Why:** the neon-serverless `pool` keeps a websocket alive and `registerRoutes()`
kicks off a background exchange-rate scrape; both keep the event loop busy even after
`pool.end()` and `server.close()`. `--test-force-exit` (Node ≥20.12) forces a clean
exit once tests complete.
**How to apply:** any test that imports `server/db` or calls `registerRoutes` needs the
flag, or the run will appear to hang / time out.

# E2E auth/RBAC test

`server/__tests__/authFlow.test.ts` boots the real app (express + `registerRoutes`) on an
ephemeral port and drives it over HTTP with a tiny per-agent cookie jar. User rows hit the
real Postgres `db`, so it creates a uniquely-named employee and deletes it in teardown;
business data (inventory/LCs) is in-memory `MemStorage`, isolated to the test process.
Bootstrap admin creds are exported from `server/auth.ts` so the test doesn't duplicate them.
