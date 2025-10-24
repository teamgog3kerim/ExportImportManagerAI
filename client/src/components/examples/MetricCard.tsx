import { MetricCard } from "../MetricCard";
import { Ship, DollarSign, FileText } from "lucide-react";

export default function MetricCardExample() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3 p-4">
      <MetricCard
        title="Active Shipments"
        value={12}
        icon={Ship}
        trend={{ value: 8, direction: "up" }}
      />
      <MetricCard
        title="Total Budget"
        value="$2.4M"
        icon={DollarSign}
        subtitle="$1.8M utilized"
      />
      <MetricCard
        title="Open LCs"
        value={5}
        icon={FileText}
        trend={{ value: 2, direction: "down" }}
      />
    </div>
  );
}
