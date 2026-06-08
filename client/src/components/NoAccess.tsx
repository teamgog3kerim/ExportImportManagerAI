import { Lock } from "lucide-react";

export default function NoAccess({ title = "No access" }: { title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6" data-testid="view-no-access">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        You don't have permission to view this section. Please contact your administrator if you believe
        this is a mistake.
      </p>
    </div>
  );
}
