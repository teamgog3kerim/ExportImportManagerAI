import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertBudgetCategorySchema } from "@shared/schema";
import type { BudgetCategory, InsertBudgetCategory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { MetricCard } from "@/components/MetricCard";
import { DollarSign } from "lucide-react";

const formSchema = insertBudgetCategorySchema.extend({
  allocated: z.string().min(1, "Required"),
  spent: z.string().default("0"),
});

export default function Budgets() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null);
  const { toast } = useToast();

  const { data: categories = [], isLoading } = useQuery<BudgetCategory[]>({
    queryKey: ["/api/budgets"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", allocated: "", spent: "0" },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertBudgetCategory) => apiRequest("POST", "/api/budgets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDialogOpen(false);
      form.reset();
      toast({ title: "Budget category created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertBudgetCategory> }) =>
      apiRequest("PATCH", `/api/budgets/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDialogOpen(false);
      setEditingCat(null);
      form.reset();
      toast({ title: "Budget category updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/budgets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Budget category deleted" });
    },
  });

  const openCreate = () => {
    setEditingCat(null);
    form.reset({ name: "", allocated: "", spent: "0" });
    setDialogOpen(true);
  };

  const openEdit = (cat: BudgetCategory) => {
    setEditingCat(cat);
    form.reset({ name: cat.name, allocated: cat.allocated, spent: cat.spent });
    setDialogOpen(true);
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (editingCat) {
      updateMutation.mutate({ id: editingCat.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

  const totalAllocated = categories.reduce((sum, c) => sum + Number(c.allocated), 0);
  const totalSpent = categories.reduce((sum, c) => sum + Number(c.spent), 0);
  const utilizationRate = totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(1) : "0";

  const getBudgetStatus = (allocated: number, spent: number) => {
    const pct = (spent / allocated) * 100;
    if (pct > 100) return "exceeded";
    if (pct > 90) return "warning";
    return "healthy";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Budget Management</h1>
          <p className="text-sm text-muted-foreground">Monitor spending across categories</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-budget">
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <MetricCard title="Total Allocated" value={formatCurrency(totalAllocated)} icon={DollarSign} />
        <MetricCard title="Total Spent" value={formatCurrency(totalSpent)} icon={DollarSign} />
        <MetricCard
          title="Utilization Rate"
          value={`${utilizationRate}%`}
          icon={TrendingUp}
          subtitle={`${formatCurrency(totalAllocated - totalSpent)} remaining`}
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const allocated = Number(cat.allocated);
            const spent = Number(cat.spent);
            const pct = Math.min((spent / allocated) * 100, 100);
            const status = getBudgetStatus(allocated, spent);

            return (
              <Card key={cat.id} data-testid={`budget-${cat.name.toLowerCase()}`}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-base font-semibold">{cat.name}</h3>
                        <StatusBadge status={status} />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} data-testid={`button-edit-budget-${cat.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(cat.id)} data-testid={`button-delete-budget-${cat.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{formatCurrency(spent)} spent of {formatCurrency(allocated)}</span>
                        <span className="font-medium">{((spent / allocated) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                    {spent > allocated && (
                      <p className="text-sm text-destructive">
                        Exceeded by {formatCurrency(spent - allocated)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit Budget Category" : "Add Budget Category"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Electronics" data-testid="input-category-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="allocated" render={({ field }) => (
                <FormItem>
                  <FormLabel>Allocated Budget (USD)</FormLabel>
                  <FormControl><Input {...field} placeholder="1000000" type="number" data-testid="input-allocated" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="spent" render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount Spent (USD)</FormLabel>
                  <FormControl><Input {...field} placeholder="0" type="number" data-testid="input-spent" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-budget">
                  {editingCat ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
