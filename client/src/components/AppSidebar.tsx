import { useLocation } from "wouter";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter, SidebarHeader,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, BrainCircuit, Wallet, TrendingUp, FileText, Ship, Package,
  Calculator, Settings, ChevronDown, ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "AI Insights", url: "/ai-insights", icon: BrainCircuit },
  { title: "Finance", url: "/finance", icon: Wallet },
  { title: "Exchange Rates", url: "/exchange-rates", icon: TrendingUp },
];

const importItems = [
  { title: "LC Management", url: "/import/lc-management", icon: FileText },
  { title: "Shipments", url: "/import/shipments", icon: Ship },
  { title: "Inventory", url: "/import/inventory", icon: Package },
];

const otherItems = [
  { title: "Customs Engine", url: "/customs", icon: Calculator },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const [importOpen, setImportOpen] = useState(true);

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-xs font-bold">IE</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight truncate">IMP-EXP</p>
            <p className="text-xs text-muted-foreground leading-tight truncate">MIDAS MANAGER</p>
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

      <SidebarFooter className="px-3 py-3 border-t">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Platform Power</p>
            <p className="text-xs font-medium text-green-600 dark:text-green-400">AI Engine Active</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
