import { Switch, Route, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Bell, Search, LogOut, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useAuth, canView, type AuthUser } from "@/lib/auth";
import NoAccess from "@/components/NoAccess";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import Dashboard from "@/pages/Dashboard";
import AIInsights from "@/pages/AIInsights";
import Finance from "@/pages/Finance";
import ExchangeRates from "@/pages/ExchangeRates";
import LCManagement from "@/pages/LCManagement";
import ImportShipments from "@/pages/ImportShipments";
import InventoryPage from "@/pages/Inventory";
import Sales from "@/pages/Sales";
import CustomsEngine from "@/pages/CustomsEngine";
import CostEstimator from "@/pages/CostEstimator";
import Settings from "@/pages/Settings";
import ExportPurchases from "@/pages/ExportPurchases";
import CADManagement from "@/pages/CADManagement";
import ExportShipments from "@/pages/ExportShipments";

function Guarded({
  user,
  pageKey,
  children,
}: {
  user: AuthUser | null;
  pageKey: string;
  children: React.ReactNode;
}) {
  if (!canView(user, pageKey)) return <NoAccess />;
  return <>{children}</>;
}

function AppRouter({ user }: { user: AuthUser | null }) {
  return (
    <Switch>
      <Route path="/dashboard">{() => <Guarded user={user} pageKey="dashboard"><Dashboard /></Guarded>}</Route>
      <Route path="/ai-insights">{() => <Guarded user={user} pageKey="ai-insights"><AIInsights /></Guarded>}</Route>
      <Route path="/finance">{() => <Guarded user={user} pageKey="finance"><Finance /></Guarded>}</Route>
      <Route path="/exchange-rates">{() => <Guarded user={user} pageKey="exchange-rates"><ExchangeRates /></Guarded>}</Route>
      <Route path="/import/lc-management">{() => <Guarded user={user} pageKey="import-lc"><LCManagement /></Guarded>}</Route>
      <Route path="/import/shipments">{() => <Guarded user={user} pageKey="import-shipments"><ImportShipments /></Guarded>}</Route>
      <Route path="/import/inventory">{() => <Guarded user={user} pageKey="import-inventory"><InventoryPage /></Guarded>}</Route>
      <Route path="/import/sales">{() => <Guarded user={user} pageKey="import-sales"><Sales /></Guarded>}</Route>
      <Route path="/export/purchases">{() => <Guarded user={user} pageKey="export-purchases"><ExportPurchases /></Guarded>}</Route>
      <Route path="/export/cads">{() => <Guarded user={user} pageKey="export-cads"><CADManagement /></Guarded>}</Route>
      <Route path="/export/shipments">{() => <Guarded user={user} pageKey="export-shipments"><ExportShipments /></Guarded>}</Route>
      <Route path="/cost-estimator">{() => <Guarded user={user} pageKey="cost-estimator"><CostEstimator /></Guarded>}</Route>
      <Route path="/customs">{() => <Guarded user={user} pageKey="customs"><CustomsEngine /></Guarded>}</Route>
      <Route path="/settings">{() => <Guarded user={user} pageKey="settings"><Settings /></Guarded>}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "U";
}

const ROLE_LABEL: Record<string, string> = { admin: "Admin", manager: "Manager", staff: "Staff" };

function AppLayout({ user }: { user: AuthUser }) {
  const [, setLocation] = useLocation();
  const style = {
    "--sidebar-width": "15rem",
    "--sidebar-width-icon": "3.5rem",
  };

  const signOut = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {}
    queryClient.setQueryData(["/api/auth/me"], null);
    queryClient.clear();
    setLocation("/signin");
  };

  return (
    <SidebarProvider style={style as React.CSSProperties} defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-3 px-4 py-2 border-b border-banner-foreground/15 bg-banner text-banner-foreground shrink-0" style={{ height: "52px" }}>
            <SidebarTrigger data-testid="button-sidebar-toggle" className="shrink-0 text-banner-foreground" />
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search shipments, LCs, or documents..."
                className="pl-9 h-8 text-sm bg-background text-foreground placeholder:text-muted-foreground border-transparent"
                data-testid="input-search"
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button className="relative h-8 w-8 flex items-center justify-center rounded-md hover-elevate text-banner-foreground" data-testid="button-notifications">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              </button>
              <ThemeToggle />
              <div className="flex items-center gap-2 pl-2 border-l border-banner-foreground/20">
                <div className="h-7 w-7 rounded-full bg-gold flex items-center justify-center text-gold-foreground text-xs font-bold" data-testid="text-user-initials">{initials(user.fullName)}</div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold leading-none" data-testid="text-user-name">{user.fullName}</p>
                  <p className="text-xs text-banner-foreground/70 leading-none mt-0.5" data-testid="text-user-role">{ROLE_LABEL[user.role] ?? user.role}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={signOut} data-testid="button-signout" title="Sign out" className="text-banner-foreground">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <AppRouter user={user} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthedApp() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) setLocation("/signin");
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;
  return <AppLayout user={user} />;
}

function Root() {
  const [location] = useLocation();
  if (location === "/") return <Landing />;
  if (location === "/signin") return <SignIn />;
  if (location === "/signup") return <SignUp />;
  return <AuthedApp />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Root />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
