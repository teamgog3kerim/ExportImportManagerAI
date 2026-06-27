import { useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, BrainCircuit, Wallet, TrendingUp, FileText, Ship, Package,
  Calculator, Settings, ChevronDown, ChevronRight, ShoppingCart, Banknote, Send, ShoppingBag, Bot,
} from "lucide-react";
import { useState } from "react";
import eximmanLogo from "@assets/eximman_logo_trim.png";
import { useAuth, canView } from "@/lib/auth";
import { pageForRoute } from "@shared/permissions";

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
  { title: "Sales", url: "/import/sales", icon: ShoppingBag },
];

const exportItems = [
  { title: "Purchase / Sourcing", url: "/export/purchases", icon: ShoppingCart },
  { title: "CAD Management", url: "/export/cads", icon: Banknote },
  { title: "Export Shipments", url: "/export/shipments", icon: Send },
];

const otherItems = [
  { title: "Cost Estimator", url: "/cost-estimator", icon: Calculator },
  { title: "Tax Estimator", url: "/customs", icon: Calculator },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Sales Bot", url: "/sales-bot", icon: Bot },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [importOpen, setImportOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(true);

  const allow = (url: string) => {
    const key = pageForRoute(url);
    return key ? canView(user, key) : true;
  };
  const navVisible = navItems.filter(i => allow(i.url));
  const importVisible = importItems.filter(i => allow(i.url));
  const exportVisible = exportItems.filter(i => allow(i.url));
  const otherVisible = otherItems.filter(i => allow(i.url));

  return (
    <Sidebar>
      <SidebarHeader className="px-2 py-3 border-b border-sidebar-border">
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center rounded-full bg-background px-7 py-3 shadow-sm">
            <img
              src={eximmanLogo}
              alt="EXIMMAN — My Export · Import Manager App"
              className="h-20 w-auto object-contain"
              data-testid="img-brand-logo"
            />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navVisible.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url} className="data-[active=true]:!bg-sidebar-primary data-[active=true]:!text-sidebar-primary-foreground data-[active=true]:font-medium">
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

        {importVisible.length > 0 && (
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
                {importVisible.map(item => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={location === item.url} className="data-[active=true]:!bg-sidebar-primary data-[active=true]:!text-sidebar-primary-foreground data-[active=true]:font-medium">
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
        )}

        {exportVisible.length > 0 && (
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
                {exportVisible.map(item => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={location === item.url} className="data-[active=true]:!bg-sidebar-primary data-[active=true]:!text-sidebar-primary-foreground data-[active=true]:font-medium">
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
        )}

        {otherVisible.length > 0 && (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherVisible.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={location === item.url} className="data-[active=true]:!bg-sidebar-primary data-[active=true]:!text-sidebar-primary-foreground data-[active=true]:font-medium">
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
        )}
      </SidebarContent>
      <SidebarFooter className="px-4 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <div>
            <p className="text-[0.65rem] tracking-[0.16em] uppercase text-sidebar-foreground/55">Platform Status</p>
            <p className="text-xs font-medium text-emerald-300">AI Engine Active</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
