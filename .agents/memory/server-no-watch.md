---
name: Backend has no watch/reload
description: Backend TS edits require a manual workflow restart
---

The `Start application` workflow runs `tsx server/index.ts` with no watch mode. Vite
HMR only reloads the client.

**How to apply:** after editing any server-side `.ts` (server/*, shared/* used by the
server), call `restart_workflow` for `Start application` before testing, or the old
code keeps running.
