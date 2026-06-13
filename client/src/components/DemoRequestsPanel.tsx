import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, Building2, Briefcase, Loader2, Trash2, Check, Inbox } from "lucide-react";
import type { DemoRequest } from "@shared/schema";

const CATEGORY_LABELS: Record<string, string> = {
  export: "Export",
  import: "Import",
  export_import: "Export and Import",
  other: "Other",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function DemoRequestsPanel() {
  const { toast } = useToast();
  const { data: requests, isLoading } = useQuery<DemoRequest[]>({
    queryKey: ["/api/demo-requests"],
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/demo-requests/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demo-requests"] });
    },
    onError: (err: any) => {
      toast({ title: "Could not update", description: err?.message?.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/demo-requests/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/demo-requests"] });
      toast({ title: "Demo request deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Could not delete", description: err?.message?.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="py-10 flex items-center justify-center text-muted-foreground" data-testid="loader-demo-requests">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const list = requests ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight" data-testid="text-demo-requests-title">Demo requests</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Requests submitted by prospective clients from the public sign-up page. Reach back to
          arrange a demo, then mark them as contacted.
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center justify-center text-center gap-2">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-demo-requests">No demo requests yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map(req => (
            <Card key={req.id} data-testid={`card-demo-request-${req.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base" data-testid={`text-demo-name-${req.id}`}>{req.fullName}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-demo-date-${req.id}`}>{formatDate(req.createdAt)}</p>
                </div>
                <Badge variant={req.status === "contacted" ? "secondary" : "default"} data-testid={`badge-demo-status-${req.id}`}>
                  {req.status === "contacted" ? "Contacted" : "New"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span data-testid={`text-demo-company-${req.id}`}>{req.companyName}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span data-testid={`text-demo-position-${req.id}`}>{req.position}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${req.email}`} target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline truncate" data-testid={`link-demo-email-${req.id}`}>{req.email}</a>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${req.phone}`} className="text-foreground hover:underline" data-testid={`link-demo-phone-${req.id}`}>{req.phone}</a>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" data-testid={`badge-demo-category-${req.id}`}>
                    {CATEGORY_LABELS[req.companyCategory] ?? req.companyCategory}
                  </Badge>
                  {req.companyCategory === "other" && req.categoryOther && (
                    <span className="text-sm text-muted-foreground" data-testid={`text-demo-category-other-${req.id}`}>
                      {req.categoryOther}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  {req.status === "new" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: req.id, status: "contacted" })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-mark-contacted-${req.id}`}
                    >
                      <Check className="h-4 w-4 mr-1.5" /> Mark contacted
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => statusMutation.mutate({ id: req.id, status: "new" })}
                      disabled={statusMutation.isPending}
                      data-testid={`button-mark-new-${req.id}`}
                    >
                      Mark as new
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(req.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-demo-${req.id}`}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
