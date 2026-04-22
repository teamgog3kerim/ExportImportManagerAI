import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Ship, FileText, AlertTriangle, DollarSign, BrainCircuit, TrendingUp,
  ArrowUpRight, ArrowDownRight, RefreshCw
} from "lucide-react";

function fmt(n: number | string) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["/api/dashboard"] });

  if (isLoading) {
    return (
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-4"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const metrics = [
    { label: "Total Shipments", value: data?.totalShipments ?? 0, icon: Ship, color: "text-blue-600", sub: "Active logistics" },
    { label: "Active LCs", value: data?.activeLCs ?? 0, icon: FileText, color: "text-violet-600", sub: "Letters of credit" },
    { label: "Customs at Risk", value: data?.customsAtRisk ?? 0, icon: AlertTriangle, color: "text-amber-600", sub: "Needs attention" },
    { label: "Revenue (ETB)", value: `${fmt(data?.totalRevenueEtb ?? 0)}`, icon: DollarSign, color: "text-emerald-600", sub: "Inventory value" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Executive Overview — MY IMP-EXP MANAGER</p>
        </div>
        <Button variant="outline" size="sm" data-testid="button-generate-report">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Generate Report
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => (
          <Card key={m.label} data-testid={`card-metric-${m.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{m.label}</p>
                  <p className="text-xl font-bold mt-1 truncate">{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.sub}</p>
                </div>
                <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <m.icon className={`h-4 w-4 ${m.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Trade Volume — Monthly Import Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.tradeVolumeData ?? []}>
                <defs>
                  <linearGradient id="tvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(215,85%,35%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(215,85%,35%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="hsl(215,85%,35%)" fill="url(#tvGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between flex-wrap gap-1">
              <span>Currency Exchange</span>
              <Badge variant="secondary" className="text-xs">Live ETB</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.allRates ?? []).slice(0, 5).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-xs" data-testid={`text-rate-${r.bankCode}`}>
                <span className="text-muted-foreground truncate max-w-[7rem]">{r.bankName.split(" ")[0]}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-green-600 font-medium flex items-center gap-0.5">
                    <ArrowUpRight className="h-3 w-3" />{Number(r.buyingEtb).toFixed(2)}
                  </span>
                  <span className="text-red-500 font-medium flex items-center gap-0.5">
                    <ArrowDownRight className="h-3 w-3" />{Number(r.sellingEtb).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">USD / ETB Avg</p>
              <p className="text-lg font-bold text-primary">
                {data?.allRates?.length > 0
                  ? (data.allRates.reduce((s: number, r: any) => s + Number(r.buyingEtb), 0) / data.allRates.length).toFixed(4)
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Ship className="h-4 w-4 text-primary" /> Recent Shipments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {(data?.recentShipments ?? []).map((s: any, idx: number) => (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-md hover-elevate" data-testid={`row-shipment-${idx}`}>
                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Ship className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{s.origin} → {s.destination}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.billNumber ?? "—"} · ETA {s.etaDate ?? "TBD"}</p>
                  </div>
                  <Badge
                    variant={s.status.includes("Complete") ? "default" : s.status.includes("Risk") ? "destructive" : "secondary"}
                    className="text-xs shrink-0 max-w-[120px] truncate"
                  >
                    {s.status.length > 18 ? s.status.slice(0, 18) + "…" : s.status}
                  </Badge>
                </div>
              ))}
              {(!data?.recentShipments || data.recentShipments.length === 0) && (
                <p className="text-sm text-muted-foreground py-4 text-center">No shipments yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BrainCircuit className="h-4 w-4" /> AI Intelligent Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-md bg-white/10 p-2.5">
              <p className="text-xs font-semibold">Shipment Delay Risk</p>
              <p className="text-xs opacity-80 mt-1">Djibouti port congestion moderate. Avg clearing 4.2 days.</p>
            </div>
            <div className="rounded-md bg-white/10 p-2.5">
              <p className="text-xs font-semibold">Cost Optimization</p>
              <p className="text-xs opacity-80 mt-1">Consolidating shipments saves ETB 312,000.</p>
            </div>
            <div className="rounded-md bg-white/10 p-2.5">
              <p className="text-xs font-semibold">Market Volatility</p>
              <p className="text-xs opacity-80 mt-1">ETB/USD 5% fluctuation predicted — hedge now.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs bg-white/10 border-white/20 text-primary-foreground"
              asChild
            >
              <a href="/ai-insights">Deep Analytics Hub</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
