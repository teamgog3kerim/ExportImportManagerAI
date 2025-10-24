import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ship, DollarSign, FileText, TrendingUp, Clock, MapPin } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Dashboard() {
  const recentShipments = [
    { id: "SH-2024-001", origin: "Shanghai", status: "in-transit" as const, eta: "2024-11-15" },
    { id: "SH-2024-002", origin: "Mumbai", status: "arrived" as const, eta: "2024-10-28" },
    { id: "SH-2024-003", origin: "Hamburg", status: "delayed" as const, eta: "2024-11-20" },
  ];

  const activeLCs = [
    { id: "LC-2024-045", bank: "HSBC", amount: "$125,000", expiry: "2025-01-15" },
    { id: "LC-2024-046", bank: "Standard Chartered", amount: "$89,500", expiry: "2024-12-20" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your import operations</p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active Shipments"
          value={12}
          icon={Ship}
          trend={{ value: 8, direction: "up" }}
        />
        <MetricCard
          title="Open LCs"
          value={5}
          icon={FileText}
          trend={{ value: 2, direction: "down" }}
        />
        <MetricCard
          title="Total Budget"
          value="$2.4M"
          icon={DollarSign}
          subtitle="$1.8M utilized"
        />
        <MetricCard
          title="Pending Clearance"
          value={3}
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentShipments.map((shipment) => (
                <div
                  key={shipment.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                  data-testid={`shipment-${shipment.id}`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-mono font-medium">{shipment.id}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      <span>{shipment.origin}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={shipment.status} />
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
            <div className="space-y-4">
              {activeLCs.map((lc) => (
                <div
                  key={lc.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                  data-testid={`lc-${lc.id}`}
                >
                  <div>
                    <p className="text-sm font-mono font-medium">{lc.id}</p>
                    <p className="text-xs text-muted-foreground mt-1">{lc.bank}</p>
                  </div>
                  <div className="text-right">
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
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Electronics</span>
                <span className="font-medium">$820K / $1M</span>
              </div>
              <Progress value={82} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Textiles</span>
                <span className="font-medium">$560K / $800K</span>
              </div>
              <Progress value={70} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Raw Materials</span>
                <span className="font-medium">$420K / $600K</span>
              </div>
              <Progress value={70} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
