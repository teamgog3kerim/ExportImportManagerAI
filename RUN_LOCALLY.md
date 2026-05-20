# Running EXIMMAN locally

This document describes everything needed to clone and run the EXIMMAN application on your own computer.

## 1. System prerequisites

| Tool | Version | Why |
|---|---|---|
| **Node.js** | **20.x LTS** (matches `@types/node@20.16.11`) | Runs the Express server and Vite build. |
| **npm** | 10+ (ships with Node 20) | Package install. `package-lock.json` is present, so `npm ci` is preferred. |
| **Git** | any | To clone the repo. |
| **PostgreSQL** | 14+ (optional) | Only if you want to use `npm run db:push`. The app itself currently uses in-memory storage (`MemStorage`), so a database is **not required** to run it. |
| OS | macOS, Linux, or Windows (with **WSL2** or **Git Bash** strongly recommended) | The `dev` and `start` scripts use Unix-style `NODE_ENV=...` inline env vars, which fail on plain Windows CMD/PowerShell. |

The `main.py`, `pyproject.toml`, and `uv.lock` files in the project root are unused leftovers — **Python is not required**.

## 2. Environment variables

Create a `.env` file (or export them in your shell). None are strictly required for the app to boot, but these are referenced in code:

| Variable | Required? | Purpose |
|---|---|---|
| `PORT` | optional (defaults to `5000`) | Port the Express + Vite server listens on. |
| `NODE_ENV` | set by scripts | `development` for dev, `production` for built output. |
| `SESSION_SECRET` | recommended | Used by `express-session` for cookie signing. |
| `DATABASE_URL` | only for `npm run db:push` | Postgres connection string (Neon-compatible). Not needed to run the app. |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | only if you use AI Insights | OpenAI API key. Without it, AI features will fail but the rest of the app runs. |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | only if using a non-default OpenAI endpoint | Custom base URL. |

> Note: `dotenv` is **not** installed, so a `.env` file won't be loaded automatically. Either install `dotenv` and require it at the top of `server/index.ts`, or export the variables in your shell / use a tool like `direnv`.

## 3. Install

```bash
git clone <your-repo-url>
cd <project-folder>
npm ci
```

This installs everything from `package.json`:

- **Frontend:** React 18, Vite 6, TanStack Query, Wouter, all Radix/shadcn UI primitives, Tailwind 3, Recharts, jsPDF, framer-motion, react-hook-form, zod, date-fns, lucide-react.
- **Backend:** Express 4, drizzle-orm + drizzle-zod, passport / passport-local, express-session + memorystore, openai SDK, ws, @neondatabase/serverless.

## 4. Build & run commands

All commands come from `package.json`:

| Command | What it does |
|---|---|
| `npm run dev` | Starts the dev server on `http://localhost:5000`. Runs `tsx server/index.ts` which boots Express **and** mounts Vite as middleware — one port serves both API and frontend. |
| `npm run build` | Builds for production: Vite builds the client into `dist/public`, then esbuild bundles the server into `dist/index.js`. |
| `npm run start` | Runs the production build: `node dist/index.js` (serves the built client statically + API on `PORT`). |
| `npm run check` | TypeScript type-check (`tsc --noEmit`). |
| `npm run db:push` | Pushes the Drizzle schema in `shared/schema.ts` to the Postgres at `DATABASE_URL`. Only needed if you switch storage from in-memory to Postgres. |

## 5. Windows-specific note

The scripts hard-code `NODE_ENV=development node …`, which the Windows command prompt doesn't understand. Two options (no code change required):

- **Recommended:** run inside **WSL2** or **Git Bash**, where the scripts work as-is.
- Or install `cross-env` and run manually:
  ```bash
  npx cross-env NODE_ENV=development tsx server/index.ts
  ```

## 6. Typical local workflow

```bash
# one-time
git clone <repo>
cd <repo>
npm ci

# optional secrets
export SESSION_SECRET="some-long-random-string"
export AI_INTEGRATIONS_OPENAI_API_KEY="sk-..."   # only if you want AI Insights

# run
npm run dev
# open http://localhost:5000
```

That's everything — no Docker, no separate frontend/backend ports, no database required to use the app (data lives in memory and resets on restart).

## 7. Things to be aware of

- **Data is not persistent** by default. Restarting the dev server clears all LCs, shipments, expenses, archived reports, etc. To persist data you'd need to provision Postgres, set `DATABASE_URL`, run `npm run db:push`, and swap `MemStorage` for a Drizzle-backed implementation in `server/storage.ts`.
- The three `@replit/vite-plugin-*` dev plugins are auto-disabled outside Replit (they check `REPL_ID`), so they won't cause issues locally.
- Port `5000` is hardcoded as the default. On macOS, port 5000 is sometimes taken by AirPlay Receiver — set `PORT=3000` (or any free port) in that case.

## 8. Production build (optional)

To verify your production build locally:

```bash
npm run build
NODE_ENV=production PORT=5000 npm run start
# open http://localhost:5000
```

The built client is served statically from `dist/public`, and the API runs from the bundled `dist/index.js`.
