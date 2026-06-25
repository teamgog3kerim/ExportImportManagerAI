import { Fragment, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, ShoppingBag, Trash2, ScanLine, Receipt, Coins, Boxes,
  X, CheckCircle2, ChevronDown, ChevronRight, PackageCheck, BadgeCheck,
} from "lucide-react";
import type { Sale, SaleLineItem, AvailableSerial } from "@shared/schema";
import { useAuth, canRecord } from "@/lib/auth";

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Telebirr", "Cheque", "Credit"];
const PAYMENT_STATUSES = ["Paid", "Partial", "Unpaid"];
const SALE_STATUSES = ["Completed", "Pending Delivery", "Delivered", "Cancelled"];
const VAT_RATE = 0.15;

function money(v: any) {
  const n = Number(v) || 0;
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function payColor(s: string) {
  if (s === "Paid") return "default";
  if (s === "Partial") return "secondary";
  return "destructive";
}

export default function Sales() {
  const { user } = useAuth();
  const writable = canRecord(user, "import-sales");
  const { toast } = useToast();
  const { data: sales = [], isLoading } = useQuery<Sale[]>({ queryKey: ["/api/sales"] });
  const { data: available = [] } = useQuery<AvailableSerial[]>({ queryKey: ["/api/sales/available-serials"] });

  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [trace, setTrace] = useState("");

  // ---- New sale form state ----
  const today = new Date().toISOString().slice(0, 10);
  const emptyForm = {
    saleRef: "",
    customerName: "",
    customerContact: "",
    customerTin: "",
    saleDate: today,
    paymentMethod: "Cash",
    paymentStatus: "Paid",
    status: "Completed",
    discountEtb: "0",
    notes: "",
  };
  const [form, setForm] = useState<any>(emptyForm);
  const [picked, setPicked] = useState<Record<string, SaleLineItem>>({});
  const [serialSearch, setSerialSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");

  function field(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/sales", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/available-serials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setOpenModal(false);
      toast({ title: "Sale recorded", description: "Serial numbers marked as sold and stock updated." });
    },
    onError: (e: any) => toast({ title: "Could not record sale", description: e?.message ?? undefined, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales/available-serials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Sale reversed", description: "Serials released back into available stock." });
    },
  });
  const payMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiRequest("PATCH", `/api/sales/${id}`, { paymentStatus: status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/sales"] }); toast({ title: "Payment status updated" }); },
  });

  function openNew() {
    setForm({ ...emptyForm, saleRef: `SALE-${Date.now().toString().slice(-6)}` });
    setPicked({});
    setSerialSearch("");
    setWarehouseFilter("all");
    setOpenModal(true);
  }

  function toggleSerial(s: AvailableSerial) {
    setPicked(prev => {
      const next = { ...prev };
      if (next[s.serialNumber]) {
        delete next[s.serialNumber];
      } else {
        next[s.serialNumber] = {
          inventoryId: s.inventoryId,
          serialNumber: s.serialNumber,
          descriptionOfGoods: s.descriptionOfGoods,
          warehouse: s.warehouse,
          unitPriceEtb: s.unitSalePriceEtb ?? "0",
        };
      }
      return next;
    });
  }
  function setLinePrice(serial: string, price: string) {
    setPicked(prev => ({ ...prev, [serial]: { ...prev[serial], unitPriceEtb: price } }));
  }

  const lines = Object.values(picked);
  const subtotal = lines.reduce((sum, l) => sum + (Number(l.unitPriceEtb) || 0), 0);
  const discount = Number(form.discountEtb) || 0;
  const taxable = Math.max(0, subtotal - discount);
  const vat = taxable * VAT_RATE;
  const total = taxable + vat;

  const warehouses = useMemo(() => Array.from(new Set(available.map(a => a.warehouse))), [available]);
  const filteredSerials = available.filter(a => {
    const matchWh = warehouseFilter === "all" || a.warehouse === warehouseFilter;
    const q = serialSearch.toLowerCase();
    const matchQ = !q || a.serialNumber.toLowerCase().includes(q) || a.descriptionOfGoods.toLowerCase().includes(q);
    return matchWh && matchQ;
  });

  function submit() {
    if (!form.customerName.trim()) { toast({ title: "Customer name required", variant: "destructive" }); return; }
    if (lines.length === 0) { toast({ title: "Select at least one serial number", variant: "destructive" }); return; }
    createMutation.mutate({
      ...form,
      items: JSON.stringify(lines),
      subtotalEtb: String(subtotal),
      discountEtb: String(discount),
      vatEtb: vat.toFixed(2),
      totalEtb: total.toFixed(2),
    });
  }

  // ---- Derived stats ----
  const totalRevenue = sales.reduce((s, sale) => s + (Number(sale.totalEtb) || 0), 0);
  const unitsSold = sales.reduce((s, sale) => {
    try { return s + (JSON.parse(sale.items || "[]") as any[]).length; } catch { return s; }
  }, 0);
  const outstanding = sales.filter(s => s.paymentStatus !== "Paid").length;

  const filteredSales = sales.filter(s =>
    (s.saleRef + s.customerName + (s.customerTin ?? "")).toLowerCase().includes(search.toLowerCase())
  );

  // ---- Serial tracer ----
  const traceResult = useMemo(() => {
    const q = trace.trim().toLowerCase();
    if (!q) return null;
    const avail = available.find(a => a.serialNumber.toLowerCase() === q);
    if (avail) return { state: "available" as const, avail };
    for (const sale of sales) {
      try {
        const items = JSON.parse(sale.items || "[]") as SaleLineItem[];
        const hit = items.find(it => it.serialNumber.toLowerCase() === q);
        if (hit) return { state: "sold" as const, sale, hit };
      } catch { /* ignore */ }
    }
    return { state: "notfound" as const };
  }, [trace, available, sales]);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        eyebrow="Import"
        title="Sales"
        description="Sell cleared inventory by serial number with full traceability"
        actions={writable && (
          <Button onClick={openNew} data-testid="button-new-sale">
            <Plus className="h-4 w-4 mr-1.5" /> New Sale
          </Button>
        )}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-total-sales">{sales.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{outstanding} awaiting payment</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center"><Receipt className="h-4 w-4 text-primary" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Revenue (ETB)</p>
                <p className="text-2xl font-bold mt-1 font-mono" data-testid="text-sales-revenue">{money(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Gross incl. VAT</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center"><Coins className="h-4 w-4 text-emerald-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Units Sold</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-units-sold">{unitsSold}</p>
                <p className="text-xs text-muted-foreground mt-0.5">By serial number</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center"><PackageCheck className="h-4 w-4 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Available Serials</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-available-serials">{available.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">In stock & sellable</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center"><Boxes className="h-4 w-4 text-amber-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search sales by ref, customer or TIN..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9" data-testid="input-sales-search"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Sale Ref</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Customer</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Date</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Units</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total (ETB)</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Payment</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                    ) : filteredSales.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No sales recorded yet</td></tr>
                    ) : filteredSales.map((sale) => {
                      let items: SaleLineItem[] = [];
                      try { items = JSON.parse(sale.items || "[]"); } catch { /* ignore */ }
                      const isOpen = expanded === sale.id;
                      return (
                        <Fragment key={sale.id}>
                          <tr className="border-b hover-elevate" data-testid={`row-sale-${sale.id}`}>
                            <td className="px-4 py-3">
                              <button
                                className="flex items-center gap-1 font-semibold text-primary"
                                onClick={() => setExpanded(isOpen ? null : sale.id)}
                                data-testid={`button-expand-sale-${sale.id}`}
                              >
                                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                {sale.saleRef}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{sale.customerName}</p>
                              {sale.customerTin && <p className="text-muted-foreground">TIN: {sale.customerTin}</p>}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{sale.saleDate}</td>
                            <td className="px-4 py-3 text-right font-medium">{items.length}</td>
                            <td className="px-4 py-3 text-right font-mono font-medium">{money(sale.totalEtb)}</td>
                            <td className="px-4 py-3">
                              <Badge variant={payColor(sale.paymentStatus ?? "Unpaid") as any}>{sale.paymentStatus}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {writable && sale.paymentStatus !== "Paid" && (
                                  <Button size="icon" variant="ghost" title="Mark as paid"
                                    onClick={() => payMutation.mutate({ id: sale.id, status: "Paid" })}
                                    data-testid={`button-mark-paid-${sale.id}`}>
                                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                                  </Button>
                                )}
                                {writable && (
                                  <Button size="icon" variant="ghost" title="Reverse sale"
                                    onClick={() => deleteMutation.mutate(sale.id)}
                                    data-testid={`button-delete-sale-${sale.id}`}>
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr key={`${sale.id}-detail`} className="border-b bg-muted/40">
                              <td colSpan={7} className="px-4 py-3">
                                <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                                  <ScanLine className="h-3.5 w-3.5 text-primary" /> Serial Numbers Sold
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {items.map(it => (
                                    <Badge key={it.serialNumber} variant="secondary" className="font-mono text-[0.7rem]" data-testid={`badge-serial-${it.serialNumber}`}>
                                      {it.serialNumber} · {it.descriptionOfGoods} · {money(it.unitPriceEtb)} ETB
                                    </Badge>
                                  ))}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                                  <div><span className="text-muted-foreground">Subtotal:</span> <span className="font-mono">{money(sale.subtotalEtb)}</span></div>
                                  <div><span className="text-muted-foreground">Discount:</span> <span className="font-mono">{money(sale.discountEtb)}</span></div>
                                  <div><span className="text-muted-foreground">VAT (15%):</span> <span className="font-mono">{money(sale.vatEtb)}</span></div>
                                  <div><span className="text-muted-foreground">Method:</span> {sale.paymentMethod}</div>
                                </div>
                                {sale.notes && <p className="text-xs text-muted-foreground mt-2">Note: {sale.notes}</p>}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Serial Tracer */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ScanLine className="h-4 w-4 text-primary" /> Serial Number Tracer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Enter a serial number..."
                  value={trace} onChange={e => setTrace(e.target.value)}
                  className="pl-9 font-mono" data-testid="input-trace-serial"
                />
              </div>
              {traceResult && traceResult.state === "available" && (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3" data-testid="trace-result-available">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> IN STOCK — Available
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{traceResult.avail.descriptionOfGoods}</p>
                  <p className="text-xs text-muted-foreground">Warehouse: {traceResult.avail.warehouse}</p>
                  <p className="text-xs text-muted-foreground">List price: {money(traceResult.avail.unitSalePriceEtb)} ETB</p>
                </div>
              )}
              {traceResult && traceResult.state === "sold" && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3" data-testid="trace-result-sold">
                  <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5" /> SOLD
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{traceResult.hit.descriptionOfGoods}</p>
                  <p className="text-xs text-muted-foreground">Sale: {traceResult.sale.saleRef} → {traceResult.sale.customerName}</p>
                  <p className="text-xs text-muted-foreground">Date: {traceResult.sale.saleDate} · {money(traceResult.hit.unitPriceEtb)} ETB</p>
                </div>
              )}
              {traceResult && traceResult.state === "notfound" && (
                <div className="rounded-md bg-muted p-3" data-testid="trace-result-notfound">
                  <p className="text-xs text-muted-foreground">No matching serial number found in inventory or sales.</p>
                </div>
              )}
              {!traceResult && (
                <p className="text-xs text-muted-foreground">Trace any serial to see whether it is still in stock or which sale and customer it went to.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Sale Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" /> New Sale
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Customer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Sale Reference</Label>
                <Input value={form.saleRef} onChange={e => field("saleRef", e.target.value)} data-testid="input-sale-ref" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sale Date</Label>
                <Input type="date" value={form.saleDate} onChange={e => field("saleDate", e.target.value)} data-testid="input-sale-date" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Customer Name *</Label>
                <Input value={form.customerName} onChange={e => field("customerName", e.target.value)} placeholder="e.g. ABC Trading PLC" data-testid="input-customer-name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Customer Contact</Label>
                <Input value={form.customerContact} onChange={e => field("customerContact", e.target.value)} placeholder="Phone / email" data-testid="input-customer-contact" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Customer TIN</Label>
                <Input value={form.customerTin} onChange={e => field("customerTin", e.target.value)} placeholder="Tax ID" data-testid="input-customer-tin" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sale Status</Label>
                <Select value={form.status} onValueChange={v => field("status", v)}>
                  <SelectTrigger data-testid="select-sale-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{SALE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Serial selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <ScanLine className="h-3.5 w-3.5 text-primary" /> Select Serial Numbers from Available Inventory
                </Label>
                <Badge variant="secondary" className="text-xs">{lines.length} selected</Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search serial or product..."
                    value={serialSearch} onChange={e => setSerialSearch(e.target.value)}
                    className="pl-9 h-9" data-testid="input-serial-search"
                  />
                </div>
                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                  <SelectTrigger className="w-[180px] h-9" data-testid="select-warehouse-filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Warehouses</SelectItem>
                    {warehouses.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border max-h-52 overflow-y-auto">
                {filteredSerials.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No available serial numbers match.</p>
                ) : (
                  <table className="w-full text-xs">
                    <tbody>
                      {filteredSerials.slice(0, 200).map(s => {
                        const checked = !!picked[s.serialNumber];
                        return (
                          <tr key={`${s.inventoryId}-${s.serialNumber}`} className="border-b last:border-0 hover-elevate" data-testid={`row-serial-${s.serialNumber}`}>
                            <td className="px-3 py-2 w-8">
                              <Checkbox checked={checked} onCheckedChange={() => toggleSerial(s)} data-testid={`checkbox-serial-${s.serialNumber}`} />
                            </td>
                            <td className="px-2 py-2 font-mono font-medium">{s.serialNumber}</td>
                            <td className="px-2 py-2">{s.descriptionOfGoods}</td>
                            <td className="px-2 py-2 text-muted-foreground">{s.warehouse}</td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">{money(s.unitSalePriceEtb)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              {filteredSerials.length > 200 && (
                <p className="text-[0.7rem] text-muted-foreground">Showing first 200 — refine your search to see more.</p>
              )}
            </div>

            {/* Selected line items with editable prices */}
            {lines.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Order Lines</Label>
                <div className="rounded-md border divide-y">
                  {lines.map(l => (
                    <div key={l.serialNumber} className="flex items-center gap-2 px-3 py-2 flex-wrap" data-testid={`line-${l.serialNumber}`}>
                      <div className="flex-1 min-w-[160px]">
                        <p className="text-xs font-mono font-medium">{l.serialNumber}</p>
                        <p className="text-[0.7rem] text-muted-foreground">{l.descriptionOfGoods}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Label className="text-[0.7rem] text-muted-foreground">Price ETB</Label>
                        <Input
                          type="number" value={l.unitPriceEtb}
                          onChange={e => setLinePrice(l.serialNumber, e.target.value)}
                          className="h-8 w-28 font-mono" data-testid={`input-line-price-${l.serialNumber}`}
                        />
                        <Button size="icon" variant="ghost" onClick={() => toggleSerial({ ...l, shipmentRef: null, unitSalePriceEtb: l.unitPriceEtb } as any)} data-testid={`button-remove-line-${l.serialNumber}`}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment & totals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Payment Method</Label>
                    <Select value={form.paymentMethod} onValueChange={v => field("paymentMethod", v)}>
                      <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Payment Status</Label>
                    <Select value={form.paymentStatus} onValueChange={v => field("paymentStatus", v)}>
                      <SelectTrigger data-testid="select-payment-status"><SelectValue /></SelectTrigger>
                      <SelectContent>{PAYMENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Discount (ETB)</Label>
                  <Input type="number" value={form.discountEtb} onChange={e => field("discountEtb", e.target.value)} className="font-mono" data-testid="input-discount" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={form.notes} onChange={e => field("notes", e.target.value)} placeholder="Delivery, warranty, remarks..." className="resize-none" rows={2} data-testid="input-sale-notes" />
                </div>
              </div>

              <div className="rounded-md bg-muted p-4 space-y-2 self-start">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{money(subtotal)} ETB</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">Discount</span><span className="font-mono">- {money(discount)} ETB</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">VAT (15%)</span><span className="font-mono">{money(vat)} ETB</span></div>
                <div className="border-t pt-2 flex justify-between text-sm font-bold"><span>Total</span><span className="font-mono" data-testid="text-sale-total">{money(total)} ETB</span></div>
                <p className="text-[0.7rem] text-muted-foreground pt-1">{lines.length} unit{lines.length !== 1 ? "s" : ""} · traced by serial number</p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)} data-testid="button-cancel-sale">Cancel</Button>
            {writable && (
              <Button onClick={submit} disabled={createMutation.isPending} data-testid="button-submit-sale">
                Record Sale
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
