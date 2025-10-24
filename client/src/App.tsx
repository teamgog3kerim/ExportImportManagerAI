import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppSidebar } from "@/components/AppSidebar";
import { AIAssistant } from "@/components/AIAssistant";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Dashboard from "@/pages/Dashboard";
import Shipments from "@/pages/Shipments";
import LettersOfCredit from "@/pages/LettersOfCredit";
import Budgets from "@/pages/Budgets";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/shipments" component={Shipments} />
      <Route path="/lcs" component={LettersOfCredit} />
      <Route path="/budgets" component={Budgets} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAiAssistantOpen(true)}
                      data-testid="button-open-ai-assistant"
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span className="hidden sm:inline">AI Assistant</span>
                    </Button>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border">
                      <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-xs text-muted-foreground hidden sm:inline">WhatsApp</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-0 text-xs">
                        Connected
                      </Badge>
                    </div>
                    <ThemeToggle />
                  </div>
                </header>
                <main className="flex-1 overflow-auto p-6">
                  <div className="max-w-7xl mx-auto">
                    <Router />
                  </div>
                </main>
              </div>
            </div>
            <AIAssistant isOpen={aiAssistantOpen} onClose={() => setAiAssistantOpen(false)} />
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
