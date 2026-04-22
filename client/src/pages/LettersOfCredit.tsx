import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertLcSchema } from "@shared/schema";
import type { LC, InsertLC } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function LettersOfCredit() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLC, setEditingLC] = useState<LC | null>(null);
  const { toast } = useToast();

  const { data: lcs = [], isLoading } = useQuery<LC[]>({
    queryKey: ["/api/lcs"],
  });

  const form = useForm<InsertLC>({
    resolver: zodResolver(insertLcSchema),
    defaultValues: { bank: "", beneficiary: "", amount: "", openDate: "", expiry: "", status: "open", currency: "USD" },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertLC) => apiRequest("POST", "/api/lcs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lcs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDialogOpen(false);
      form.reset();
      toast({ title: "LC created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertLC> }) =>
      apiRequest("PATCH", `/api/lcs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lcs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDialogOpen(false);
      setEditingLC(null);
      form.reset();
      toast({ title: "LC updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/lcs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lcs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "LC deleted" });
    },
  });

  const openCreate = () => {
    setEditingLC(null);
    form.reset({ bank: "", beneficiary: "", amount: "", openDate: "", expiry: "", status: "open", currency: "USD" });
    setDialogOpen(true);
  };

  const openEdit = (lc: LC) => {
    setEditingLC(lc);
    form.reset({ bank: lc.bank, beneficiary: lc.beneficiary, amount: lc.amount, openDate: lc.openDate, expiry: lc.expiry, status: lc.status, currency: lc.currency });
    setDialogOpen(true);
  };

  const onSubmit = (data: InsertLC) => {
    if (editingLC) {
      updateMutation.mutate({ id: editingLC.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = lcs.filter(
    (lc) =>
      lc.id.toLowerCase().includes(search.toLowerCase()) ||
      lc.beneficiary.toLowerCase().includes(search.toLowerCase()) ||
      lc.bank.toLowerCase().includes(search.toLowerCase())
  );

  const isExpiringSoon = (expiry: string) => {
    const daysUntil = Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil > 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Letters of Credit</h1>
          <p className="text-sm text-muted-foreground">Manage your LC portfolio</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-lc">
          <Plus className="h-4 w-4 mr-2" />
          New LC
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by LC ID, bank, or beneficiary..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-lcs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LC Number</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Beneficiary</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Open Date</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lc) => (
                  <TableRow key={lc.id} data-testid={`row-lc-${lc.id}`}>
                    <TableCell className="font-mono font-medium">{lc.id}</TableCell>
                    <TableCell>{lc.bank}</TableCell>
                    <TableCell>{lc.beneficiary}</TableCell>
                    <TableCell className="font-medium">{lc.amount}</TableCell>
                    <TableCell>{lc.openDate}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {isExpiringSoon(lc.expiry) && lc.status !== "closed" && (
                          <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                        )}
                        {lc.expiry}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={lc.status as any} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(lc)} data-testid={`button-edit-${lc.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(lc.id)} data-testid={`button-delete-${lc.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLC ? "Edit Letter of Credit" : "New Letter of Credit"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="bank" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank</FormLabel>
                    <FormControl><Input {...field} data-testid="input-bank" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="beneficiary" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beneficiary</FormLabel>
                    <FormControl><Input {...field} data-testid="input-beneficiary" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl><Input {...field} placeholder="$100,000" data-testid="input-amount" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="openDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Open Date</FormLabel>
                    <FormControl><Input {...field} placeholder="YYYY-MM-DD" data-testid="input-open-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="expiry" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl><Input {...field} placeholder="YYYY-MM-DD" data-testid="input-expiry" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-lc-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="issued">Issued</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-lc">
                  {editingLC ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
