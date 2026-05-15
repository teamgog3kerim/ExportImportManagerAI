import { useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, BrainCircuit, Wallet, TrendingUp, FileText, Ship, Package,
  Calculator, Settings, ChevronDown, ChevronRight, ShoppingCart, Banknote, Send,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "AI Insights", url: "/ai-insights", icon: BrainCircuit },
  { title: "Finance", url: "/finance", icon: Wallet },
  { title: "Exchange Rates", url: "/exchange-rates", icon: TrendingUp },
];

const importItems = [
  { title: "LC Management", url: "/import/lc-management", icon: FileText },
  { title: "Shipments", url: "/import/shipments", icon: Ship },
  { title: "Inventory", url: "/import/inventory", icon: Package },
];

const exportItems = [
  { title: "Purchase / Sourcing", url: "/export/purchases", icon: ShoppingCart },
  { title: "CAD Management", url: "/export/cads", icon: Banknote },
  { title: "Export Shipments", url: "/export/shipments", icon: Send },
];

const otherItems = [
  { title: "Tax Estimator", url: "/customs", icon: Calculator },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const [importOpen, setImportOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(true);

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4 border-b">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center shrink-0 shadow-sm" aria-label="Import / Export">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-primary-foreground"
              aria-hidden="true"
            >
              {/* Globe meridian — international trade */}
              <circle cx="12" cy="12" r="8.5" opacity="0.35" />
              <path d="M3.5 12h17" opacity="0.35" />
              {/* Inbound arrow (import) */}
              <path d="M5 9 L9 9 L9 6.5" />
              <path d="M9 9 L4.5 13.5" />
              {/* Outbound arrow (export) */}
              <path d="M19 15 L15 15 L15 17.5" />
              <path d="M15 15 L19.5 10.5" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold truncate tracking-tight text-[19px]">EXIMMAN</p>
            <p className="text-[0.65rem] tracking-[0.18em] uppercase text-muted-foreground leading-tight break-words whitespace-normal mt-0.5">My Export & Import Manager</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <a href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setImportOpen(!importOpen)}
          >
            <span>Import</span>
            {importOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </SidebarGroupLabel>
          {importOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                {importItems.map(item => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <a href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setExportOpen(!exportOpen)}
          >
            <span>Export</span>
            {exportOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </SidebarGroupLabel>
          {exportOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                {exportItems.map(item => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={location === item.url}>
                      <a href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/[\s/]+/g, "-")}`}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <a href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 py-3 border-t">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <div>
            <p className="text-[0.65rem] tracking-[0.16em] uppercase text-muted-foreground">Platform Status</p>
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">AI Engine Active</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
