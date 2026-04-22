import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import AIInsights from "@/pages/AIInsights";
import Finance from "@/pages/Finance";
import ExchangeRates from "@/pages/ExchangeRates";
import LCManagement from "@/pages/LCManagement";
import ImportShipments from "@/pages/ImportShipments";
import InventoryPage from "@/pages/Inventory";
import CustomsEngine from "@/pages/CustomsEngine";
import Settings from "@/pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/ai-insights" component={AIInsights} />
      <Route path="/finance" component={Finance} />
      <Route path="/exchange-rates" component={ExchangeRates} />
      <Route path="/import/lc-management" component={LCManagement} />
      <Route path="/import/shipments" component={ImportShipments} />
      <Route path="/import/inventory" component={InventoryPage} />
      <Route path="/customs" component={CustomsEngine} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties} defaultOpen={true}>
            <div className="flex h-screen w-full overflow-hidden">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center gap-3 px-4 py-2 border-b bg-background shrink-0" style={{ height: "52px" }}>
                  <SidebarTrigger data-testid="button-sidebar-toggle" className="shrink-0" />
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search shipments, LCs, or documents..."
                      className="pl-9 h-8 text-sm"
                      data-testid="input-search"
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button className="relative h-8 w-8 flex items-center justify-center rounded-md hover-elevate" data-testid="button-notifications">
                      <Bell className="h-4 w-4" />
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                    </button>
                    <ThemeToggle />
                    <div className="flex items-center gap-2 pl-2 border-l">
                      <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">MA</div>
                      <div className="hidden sm:block">
                        <p className="text-xs font-semibold leading-none">Midas Admin</p>
                        <p className="text-xs text-muted-foreground leading-none mt-0.5">Admin</p>
                      </div>
                    </div>
                  </div>
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
