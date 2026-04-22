# Imports Manager

An AI-powered Import Operations Management System for tracking shipments, Letters of Credit (LCs), budgets, and automating WhatsApp summary reports.

## Architecture

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **AI**: OpenAI GPT-4o-mini via Replit AI Integrations
- **Storage**: In-memory (MemStorage)
- **Routing**: wouter (client-side)
- **Data Fetching**: TanStack Query v5

## Key Features

1. **Dashboard** — Overview with metric cards, recent shipments, active LCs, budget progress
2. **Shipments** — Full CRUD for shipment tracking with status badges and search
3. **Letters of Credit** — LC portfolio management with expiry alerts
4. **Budgets** — Category-based budget tracking with utilization progress bars
5. **AI Assistant** — GPT-4o-mini powered chat that answers questions about real-time operations data
6. **WhatsApp Integration** — Daily summary report generation (status indicator in header)
7. **Dark/Light Mode** — Full theme support via ThemeProvider

## Project Structure

```
client/src/
  components/
    AIAssistant.tsx       — Slide-in AI chat panel
    AppSidebar.tsx        — Main sidebar navigation
    MetricCard.tsx        — Reusable stat card
    StatusBadge.tsx       — Color-coded status badges
    ThemeProvider.tsx     — Dark/light mode context
    ThemeToggle.tsx       — Theme toggle button
    examples/             — Component preview examples
  pages/
    Dashboard.tsx         — Main overview page
    Shipments.tsx         — Shipment CRUD
    LettersOfCredit.tsx   — LC CRUD
    Budgets.tsx           — Budget CRUD
  App.tsx                 — Root with sidebar layout + routing

server/
  routes.ts               — All API endpoints
  storage.ts              — MemStorage with seeded data
  openai.ts               — AI response & daily summary generation

shared/
  schema.ts               — Drizzle schema + Zod types
```

## API Endpoints

- `GET/POST /api/shipments` — List/create shipments
- `GET/PATCH/DELETE /api/shipments/:id`
- `GET/POST /api/lcs` — List/create LCs
- `GET/PATCH/DELETE /api/lcs/:id`
- `GET/POST /api/budgets` — List/create budget categories
- `PATCH/DELETE /api/budgets/:id`
- `GET /api/dashboard` — Aggregated dashboard data
- `POST /api/ai/chat` — AI assistant (sends message, returns response)
- `GET /api/whatsapp/summary` — Generate daily WhatsApp summary
- `GET/PATCH /api/whatsapp/config`

## Environment Variables

- `AI_INTEGRATIONS_OPENAI_API_KEY` — Set by Replit AI Integrations
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Set by Replit AI Integrations
- `SESSION_SECRET` — Express session secret
