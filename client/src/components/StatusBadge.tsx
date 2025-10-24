import { Badge } from "@/components/ui/badge";
import { Circle } from "lucide-react";

type StatusType = "in-transit" | "arrived" | "delayed" | "cleared" | "open" | "issued" | "confirmed" | "closed" | "healthy" | "warning" | "exceeded";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  "in-transit": { label: "In Transit", className: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  "arrived": { label: "Arrived", className: "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300" },
  "delayed": { label: "Delayed", className: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300" },
  "cleared": { label: "Cleared", className: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
  "open": { label: "Open", className: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  "issued": { label: "Issued", className: "bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" },
  "confirmed": { label: "Confirmed", className: "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300" },
  "closed": { label: "Closed", className: "bg-gray-500/10 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300" },
  "healthy": { label: "Healthy", className: "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-300" },
  "warning": { label: "Warning", className: "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300" },
  "exceeded": { label: "Exceeded", className: "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300" },
};

export function StatusBadge({ status }: { status: StatusType }) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={`${config.className} border-0`} data-testid={`status-${status}`}>
      <Circle className="w-2 h-2 mr-1 fill-current" />
      {config.label}
    </Badge>
  );
}
