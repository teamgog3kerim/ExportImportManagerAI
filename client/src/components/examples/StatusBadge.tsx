import { StatusBadge } from "../StatusBadge";

export default function StatusBadgeExample() {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      <StatusBadge status="in-transit" />
      <StatusBadge status="arrived" />
      <StatusBadge status="delayed" />
      <StatusBadge status="cleared" />
      <StatusBadge status="open" />
      <StatusBadge status="issued" />
      <StatusBadge status="confirmed" />
      <StatusBadge status="closed" />
    </div>
  );
}
