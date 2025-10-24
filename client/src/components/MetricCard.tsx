import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  subtitle?: string;
}

export function MetricCard({ title, value, icon: Icon, trend, subtitle }: MetricCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`metric-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold" data-testid={`value-${title.toLowerCase().replace(/\s+/g, "-")}`}>{value}</div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs mt-1 ${trend.direction === "up" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {trend.direction === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{Math.abs(trend.value)}% from last month</span>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
