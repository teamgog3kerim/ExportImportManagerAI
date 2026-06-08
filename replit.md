# MY IMP-EXP MANAGER (IMP-EXP MIDAS MANAGER)

A comprehensive Ethiopian Import/Export Management System built with a 29-page wireframe specification.

**Tagline:** MANAGE YOUR IMPORT AND EXPORT AT THE PALM OF YOUR HAND !!

## Architecture

Full-stack TypeScript with React frontend and Express backend.

### Technology Stack
- **Frontend:** React + TypeScript, Vite, TanStack Query, Wouter routing, Recharts, Shadcn/UI
- **Backend:** Express, in-memory storage (MemStorage)
- **AI:** OpenAI GPT-4o-mini via Replit AI Integrations
- **Styling:** Tailwind CSS with custom ETB/Ethiopian-themed colors

### Key Features
1. **Dashboard** — Trade volume chart, currency exchange rates (ETB/USD), AI insights, recent shipments. **Generate Report** dialog supports a language choice (English or Amharic/አማርኛ) for the on-screen report and PDF export; Amharic is produced by AI translation (numbers, currencies, dates and proper nouns preserved) and the PDF embeds the Abyssinica SIL Ge'ez font
2. **AI Insights Engine** — Efficiency score gauge, trade predictions, risk detection, AI chat assistant
3. **Financial Ledger** — Available balance, LC credit limit, cash flow forecast, transaction history
4. **Exchange Rates** — Addis Fortune Exchange Board with 8 Ethiopian banks (Amhara, Berhan, Hijra, Hibret, Dashen, ZamZam, Oromia, CBE), smart USD/ETB converter
5. **LC Management** — Full CRUD for Letters of Credit with auto-calculated cost breakdown modal:
   - Opening Payments Advice: FCY value × exchange rate, margin (30%), bank commission (4%), VAT (15%), Swift charge
   - Settlement Amount: FCY value, margin held, settlement % (70%), NBE 2.5% rate
   - Paid/unpaid status checkboxes with color indicators
6. **Import Shipments** — Route tracking (Supplier→Port→Sea→Djibouti→Modjo→Warehouse), documents, customs financials, pre-fill from approved LC
7. **Inventory** — Post-clearance stock with warehouse utilization, low stock alerts, AI stock forecasting. Each item carries auto-generated per-unit serial numbers (prefix from shipment ref)
8. **Sales** (Import) — Sell cleared inventory by serial number with full traceability. Multi-select available serials from stock, record customer/TIN/contact, payment method & status, per-line pricing, discount and 15% VAT totals. Selling marks serials sold so they leave available stock and decrement quantities; reversing a sale releases serials back. Includes a Serial Number Tracer that reports whether any serial is in stock or which sale/customer it went to
9. **Cost Estimator** — Professional Landed Cost Build-Up Calculator (per-unit ETB). Four tabs: Shipment Input (header fields, qty/FOB, exchange rates with opening/settlement/forecasted increments), Cost Breakdown (full line-by-line build-up — FOB→C&F→CIF, marine insurance 2%, bank charges, taxes & duties with total tax rate and actual duty, port/Djibouti transport, storage, warehouse/assembly, scanning, miscellaneous → sub-total & total landed cost, cost rate ETB/USD), Margin Analysis (duty-paid price across margin scenarios 100%→0% plus forecasted-period row), and Records (save/load/delete/clear/search/export-CSV, stored in browser localStorage). Calculations are an exact port of the source workbook; visible line-item descriptions intentionally omit formula annotations and cell references
10. **Customs Engine** — Real-time tax calculator: CIF = FOB + Freight + Insurance; Duty(20%) + Surtax(3%) + VAT(15%) + Withholding(3%), required documents status, AI HS code classification
11. **Settings** — Company profile (Midas Global Trade Ltd), Banks, Suppliers, Certifications, Notifications with toggles

### Ethiopian Context
- Currency: ETB (Ethiopian Birr), USD/ETB rates from Addis Fortune
- Ports: Djibouti (main port), Modjo (inland dry port), Kality (Addis Ababa warehouse)
- Banks: Commercial Bank of Ethiopia, Dashen Bank, Amhara Bank, NBE, Hijra Bank, Hibret Bank, ZamZam Bank, Oromia Bank
- Company: Midas Global Trade Ltd, Bole Road, Addis Ababa, Ethiopia (TIN: 0012345678)
- Certifications: Organic (USDA), Fairtrade, Rainforest Alliance

### Data Models (shared/schema.ts)
- `lcs` — Letters of Credit with full financial fields
- `shipments` — Import shipments with route and customs data
- `inventory` — Post-clearance inventory items (incl. `serialNumbers` and `soldSerials` arrays)
- `sales` — Import sales: customer, payment, line items (serials) as JSON, subtotal/discount/VAT/total
- `exchangeRates` — Ethiopian bank USD/ETB rates
- `banks` — Company bank accounts
- `suppliers` — International supplier registry
- `certifications` — Export/import certification types
- `companySettings` — Company profile
- `notificationSettings` — Alert preferences

### API Routes (server/routes.ts)
- `GET /api/dashboard` — Dashboard aggregated data
- `GET/POST/PATCH/DELETE /api/lcs` — LC CRUD
- `GET/POST/PATCH/DELETE /api/shipments` — Shipment CRUD
- `GET/POST/PATCH/DELETE /api/inventory` — Inventory CRUD
- `GET/POST/PATCH/DELETE /api/sales` — Sales CRUD (create marks serials sold; delete releases them)
- `GET /api/sales/available-serials` — Serials in stock and sellable (inventory minus sold)
- `GET /api/exchange-rates` — Exchange rates
- `GET/POST/DELETE /api/settings/banks` — Bank accounts
- `GET/POST/DELETE /api/settings/suppliers` — Suppliers
- `GET/POST/DELETE /api/settings/certifications` — Certifications
- `GET/PATCH /api/settings/company` — Company settings
- `GET/PATCH /api/settings/notifications` — Notification settings
- `POST /api/ai/chat` — AI chat (OpenAI GPT-4o-mini)

### Navigation
- `/` — Dashboard
- `/ai-insights` — AI Insights Engine
- `/finance` — Financial Ledger
- `/exchange-rates` — Exchange Rates (Addis Fortune Board)
- `/import/lc-management` — LC Management
- `/import/shipments` — Import Shipments
- `/import/inventory` — Inventory
- `/import/sales` — Sales (sell inventory by serial number)
- `/cost-estimator` — Cost Estimator (Landed Cost Build-Up Calculator, client-side localStorage records)
- `/customs` — Customs Engine
- `/settings` — Settings (Company/Banks/Suppliers/Certs/Notifications)

### Environment Variables
- `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI API key (via Replit AI Integrations)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — OpenAI base URL
- `SESSION_SECRET` — Session secret
