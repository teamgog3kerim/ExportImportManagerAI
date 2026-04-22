import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Ship, DollarSign, FileText, Clock, MapPin } from "lucide-react";
import type { Shipment, LC, BudgetCategory } from "@shared/schema";

interface DashboardData {
  activeShipments: number;
  inTransit: number;
  delayed: number;
  pendingClearance: number;
  openLCs: number;
  totalBudget: number;
  totalSpent: number;
  recentShipments: Shipment[];
  activeLCList: LC[];
  budgetCategories: BudgetCategory[];
}

export default function Dashboard() {
  // todo: remove mock functionality - replace with real API
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-md" />
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your import operations</p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Shipments"
          value={data?.activeShipments ?? 0}
          icon={Ship}
          subtitle={`${data?.inTransit ?? 0} in transit, ${data?.delayed ?? 0} delayed`}
        />
        <MetricCard
          title="Open LCs"
          value={data?.openLCs ?? 0}
          icon={FileText}
        />
        <MetricCard
          title="Total Budget"
          value={formatCurrency(data?.totalBudget ?? 0)}
          icon={DollarSign}
          subtitle={`${formatCurrency(data?.totalSpent ?? 0)} utilized`}
        />
        <MetricCard
          title="Pending Clearance"
          value={data?.pendingClearance ?? 0}
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.recentShipments?.map((shipment) => (
                <div
                  key={shipment.id}
                  className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                  data-testid={`shipment-${shipment.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium">{shipment.id}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{shipment.origin} → {shipment.destination}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
                    <StatusBadge status={shipment.status as any} />
                    <span className="text-xs text-muted-foreground">ETA: {shipment.eta}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Active Letters of Credit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.activeLCList?.map((lc) => (
                <div
                  key={lc.id}
                  className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                  data-testid={`lc-${lc.id}`}
                >
                  <div>
                    <p className="text-sm font-mono font-medium">{lc.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{lc.bank} · {lc.beneficiary}</p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-sm font-semibold">{lc.amount}</p>
                    <p className="text-xs text-muted-foreground">Exp: {lc.expiry}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Budget Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.budgetCategories?.map((cat) => {
              const pct = Math.min((Number(cat.spent) / Number(cat.allocated)) * 100, 100);
              return (
                <div key={cat.id}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span>{cat.name}</span>
                    <span className="font-medium text-muted-foreground">
                      {formatCurrency(Number(cat.spent))} / {formatCurrency(Number(cat.allocated))}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
