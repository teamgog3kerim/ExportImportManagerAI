import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { BrainCircuit, AlertTriangle, TrendingUp, Package, Send, Bot, User } from "lucide-react";

interface Msg { role: "user" | "ai"; content: string; }

const predictionData = [
  { month: "Jan", actual: 250, predicted: 240 },
  { month: "Feb", actual: 180, predicted: 210 },
  { month: "Mar", actual: 320, predicted: 300 },
  { month: "Apr", actual: 480, predicted: 450 },
  { month: "May", actual: null, predicted: 620 },
  { month: "Jun", actual: null, predicted: 780 },
];

const risks = [
  { label: "Route Congestion at Djibouti", level: "High", action: "Redirect non-urgent cargo to avoid delays", color: "destructive" as const },
  { label: "Currency Volatility Alert", level: "Medium", action: "5% ETB depreciation predicted — hedge upcoming payments", color: "secondary" as const },
  { label: "Supplier Lead Time Increase", level: "Low", action: "Global Heavy Industries delays +7 days. Update ETA estimates", color: "secondary" as const },
];

const opportunities = [
  { title: "Shipment Consolidation", detail: "Consolidating SHP-001 and SHP-004 saves $2,400 in freight costs", icon: Package },
  { title: "Inventory Optimization", detail: "Electronics stock-out risk in 15 days. Reorder 400 units recommended", icon: TrendingUp },
];

export default function AIInsights() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "ai", content: "Hello! I'm your IMP-EXP AI assistant. Ask me about your shipments, LCs, exchange rates, or Ethiopian customs regulations." }
  ]);
  const [input, setInput] = useState("");

  const chatMutation = useMutation({
    mutationFn: (message: string) => apiRequest("POST", "/api/ai/chat", { message }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", content: data.response }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, AI is temporarily unavailable." }]);
    },
  });

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages(prev => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    chatMutation.mutate(trimmed);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Insights Engine</h1>
        <p className="text-sm text-muted-foreground">Powered by GPT-4o · Ethiopian trade intelligence</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Efficiency Score */}
        <Card className="flex flex-col items-center justify-center py-8">
          <div className="relative flex items-center justify-center h-28 w-28">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(215,85%,35%)" strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 40 * 0.92} ${2 * Math.PI * 40}`} strokeLinecap="round" />
            </svg>
            <div className="absolute text-center">
              <p className="text-2xl font-bold">92</p>
              <p className="text-xs text-muted-foreground">/ 100</p>
            </div>
          </div>
          <p className="mt-3 font-semibold text-sm">Efficiency Score</p>
          <Badge variant="default" className="mt-1">OPTIMAL</Badge>
          <p className="text-xs text-muted-foreground mt-1">Overall trade performance</p>
        </Card>

        {/* Trade Volume Prediction */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Trade Volume Prediction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={predictionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="actual" stroke="hsl(215,85%,35%)" strokeWidth={2} dot={{ r: 3 }} name="Actual" connectNulls={false} />
                <Line type="monotone" dataKey="predicted" stroke="hsl(175,70%,38%)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} name="AI Predicted" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Identified Risks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Identified Risks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {risks.map((r, i) => (
              <div key={i} className="p-3 rounded-md bg-muted" data-testid={`card-risk-${i}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-xs font-semibold">{r.label}</p>
                  <Badge variant={r.color} className="text-xs shrink-0">{r.level}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{r.action}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Opportunities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-primary" /> AI Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunities.map((o, i) => (
              <div key={i} className="p-3 rounded-md bg-muted" data-testid={`card-opportunity-${i}`}>
                <div className="flex items-center gap-2 mb-1">
                  <o.icon className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold">{o.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">{o.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Chat */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> AI Trade Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 overflow-y-auto space-y-3 mb-3 pr-2" data-testid="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-primary" : "bg-muted"}`}>
                  {m.role === "user" ? <User className="h-3 w-3 text-primary-foreground" /> : <Bot className="h-3 w-3 text-foreground" />}
                </div>
                <div className={`max-w-[80%] rounded-md px-3 py-2 text-xs ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-2">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="bg-muted rounded-md px-3 py-2 text-xs text-muted-foreground animate-pulse">Thinking...</div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Ask about customs duties, exchange rates, LC status..."
              className="text-sm"
              data-testid="input-chat"
            />
            <Button size="icon" onClick={sendMessage} disabled={chatMutation.isPending} data-testid="button-send-chat">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
