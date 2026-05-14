import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { useMemo, useState } from "react";
import {
  ArrowUpRight, ArrowDownRight, Building2, TrendingUp, BarChart3,
  Sparkles, ArrowRightLeft, RadioTower,
} from "lucide-react";
import type { ExchangeRate } from "@shared/schema";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface RatesResponse {
  rates: ExchangeRate[];
  lastUpdated: string | null;
  source?: string;
  live?: boolean;
  refreshIntervalMs?: number;
  stats: {
    avgTxnBuy: number; avgTxnSell: number;
    avgCashBuy: number; avgCashSell: number;
    bestTxnBuy: ExchangeRate | null;
    bestCashBuy: ExchangeRate | null;
    lowestSell: ExchangeRate | null;
    spread: number;
  };
  insight: string;
}

// Cross rates against USD (used to convert any currency → ETB via USD)
const CURRENCIES: Array<{ code: string; name: string; perUsd: number; flag: string }> = [
  { code: "USD", name: "US Dollar",       perUsd: 1,       flag: "🇺🇸" },
  { code: "EUR", name: "Euro",            perUsd: 0.9234,  flag: "🇪🇺" },
  { code: "GBP", name: "British Pound",   perUsd: 0.7876,  flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen",    perUsd: 156.40,  flag: "🇯🇵" },
  { code: "CNY", name: "Chinese Yuan",    perUsd: 7.245,   flag: "🇨🇳" },
  { code: "AED", name: "UAE Dirham",      perUsd: 3.673,   flag: "🇦🇪" },
  { code: "SAR", name: "Saudi Riyal",     perUsd: 3.751,   flag: "🇸🇦" },
  { code: "CHF", name: "Swiss Franc",     perUsd: 0.8845,  flag: "🇨🇭" },
  { code: "CAD", name: "Canadian Dollar", perUsd: 1.382,   flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", perUsd: 1.546, flag: "🇦🇺" },
  { code: "KES", name: "Kenyan Shilling", perUsd: 129.40,  flag: "🇰🇪" },
  { code: "DJF", name: "Djiboutian Franc", perUsd: 177.72, flag: "🇩🇯" },
  { code: "ETB", name: "Ethiopian Birr",  perUsd: 157.50,  flag: "🇪🇹" },
];

const fmt = (n: number, d = 4) =>
  n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export default function ExchangeRates() {
  const { data, isLoading, dataUpdatedAt } = useQuery<RatesResponse>({
    queryKey: ["/api/exchange-rates"],
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true,
  });

  const rates = data?.rates ?? [];
  const stats = data?.stats;
  const insight = data?.insight ?? "";

  // Converter state
  const [amount, setAmount] = useState("1000");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("ETB");
  const [rateMode, setRateMode] = useState<"transaction" | "cash">("transaction");
  const [side, setSide] = useState<"buying" | "selling">("buying");
  const [activeTab, setActiveTab] = useState<"transaction" | "cash">("transaction");

  const refRate = useMemo(() => {
    if (!stats) return 0;
    if (rateMode === "transaction") return side === "buying" ? stats.avgTxnBuy : stats.avgTxnSell;
    return side === "buying" ? stats.avgCashBuy : stats.avgCashSell;
  }, [stats, rateMode, side]);

  const converted = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const fromDef = CURRENCIES.find(c => c.code === from);
    const toDef = CURRENCIES.find(c => c.code === to);
    if (!fromDef || !toDef) return 0;
    // Convert FROM → USD, then USD → TO. ETB uses the bank-rate market mid.
    const toUsd = from === "ETB" && refRate ? amt / refRate : amt / fromDef.perUsd;
    if (to === "ETB" && refRate) return toUsd * refRate;
    return toUsd * toDef.perUsd;
  }, [amount, from, to, refRate]);

  const lastUpdate = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString("en-US", { hour12: false })
    : "—";

  // Chart data (sorted descending by transaction buying)
  const chartData = useMemo(
    () => rates
      .map(r => ({
        bank: r.bankCode,
        full: r.bankName,
        txnBuy: Number(r.buyingEtb),
        txnSell: Number(r.sellingEtb),
        cashBuy: Number(r.cashBuyingEtb),
        cashSell: Number(r.cashSellingEtb),
      }))
      .sort((a, b) => (activeTab === "transaction" ? b.txnBuy - a.txnBuy : b.cashBuy - a.cashBuy)),
    [rates, activeTab]
  );

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        eyebrow="Markets"
        title="Live Exchange Rates"
        description="Live USD/ETB rates from every major Ethiopian bank — sourced from exchange.addisfortune.news, refreshed every 5 minutes."
        actions={
          <Badge variant="secondary" className="gap-1.5 px-2.5">
            <RadioTower className={`h-3.5 w-3.5 ${data?.live ? "text-emerald-600 animate-pulse" : "text-amber-600"}`} />
            <span className="text-xs font-medium" data-testid="text-last-updated">
              {data?.live ? "Live" : "Fallback"} · {lastUpdate}
            </span>
          </Badge>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Best Transaction Buy"
          value={stats?.bestTxnBuy ? fmt(Number(stats.bestTxnBuy.buyingEtb)) : "—"}
          sub={stats?.bestTxnBuy?.bankName ?? "—"}
          tone="emerald"
          testId="text-best-txn-buy"
        />
        <StatCard
          label="Best Cash Buy"
          value={stats?.bestCashBuy ? fmt(Number(stats.bestCashBuy.cashBuyingEtb)) : "—"}
          sub={stats?.bestCashBuy?.bankName ?? "—"}
          tone="primary"
          testId="text-best-cash-buy"
        />
        <StatCard
          label="Market Mid-Rate"
          value={stats ? fmt(stats.avgTxnBuy, 2) : "—"}
          sub={`Across ${rates.length} banks`}
          tone="muted"
          testId="text-mid-rate"
        />
        <StatCard
          label="Avg Spread"
          value={stats ? fmt(stats.spread) : "—"}
          sub={`Lowest Sell · ${stats?.lowestSell?.bankName ?? "—"}`}
          tone="muted"
          testId="text-avg-spread"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Table + Chart */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-lg font-semibold text-primary">Ethiopian Bank Rates</h2>
                </div>
                <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="transaction" className="text-xs" data-testid="tab-transaction">Transaction</TabsTrigger>
                    <TabsTrigger value="cash" className="text-xs" data-testid="tab-cash">Cash</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {activeTab === "cash" && (
                <p className="text-[0.65rem] text-muted-foreground mb-2 italic">
                  Cash rates are estimated from transaction rates (banks rarely publish them). Transaction rates are 100% live from {data?.source ?? "Addis Fortune"}.
                </p>
              )}

              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-9 bg-muted animate-pulse rounded" />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Bank</th>
                        <th className="text-left py-2 pr-3 font-semibold text-muted-foreground w-16">Code</th>
                        <th className="text-right py-2 pr-3 font-semibold text-emerald-600">Buying</th>
                        <th className="text-right py-2 font-semibold text-red-500">Selling</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((r, idx) => {
                        const buy = activeTab === "transaction" ? r.txnBuy : r.cashBuy;
                        const sell = activeTab === "transaction" ? r.txnSell : r.cashSell;
                        return (
                          <tr key={r.bank} className="border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors" data-testid={`row-rate-${idx}`}>
                            <td className="py-2 pr-3 font-medium">{r.full}</td>
                            <td className="py-2 pr-3">
                              <Badge variant="secondary" className="text-[0.65rem] font-mono">{r.bank}</Badge>
                            </td>
                            <td className="py-2 pr-3 text-right text-emerald-600 font-medium tabular-nums">
                              <span className="inline-flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />{fmt(buy)}</span>
                            </td>
                            <td className="py-2 text-right text-red-500 font-medium tabular-nums">
                              <span className="inline-flex items-center gap-0.5 justify-end"><ArrowDownRight className="h-3 w-3" />{fmt(sell)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="font-display text-lg font-semibold text-primary">Bank Rate Comparison</h2>
                <span className="text-xs text-muted-foreground ml-auto">
                  {activeTab === "transaction" ? "Transaction Rate" : "Cash Rate"} · Buying vs Selling
                </span>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="bank" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 6 }}
                      formatter={(v: number) => fmt(v)}
                      labelFormatter={(l, p: any) => p?.[0]?.payload?.full ?? l}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey={activeTab === "transaction" ? "txnBuy" : "cashBuy"}
                      name="Buying"
                      fill="#16a34a"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey={activeTab === "transaction" ? "txnSell" : "cashSell"}
                      name="Selling"
                      fill="#dc2626"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Converter + Insight */}
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                <h2 className="font-display text-lg font-semibold text-primary">Currency Converter</h2>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-converter-amount"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">From</Label>
                  <Select value={from} onValueChange={setFrom}>
                    <SelectTrigger data-testid="select-from-currency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="font-mono">{c.code}</span> · {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">To</Label>
                  <Select value={to} onValueChange={setTo}>
                    <SelectTrigger data-testid="select-to-currency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="font-mono">{c.code}</span> · {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Rate Type</Label>
                  <Select value={rateMode} onValueChange={v => setRateMode(v as any)}>
                    <SelectTrigger data-testid="select-rate-mode"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transaction">Transaction</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Side</Label>
                  <Select value={side} onValueChange={v => setSide(v as any)}>
                    <SelectTrigger data-testid="select-side"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buying">Buying (Bank buys FCY)</SelectItem>
                      <SelectItem value="selling">Selling (Bank sells FCY)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-center">
                <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                  {amount || "0"} {from} =
                </p>
                <p className="font-display text-2xl font-semibold text-primary mt-1 tabular-nums" data-testid="text-converted-amount">
                  {fmt(converted, 2)} {to}
                </p>
                <p className="text-[0.65rem] text-muted-foreground mt-1.5">
                  {to === "ETB" || from === "ETB"
                    ? `Bank ${rateMode} ${side} rate: ETB ${fmt(refRate)} / USD`
                    : `Cross-rate via USD · market reference`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-semibold text-primary">Market Insight</h3>
                <Badge variant="secondary" className="ml-auto text-[0.6rem]">Auto · 5m</Badge>
              </div>
              <p className="text-xs leading-relaxed text-foreground/80" data-testid="text-market-insight" key={dataUpdatedAt}>
                {insight || "Awaiting market data…"}
              </p>
              {stats && (
                <div className="grid grid-cols-2 gap-2 mt-3 text-[0.7rem]">
                  <InsightCell label="Avg Txn Buy" value={fmt(stats.avgTxnBuy, 2)} />
                  <InsightCell label="Avg Txn Sell" value={fmt(stats.avgTxnSell, 2)} />
                  <InsightCell label="Avg Cash Buy" value={fmt(stats.avgCashBuy, 2)} />
                  <InsightCell label="Avg Cash Sell" value={fmt(stats.avgCashSell, 2)} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, tone, testId }: {
  label: string; value: string; sub: string; tone: "emerald" | "primary" | "muted"; testId: string;
}) {
  const valueColor = tone === "emerald" ? "text-emerald-600" : tone === "primary" ? "text-primary" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
        <p className={`font-display text-xl font-semibold mt-1 tabular-nums ${valueColor}`} data-testid={testId}>
          {value}
        </p>
        <p className="text-[0.65rem] text-muted-foreground mt-1 truncate">{sub}</p>
      </CardContent>
    </Card>
  );
}

function InsightCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-card border border-border px-2 py-1.5">
      <p className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-mono text-xs font-semibold tabular-nums">{value}</p>
    </div>
  );
}
