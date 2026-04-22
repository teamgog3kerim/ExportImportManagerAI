import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
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
import { insertShipmentSchema } from "@shared/schema";
import type { Shipment, InsertShipment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Shipments() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const { toast } = useToast();

  const { data: shipments = [], isLoading } = useQuery<Shipment[]>({
    queryKey: ["/api/shipments"],
  });

  const form = useForm<InsertShipment>({
    resolver: zodResolver(insertShipmentSchema),
    defaultValues: {
      supplier: "", origin: "", destination: "", status: "in-transit", eta: "", value: "", description: "", lcId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertShipment) => apiRequest("POST", "/api/shipments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDialogOpen(false);
      form.reset();
      toast({ title: "Shipment created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertShipment> }) =>
      apiRequest("PATCH", `/api/shipments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDialogOpen(false);
      setEditingShipment(null);
      form.reset();
      toast({ title: "Shipment updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/shipments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Shipment deleted" });
    },
  });

  const openCreate = () => {
    setEditingShipment(null);
    form.reset({ supplier: "", origin: "", destination: "", status: "in-transit", eta: "", value: "", description: "", lcId: "" });
    setDialogOpen(true);
  };

  const openEdit = (s: Shipment) => {
    setEditingShipment(s);
    form.reset({ supplier: s.supplier, origin: s.origin, destination: s.destination, status: s.status, eta: s.eta, value: s.value, description: s.description ?? "", lcId: s.lcId ?? "" });
    setDialogOpen(true);
  };

  const onSubmit = (data: InsertShipment) => {
    if (editingShipment) {
      updateMutation.mutate({ id: editingShipment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = shipments.filter(
    (s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.supplier.toLowerCase().includes(search.toLowerCase()) ||
      s.origin.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Shipments</h1>
          <p className="text-sm text-muted-foreground">Track and manage your shipments</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-shipment">
          <Plus className="h-4 w-4 mr-2" />
          Add Shipment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, supplier, or origin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-shipments"
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
                  <TableHead>Shipment ID</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} data-testid={`row-shipment-${s.id}`}>
                    <TableCell className="font-mono font-medium">{s.id}</TableCell>
                    <TableCell>{s.supplier}</TableCell>
                    <TableCell>{s.origin}</TableCell>
                    <TableCell>{s.destination}</TableCell>
                    <TableCell><StatusBadge status={s.status as any} /></TableCell>
                    <TableCell>{s.eta}</TableCell>
                    <TableCell className="text-right font-medium">{s.value}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)} data-testid={`button-edit-${s.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)} data-testid={`button-delete-${s.id}`}>
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
            <DialogTitle>{editingShipment ? "Edit Shipment" : "Add Shipment"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="supplier" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <FormControl><Input {...field} data-testid="input-supplier" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="value" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl><Input {...field} placeholder="$100,000" data-testid="input-value" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="origin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin</FormLabel>
                    <FormControl><Input {...field} data-testid="input-origin" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="destination" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <FormControl><Input {...field} data-testid="input-destination" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="eta" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ETA</FormLabel>
                    <FormControl><Input {...field} placeholder="YYYY-MM-DD" data-testid="input-eta" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="in-transit">In Transit</SelectItem>
                        <SelectItem value="arrived">Arrived</SelectItem>
                        <SelectItem value="delayed">Delayed</SelectItem>
                        <SelectItem value="cleared">Cleared</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-shipment">
                  {editingShipment ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
