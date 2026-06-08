export type PermLevel = "none" | "view" | "record";

export type Role = "admin" | "manager" | "staff";

export interface PageDef {
  key: string;
  label: string;
  path: string;
  group: "Main" | "Import" | "Export" | "Tools";
  adminOnly?: boolean;
}

export const PAGES: PageDef[] = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", group: "Main" },
  { key: "ai-insights", label: "AI Insights", path: "/ai-insights", group: "Main" },
  { key: "finance", label: "Finance", path: "/finance", group: "Main" },
  { key: "exchange-rates", label: "Exchange Rates", path: "/exchange-rates", group: "Main" },
  { key: "import-lc", label: "LC Management", path: "/import/lc-management", group: "Import" },
  { key: "import-shipments", label: "Import Shipments", path: "/import/shipments", group: "Import" },
  { key: "import-inventory", label: "Inventory", path: "/import/inventory", group: "Import" },
  { key: "import-sales", label: "Sales", path: "/import/sales", group: "Import" },
  { key: "export-purchases", label: "Purchase / Sourcing", path: "/export/purchases", group: "Export" },
  { key: "export-cads", label: "CAD Management", path: "/export/cads", group: "Export" },
  { key: "export-shipments", label: "Export Shipments", path: "/export/shipments", group: "Export" },
  { key: "cost-estimator", label: "Landed Cost Estimator", path: "/cost-estimator", group: "Tools" },
  { key: "customs", label: "Tax Estimator", path: "/customs", group: "Tools" },
  { key: "settings", label: "Settings", path: "/settings", group: "Tools", adminOnly: true },
];

export const PAGE_KEYS = PAGES.map((p) => p.key);

// Pages an employee can actually be granted (Settings is admin-only and excluded).
export const ASSIGNABLE_PAGES = PAGES.filter((p) => !p.adminOnly);

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};

function allLevel(level: PermLevel): Record<string, PermLevel> {
  const out: Record<string, PermLevel> = {};
  for (const p of PAGES) out[p.key] = p.adminOnly ? "none" : level;
  return out;
}

// Default permission sets used to pre-fill when a role is selected.
export const ROLE_DEFAULTS: Record<Role, Record<string, PermLevel>> = {
  admin: { ...allLevel("record"), settings: "record" },
  manager: {
    dashboard: "view",
    "ai-insights": "view",
    finance: "record",
    "exchange-rates": "view",
    "import-lc": "record",
    "import-shipments": "record",
    "import-inventory": "record",
    "import-sales": "record",
    "export-purchases": "record",
    "export-cads": "record",
    "export-shipments": "record",
    "cost-estimator": "record",
    customs: "record",
    settings: "none",
  },
  staff: {
    dashboard: "view",
    "ai-insights": "view",
    finance: "none",
    "exchange-rates": "view",
    "import-lc": "view",
    "import-shipments": "view",
    "import-inventory": "record",
    "import-sales": "record",
    "export-purchases": "none",
    "export-cads": "none",
    "export-shipments": "none",
    "cost-estimator": "view",
    customs: "view",
    settings: "none",
  },
};

export function defaultPermsForRole(role: Role): Record<string, PermLevel> {
  return { ...(ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.staff) };
}

// Maps an API request path to the page key that governs it. Used server-side.
export const API_PAGE_RULES: { test: RegExp; page: string }[] = [
  { test: /^\/api\/dashboard/, page: "dashboard" },
  { test: /^\/api\/reports/, page: "dashboard" },
  { test: /^\/api\/ai\//, page: "ai-insights" },
  { test: /^\/api\/finance\//, page: "finance" },
  { test: /^\/api\/exchange-rates/, page: "exchange-rates" },
  { test: /^\/api\/lcs/, page: "import-lc" },
  { test: /^\/api\/shipments/, page: "import-shipments" },
  { test: /^\/api\/inventory/, page: "import-inventory" },
  { test: /^\/api\/sales/, page: "import-sales" },
  { test: /^\/api\/export\/purchases/, page: "export-purchases" },
  { test: /^\/api\/export\/cads/, page: "export-cads" },
  { test: /^\/api\/export\/shipments/, page: "export-shipments" },
  { test: /^\/api\/customs/, page: "customs" },
];

export function pageForApiPath(path: string): string | null {
  return API_PAGE_RULES.find((r) => r.test.test(path))?.page ?? null;
}

export function pageForRoute(route: string): string | null {
  const found = PAGES.find((p) => p.path === route);
  return found ? found.key : null;
}
