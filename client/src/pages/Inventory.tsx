import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Package, AlertTriangle, Pencil, Trash2, Zap } from "lucide-react";
import type { InventoryItem } from "@shared/schema";

const WAREHOUSES = ["Kality A1", "Modjo Dry Port", "Addis Ababa Central", "Djibouti Free Zone", "Hawassa"];
const STOCK_STATUSES = ["In Stock", "Low Stock", "Out of Stock", "Reserved"];

function stockColor(s: string) {
  if (s === "In Stock") return "default";
  if (s === "Low Stock") return "destructive";
  if (s === "Out of Stock") return "destructive";
  if (s === "Reserved") return "secondary";
  return "secondary";
}

export default function InventoryPage() {
  const { toast } = useToast();
  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({ queryKey: ["/api/inventory"] });
  const { data: shipments = [] } = useQuery<any[]>({ queryKey: ["/api/shipments"] });
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  const emptyForm = {
    shipmentRef: "", descriptionOfGoods: "", quantityUnits: "0",
    warehouse: "Kality A1", stockStatus: "In Stock", unitSalePriceEtb: "0",
    bookedFor: "", markedSoldOut: "false",
  };
  const [form, setForm] = useState<any>(emptyForm);

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/inventory", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory"] }); setOpenModal(false); toast({ title: "Inventory item added" }); },
    onError: () => toast({ title: "Error adding item", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: any) => apiRequest("PATCH", `/api/inventory/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory"] }); setOpenModal(false); toast({ title: "Item updated" }); },
    onError: () => toast({ title: "Error updating item", variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/inventory/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/inventory"] }); toast({ title: "Item deleted" }); },
  });

  function openNew() { setEditItem(null); setForm(emptyForm); setOpenModal(true); }
  function openEdit(item: InventoryItem) { setEditItem(item); setForm({ ...item }); setOpenModal(true); }
  function submit() {
    if (editItem) updateMutation.mutate({ id: editItem.id, body: form });
    else createMutation.mutate(form);
  }
  function field(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  const filtered = items.filter(i =>
    (i.descriptionOfGoods + (i.shipmentRef ?? "") + i.warehouse).toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = items.filter(i => i.stockStatus === "Low Stock").length;
  const warehouseMap: Record<string, number> = {};
  items.forEach(i => { warehouseMap[i.warehouse] = (warehouseMap[i.warehouse] ?? 0) + 1; });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Post-clearance stock tracking and warehouse management</p>
        </div>
        <Button onClick={openNew} data-testid="button-create-inventory">
          <Plus className="h-4 w-4 mr-1.5" /> Create New Inventory
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Total SKUs</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-total-skus">{items.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Across all warehouses</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Warehouse Locations</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-warehouse-locations">{Object.keys(warehouseMap).length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Operational sites</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold mt-1 text-destructive" data-testid="text-low-stock">{lowStockCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Requires immediate attention</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search inventory..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9" data-testid="input-inventory-search"
              />
            </div>
            {lowStockCount > 0 && (
              <Badge variant="destructive" className="text-xs shrink-0">
                <AlertTriangle className="h-3 w-3 mr-1" />{lowStockCount} Low Stock Alert{lowStockCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">INV ID</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Product / Description</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Shipment Ref</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Quantity</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Warehouse</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Unit Price</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No inventory items</td></tr>
                    ) : filtered.map((item, i) => (
                      <tr key={item.id} className="border-b last:border-0 hover-elevate" data-testid={`row-inventory-${i}`}>
                        <td className="px-4 py-3 font-semibold text-primary">INV-{String(100 + i).padStart(3, "0")}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{item.descriptionOfGoods}</p>
                          {item.bookedFor && <p className="text-muted-foreground">BOOKED: {item.bookedFor.toUpperCase()}</p>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{item.shipmentRef ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-medium">{item.quantityUnits} units</td>
                        <td className="px-4 py-3">{item.warehouse}</td>
                        <td className="px-4 py-3">
                          <Badge variant={stockColor(item.stockStatus ?? "In Stock") as any}>{item.stockStatus}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{item.unitSalePriceEtb} ETB</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(item)} data-testid={`button-edit-inventory-${i}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-inventory-${i}`}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Alerts */}
          {items.some(i => i.stockStatus === "Low Stock") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-600" /> Inventory Alerts</span>
                  <Badge variant="secondary" className="text-xs">{lowStockCount} Action Item{lowStockCount > 1 ? "s" : ""}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.filter(i => i.stockStatus === "Low Stock").map((item, i) => (
                    <div key={item.id} className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-xs font-bold text-destructive">LOW STOCK ALERT</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.descriptionOfGoods} is down to {item.quantityUnits} units in {item.warehouse}. Reorder recommended.</p>
                      <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-1">View Details</Button>
                    </div>
                  ))}
                  {items.filter(i => i.bookedFor).map((item, i) => (
                    <div key={`booked-${item.id}`} className="rounded-md bg-muted p-3">
                      <div className="flex items-start justify-between gap-1 flex-wrap">
                        <p className="text-xs font-bold">RESERVED STOCK</p>
                        <Badge variant="secondary" className="text-xs">Booked</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.quantityUnits} units of {item.descriptionOfGoods} are reserved for "{item.bookedFor}".</p>
                      <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-1">Manage Booking</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {/* Stock Forecasting */}
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4" />
                <p className="text-sm font-semibold">Stock Forecasting</p>
              </div>
              <p className="text-xs opacity-80">AI recommends ordering 400 units of "Motor Parts X-10" by May 15th to maintain supply levels.</p>
              <Button variant="outline" size="sm" className="mt-3 w-full text-xs bg-white/10 border-white/20 text-primary-foreground">
                Generate Reorder Plan
              </Button>
            </CardContent>
          </Card>

          {/* Warehouse Utilization */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Warehouse Utilization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Kality A1", pct: 84 },
                { name: "Modjo Dry Port", pct: 62 },
                { name: "Addis Ababa Central", pct: 45 },
              ].map(w => (
                <div key={w.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{w.name}</span>
                    <span className="text-muted-foreground">{w.pct}% Capacity</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${w.pct > 80 ? "bg-amber-500" : "bg-primary"}`}
                      style={{ width: `${w.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              {editItem ? `Update Inventory Item` : "Create Inventory Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editItem && shipments.length > 0 && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" /> Import from Eligible Shipments
                </p>
                <p className="text-xs text-muted-foreground mb-2">Select a shipment that has arrived at port or warehouse.</p>
                <Select onValueChange={ref => {
                  const s = shipments.find((sh: any) => sh.id === ref);
                  if (s) {
                    field("shipmentRef", s.billNumber ?? ref);
                    field("descriptionOfGoods", s.descriptionOfGoods ?? "");
                  }
                }}>
                  <SelectTrigger className="text-xs" data-testid="select-shipment-ref">
                    <SelectValue placeholder="Select an eligible shipment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {shipments.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.origin} → {s.destination} ({s.status})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Shipment Reference</Label>
                <Input value={form.shipmentRef ?? ""} onChange={e => field("shipmentRef", e.target.value)} placeholder="SHP-001" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Storage Warehouse</Label>
                <Select value={form.warehouse} onValueChange={v => field("warehouse", v)}>
                  <SelectTrigger data-testid="select-warehouse"><SelectValue /></SelectTrigger>
                  <SelectContent>{WAREHOUSES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Description of Goods</Label>
                <Input value={form.descriptionOfGoods} onChange={e => field("descriptionOfGoods", e.target.value)} placeholder="Product details..." data-testid="input-inv-description" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantity Units</Label>
                <Input type="number" value={form.quantityUnits} onChange={e => field("quantityUnits", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Stock Status</Label>
                <Select value={form.stockStatus} onValueChange={v => field("stockStatus", v)}>
                  <SelectTrigger data-testid="select-stock-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{STOCK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit Sales Price (ETB)</Label>
                <Input type="number" value={form.unitSalePriceEtb} onChange={e => field("unitSalePriceEtb", e.target.value)} data-testid="input-unit-price" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Booked For (Client/Project)</Label>
                <Input value={form.bookedFor ?? ""} onChange={e => field("bookedFor", e.target.value)} placeholder="e.g. ABC Corp" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.markedSoldOut === "true"}
                onCheckedChange={v => field("markedSoldOut", String(v))}
                data-testid="checkbox-sold-out"
              />
              <Label className="text-xs">Mark as Sold Out — Check this if all items in this batch are already sold.</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-inventory">
              {editItem ? "Save Updates" : "Add to Inventory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
