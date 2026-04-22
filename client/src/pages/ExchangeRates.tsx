import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Building2 } from "lucide-react";
import type { ExchangeRate } from "@shared/schema";

export default function ExchangeRates() {
  const { data: rates = [], isLoading } = useQuery<ExchangeRate[]>({ queryKey: ["/api/exchange-rates"] });
  const [amount, setAmount] = useState("1000");

  const bestBuy = rates.length > 0 ? rates.reduce((max, r) => Number(r.buyingEtb) > Number(max.buyingEtb) ? r : max) : null;
  const bestSell = rates.length > 0 ? rates.reduce((max, r) => Number(r.sellingEtb) > Number(max.sellingEtb) ? r : max) : null;
  const avg = rates.length > 0 ? rates.reduce((s, r) => s + Number(r.buyingEtb), 0) / rates.length : 0;

  const usdAmount = Number(amount) || 0;
  const etbEquivalent = bestBuy ? usdAmount * Number(bestBuy.buyingEtb) : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exchange Rates</h1>
        <p className="text-sm text-muted-foreground">Addis Fortune Exchange Board — Ethiopian Bank Rates (USD/ETB)</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Best Market Buy (USD)</p>
            <p className="text-xl font-bold mt-1 text-emerald-600" data-testid="text-best-buy-rate">
              {bestBuy ? Number(bestBuy.buyingEtb).toFixed(4) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{bestBuy?.bankName ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Best Market Sell (USD)</p>
            <p className="text-xl font-bold mt-1 text-red-500" data-testid="text-best-sell-rate">
              {bestSell ? Number(bestSell.sellingEtb).toFixed(4) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{bestSell?.bankName ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Addis Fortune Avg</p>
            <p className="text-xl font-bold mt-1" data-testid="text-avg-rate">{avg ? avg.toFixed(4) : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Market mid-rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Monitored Banks</p>
            <p className="text-xl font-bold mt-1" data-testid="text-monitored-banks">{rates.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active rate feeds</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bank Rates Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Addis Fortune Exchange Board
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-9 bg-muted animate-pulse rounded" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Bank Name</th>
                      <th className="text-right py-2 pr-4 font-semibold text-muted-foreground">Code</th>
                      <th className="text-right py-2 pr-4 font-semibold text-emerald-600">Buying ETB</th>
                      <th className="text-right py-2 font-semibold text-red-500">Selling ETB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((r, idx) => (
                      <tr key={r.id} className="border-b last:border-0 hover-elevate" data-testid={`row-rate-${idx}`}>
                        <td className="py-2 pr-4 font-medium">{r.bankName}</td>
                        <td className="py-2 pr-4 text-right">
                          <Badge variant="secondary" className="text-xs">{r.bankCode}</Badge>
                        </td>
                        <td className="py-2 pr-4 text-right text-emerald-600 font-medium flex items-center justify-end gap-0.5">
                          <ArrowUpRight className="h-3 w-3" />{Number(r.buyingEtb).toFixed(4)}
                        </td>
                        <td className="py-2 text-right text-red-500 font-medium">
                          <span className="flex items-center justify-end gap-0.5">
                            <ArrowDownRight className="h-3 w-3" />{Number(r.sellingEtb).toFixed(4)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Smart Converter */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Smart Converter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">USD Amount</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter USD amount"
                  className="text-sm"
                  data-testid="input-usd-amount"
                />
              </div>
              <div className="rounded-md bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">ETB Equivalent (Best Buy)</p>
                <p className="text-xl font-bold text-primary mt-1" data-testid="text-etb-equivalent">
                  ETB {etbEquivalent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Rate: {bestBuy ? Number(bestBuy.buyingEtb).toFixed(4) : "—"} ({bestBuy?.bankName ?? "—"})</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold mb-2">Market Insight</p>
              <p className="text-xs text-muted-foreground">
                The ETB/USD rate has been relatively stable this week. Amhara Bank offers the best buying rate.
                NBE (National Bank of Ethiopia) sets the reference rate floor for all commercial transactions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
