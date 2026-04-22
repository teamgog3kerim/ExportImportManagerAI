import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Wallet, TrendingUp, TrendingDown, DollarSign, FileText, ArrowDownLeft, ArrowUpRight } from "lucide-react";

const cashFlowData = [
  { week: "Week 1", inflow: 35000, outflow: 28000 },
  { week: "Week 2", inflow: 42000, outflow: 38000 },
  { week: "Week 3", inflow: 55000, outflow: 41000 },
  { week: "Week 4", inflow: 63000, outflow: 45000 },
];

const transactions = [
  { desc: "Customs Duty Payment", type: "debit", amount: "487,000", date: "2024-04-20", icon: TrendingDown },
  { desc: "Product Sale — Machinery", type: "credit", amount: "2,400,000", date: "2024-04-18", icon: TrendingUp },
  { desc: "Freight Charges — SHP-001", type: "debit", amount: "81,000", date: "2024-04-17", icon: TrendingDown },
  { desc: "LC Utilization — LC-78921", type: "debit", amount: "1,725,000", date: "2024-04-15", icon: TrendingDown },
  { desc: "Export Revenue — Coffee Batch", type: "credit", amount: "3,150,000", date: "2024-04-14", icon: TrendingUp },
];

function fmt(n: string) {
  return `ETB ${n}`;
}

export default function Finance() {
  const creditUsed = 2400000;
  const creditLimit = 10000000;
  const pct = Math.round((creditUsed / creditLimit) * 100);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Financial Ledger</h1>
          <p className="text-sm text-muted-foreground">Manage accounts, cash flow, and LC credit limits</p>
        </div>
        <Button variant="outline" size="sm" data-testid="button-export-finance">
          <FileText className="h-3.5 w-3.5 mr-1.5" /> Export Statement
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Available Balance</p>
                <p className="text-xl font-bold mt-1 text-emerald-600" data-testid="text-available-balance">ETB 4,852,940</p>
                <p className="text-xs text-muted-foreground mt-0.5">Commercial Bank of Ethiopia</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">LC Credit Limit</p>
                <p className="text-xl font-bold mt-1" data-testid="text-lc-credit-limit">ETB 10,000,000</p>
                <div className="mt-2 w-full bg-muted rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pct}% used · ETB 7,600,000 available</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-4">
            <p className="text-xs opacity-80">Profit Estimation (AI)</p>
            <p className="text-xl font-bold mt-1" data-testid="text-net-profit-margin">33.4% Net Margin</p>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="opacity-80">Expected Revenue</span>
                <span className="font-semibold">ETB 1,200,000</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="opacity-80">Est. Landed Costs</span>
                <span className="font-semibold">ETB 800,000</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Cash Flow Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `ETB ${v.toLocaleString()}`} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="inflow" fill="hsl(175,70%,38%)" name="Inflow" radius={[3, 3, 0, 0]} />
                <Bar dataKey="outflow" fill="hsl(0,72%,50%)" name="Outflow" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((t, i) => (
                <div key={i} className="flex items-start gap-2.5" data-testid={`row-transaction-${i}`}>
                  <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${t.type === "credit" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                    {t.type === "credit"
                      ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                      : <ArrowDownLeft className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{t.desc}</p>
                    <p className="text-xs text-muted-foreground">{t.date}</p>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${t.type === "credit" ? "text-emerald-600" : "text-red-500"}`}>
                    {t.type === "credit" ? "+" : "-"}{t.amount}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
