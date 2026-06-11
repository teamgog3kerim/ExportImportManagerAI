import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Check, X, Trash2, Ban, ShieldCheck, UserCog, Loader2, UserPlus } from "lucide-react";
import { useAuth, type AuthUser } from "@/lib/auth";
import {
  ASSIGNABLE_PAGES, ROLE_LABELS, defaultPermsForRole, type PermLevel, type Role,
} from "@shared/permissions";

interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: "pending" | "active" | "blocked";
  permissions: Record<string, PermLevel>;
  createdAt: string;
}

const LEVELS: { value: PermLevel; label: string }[] = [
  { value: "none", label: "No access" },
  { value: "view", label: "View only" },
  { value: "record", label: "View & record" },
];

function stripStatus(msg: string) {
  return msg.replace(/^\d+:\s*/, "");
}

function StatusBadge({ status }: { status: ManagedUser["status"] }) {
  if (status === "active") return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-transparent">Active</Badge>;
  if (status === "pending") return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-transparent">Pending</Badge>;
  return <Badge variant="secondary">Blocked</Badge>;
}

export default function UserManagementPanel() {
  const { toast } = useToast();
  const { user: me } = useAuth();
  const { data: users, isLoading } = useQuery<ManagedUser[]>({ queryKey: ["/api/users"] });
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/users"] });

  const { data: signupStatus } = useQuery<{ enabled: boolean }>({ queryKey: ["/api/auth/signup-status"] });
  const signupMutation = useMutation({
    mutationFn: (enabled: boolean) => apiRequest("PATCH", "/api/settings/signup", { enabled }),
    onSuccess: (_res, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/signup-status"] });
      toast({ title: enabled ? "Sign-up enabled" : "Sign-up disabled" });
    },
    onError: (e: Error) => toast({ title: "Could not update sign-up setting", description: stripStatus(e.message), variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (body: { fullName: string; email: string; password: string; role: Role }) =>
      apiRequest("POST", "/api/users", body),
    onSuccess: () => { invalidate(); setCreateOpen(false); toast({ title: "Employee added" }); },
    onError: (e: Error) => toast({ title: "Could not add employee", description: stripStatus(e.message), variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/users/${id}/approve`, {}),
    onSuccess: () => { invalidate(); toast({ title: "Employee approved" }); },
    onError: (e: Error) => toast({ title: "Could not approve", description: stripStatus(e.message), variant: "destructive" }),
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/users/${id}/reject`, {}),
    onSuccess: () => { invalidate(); toast({ title: "Request rejected" }); },
    onError: (e: Error) => toast({ title: "Could not reject", description: stripStatus(e.message), variant: "destructive" }),
  });
  const patchMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => apiRequest("PATCH", `/api/users/${id}`, body),
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast({ title: "Update failed", description: stripStatus(e.message), variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Employee removed" }); },
    onError: (e: Error) => toast({ title: "Could not remove", description: stripStatus(e.message), variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const all = users ?? [];
  const pending = all.filter((u) => u.status === "pending");
  const team = all.filter((u) => u.status !== "pending");

  return (
    <div className="space-y-6">
      {/* Public sign-up toggle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Public sign-up
          </CardTitle>
          <p className="text-xs text-muted-foreground">Control whether visitors can create their own account.</p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium" data-testid="text-signup-toggle-label">Allow new users to sign up</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {signupStatus?.enabled
                  ? "Visitors can sign up and sign in once approved."
                  : "Visitors can only request a demo."}
              </p>
            </div>
            <Switch
              checked={signupStatus?.enabled ?? false}
              onCheckedChange={(v) => signupMutation.mutate(v)}
              disabled={signupMutation.isPending || signupStatus === undefined}
              data-testid="switch-signup-enabled"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pending approvals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Pending Approvals
            {pending.length > 0 && <Badge variant="secondary" data-testid="badge-pending-count">{pending.length}</Badge>}
          </CardTitle>
          <p className="text-xs text-muted-foreground">Review employees who registered and are awaiting access.</p>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground" data-testid="text-no-pending">No pending requests.</div>
          ) : (
            <div className="space-y-2">
              {pending.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3" data-testid={`row-pending-${u.id}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-pending-name-${u.id}`}>{u.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => approveMutation.mutate(u.id)} disabled={approveMutation.isPending} data-testid={`button-approve-${u.id}`}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate(u.id)} disabled={rejectMutation.isPending} data-testid={`button-reject-${u.id}`}>
                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCog className="h-4 w-4" /> Employees
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Manage roles, page access, and account status.</p>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)} data-testid="button-add-user">
              <UserPlus className="h-3.5 w-3.5 mr-1" /> Add employee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {team.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">No employees yet.</div>
          ) : (
            <div className="space-y-2">
              {team.map((u) => {
                const isSelf = me?.id === u.id;
                return (
                  <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3" data-testid={`row-user-${u.id}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate" data-testid={`text-user-name-${u.id}`}>{u.fullName}</p>
                        {isSelf && <Badge variant="outline" className="text-[0.65rem]">You</Badge>}
                        <StatusBadge status={u.status} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select
                        value={u.role}
                        onValueChange={(role) => patchMutation.mutate({ id: u.id, body: { role, permissions: defaultPermsForRole(role as Role) } })}
                        disabled={isSelf}
                      >
                        <SelectTrigger className="h-8 w-[120px] text-xs" data-testid={`select-role-${u.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" onClick={() => setEditUser(u)} data-testid={`button-permissions-${u.id}`}>
                        Permissions
                      </Button>
                      {u.status === "active" ? (
                        <Button size="icon" variant="ghost" title="Block" disabled={isSelf} onClick={() => patchMutation.mutate({ id: u.id, body: { status: "blocked" } })} data-testid={`button-block-${u.id}`}>
                          <Ban className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="icon" variant="ghost" title="Reactivate" onClick={() => patchMutation.mutate({ id: u.id, body: { status: "active" } })} data-testid={`button-activate-${u.id}`}>
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" title="Delete" disabled={isSelf} onClick={() => deleteMutation.mutate(u.id)} data-testid={`button-delete-${u.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(body) => createMutation.mutate(body)}
        saving={createMutation.isPending}
      />

      <PermissionDialog
        user={editUser}
        onClose={() => setEditUser(null)}
        onSave={(perms) => {
          if (!editUser) return;
          patchMutation.mutate(
            { id: editUser.id, body: { permissions: perms } },
            { onSuccess: () => { setEditUser(null); toast({ title: "Permissions updated" }); } },
          );
        }}
        saving={patchMutation.isPending}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onClose,
  onCreate,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (body: { fullName: string; email: string; password: string; role: Role }) => void;
  saving: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [error, setError] = useState("");

  const reset = () => { setFullName(""); setEmail(""); setPassword(""); setRole("staff"); setError(""); };

  const submit = () => {
    setError("");
    if (fullName.trim().length < 2) return setError("Please enter the employee's full name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError("Please enter a valid email.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    onCreate({ fullName: fullName.trim(), email: email.trim(), password, role });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add employee</DialogTitle>
          <DialogDescription>
            Create an account for a new team member. They can sign in right away with the
            email and password you set here.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="create-name" className="text-xs">Full name</Label>
            <Input id="create-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Employee full name" data-testid="input-create-fullname" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-email" className="text-xs">Email</Label>
            <Input id="create-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="employee@company.com" data-testid="input-create-email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-password" className="text-xs">Temporary password</Label>
            <Input id="create-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" data-testid="input-create-password" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger data-testid="select-create-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-xs text-destructive" data-testid="text-create-error">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} data-testid="button-cancel-create">Cancel</Button>
          <Button onClick={submit} disabled={saving} data-testid="button-confirm-create">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissionDialog({
  user,
  onClose,
  onSave,
  saving,
}: {
  user: ManagedUser | null;
  onClose: () => void;
  onSave: (perms: Record<string, PermLevel>) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<Record<string, PermLevel>>({});

  const open = !!user;
  const current = (key: string): PermLevel =>
    draft[key] ?? (user?.permissions?.[key] as PermLevel) ?? "none";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) { setDraft({}); onClose(); } }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Page Access</DialogTitle>
          <DialogDescription>
            {user ? `Set what ${user.fullName} can see and edit.` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] overflow-auto space-y-1.5 py-1">
          {ASSIGNABLE_PAGES.map((p) => (
            <div key={p.key} className="flex items-center justify-between gap-3 rounded-md border p-2.5" data-testid={`perm-row-${p.key}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{p.label}</p>
                <p className="text-[0.7rem] text-muted-foreground">{p.group}</p>
              </div>
              <Select value={current(p.key)} onValueChange={(v) => setDraft((d) => ({ ...d, [p.key]: v as PermLevel }))}>
                <SelectTrigger className="h-8 w-[140px] text-xs shrink-0" data-testid={`select-perm-${p.key}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setDraft({}); onClose(); }} data-testid="button-cancel-permissions">Cancel</Button>
          <Button
            onClick={() => {
              if (!user) return;
              const merged: Record<string, PermLevel> = { ...user.permissions };
              for (const p of ASSIGNABLE_PAGES) merged[p.key] = current(p.key);
              onSave(merged);
            }}
            disabled={saving}
            data-testid="button-save-permissions"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
