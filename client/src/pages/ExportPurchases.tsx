import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Search, ShoppingCart, Pencil, Trash2, Wheat, Package, DollarSign } from "lucide-react";
import type { ExportPurchase, Supplier } from "@shared/schema";

const CATEGORIES = ["Coffee", "Sesame", "Leather", "Pulses", "Spices", "Oilseeds", "Cereals", "Khat", "Honey", "Other"];
const QUALITY_GRADES = ["Grade 1", "Grade 2", "Grade 3", "Premium", "Specialty", "Standard", "Grade A", "Grade B"];
const WAREHOUSES = ["Modjo Dry Port", "Addis Ababa Central", "Awasa Hub", "Kality A1", "Dire Dawa Warehouse"];
const STATUSES = ["Sourced", "In Storage", "Quality Inspected", "Ready for Export", "Shipped"];
const PAYMENT_STATUS = ["Unpaid", "Partial", "Paid"];
const CERT_OPTIONS = ["Organic (USDA)", "Fairtrade", "Rainforest Alliance", "UTZ", "ECX Quality", "Phytosanitary", "Leather Working Group (LWG)", "Halal", "ISO 22000"];

function statusColor(s: string): any {
  if (s === "Ready for Export") return "default";
  if (s === "Shipped") return "secondary";
  if (s === "In Storage" || s === "Quality Inspected") return "secondary";
  return "outline";
}

export default function ExportPurchases() {
  const { toast } = useToast();
  const { data: items = [], isLoading } = useQuery<ExportPurchase[]>({ queryKey: ["/api/export/purchases"] });
  const { data: suppliersRaw = [] } = useQuery<Supplier[]>({ queryKey: ["/api/settings/suppliers"] });
  const suppliers = suppliersRaw.filter(s => !!s.name && s.name.trim().length > 0);
  const SUPPLIER_OTHER = "__other__";
  function applySupplier(name: string) {
    if (name === SUPPLIER_OTHER) {
      setForm((p: any) => ({ ...p, supplierName: "", supplierLocation: "", productName: "" }));
      return;
    }
    const s = suppliers.find(x => x.name === name);
    if (!s) return;
    setForm((p: any) => ({
      ...p,
      supplierName: s.name,
      supplierLocation: s.address ?? s.country ?? p.supplierLocation ?? "",
      productName: "",
    }));
  }
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState<ExportPurchase | null>(null);

  const emptyForm = {
    purchaseRef: "", supplierName: "", supplierLocation: "", productName: "",
    productCategory: "Coffee", qualityGrade: "Grade 1", quantityKg: "0", unitPriceEtb: "0",
    totalCostEtb: "0", warehouse: "Modjo Dry Port", certifications: "[]",
    status: "Sourced", paymentStatus: "Unpaid", purchaseDate: new Date().toISOString().slice(0, 10), notes: "",
  };
  const [form, setForm] = useState<any>(emptyForm);
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/export/purchases", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/export/purchases"] }); setOpenModal(false); toast({ title: "Purchase added" }); },
    onError: () => toast({ title: "Error adding purchase", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: any) => apiRequest("PATCH", `/api/export/purchases/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/export/purchases"] }); setOpenModal(false); toast({ title: "Purchase updated" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/export/purchases/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/export/purchases"] }); toast({ title: "Purchase deleted" }); },
  });

  function openNew() { setEditItem(null); setForm(emptyForm); setSelectedCerts([]); setOpenModal(true); }
  function openEdit(item: ExportPurchase) {
    setEditItem(item); setForm({ ...item });
    try { setSelectedCerts(JSON.parse(item.certifications ?? "[]")); } catch { setSelectedCerts([]); }
    setOpenModal(true);
  }
  function field(k: string, v: any) {
    setForm((p: any) => {
      const next = { ...p, [k]: v };
      if (k === "quantityKg" || k === "unitPriceEtb") {
        const q = Number(k === "quantityKg" ? v : next.quantityKg) || 0;
        const u = Number(k === "unitPriceEtb" ? v : next.unitPriceEtb) || 0;
        next.totalCostEtb = String(q * u);
      }
      return next;
    });
  }
  function toggleCert(c: string) {
    setSelectedCerts(prev => {
      const next = prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c];
      setForm((p: any) => ({ ...p, certifications: JSON.stringify(next) }));
      return next;
    });
  }
  function submit() {
    const body = { ...form, certifications: JSON.stringify(selectedCerts) };
    if (editItem) updateMutation.mutate({ id: editItem.id, body });
    else createMutation.mutate(body);
  }

  const filtered = items.filter(i => {
    if (filterCategory !== "all" && i.productCategory !== filterCategory) return false;
    const q = search.toLowerCase();
    return (i.purchaseRef + " " + i.supplierName + " " + i.productName + " " + (i.warehouse ?? "")).toLowerCase().includes(q);
  });

  const totalValueEtb = items.reduce((s, i) => s + Number(i.totalCostEtb), 0);
  const totalKg = items.reduce((s, i) => s + Number(i.quantityKg), 0);
  const readyCount = items.filter(i => i.status === "Ready for Export").length;
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        eyebrow="Export · Sourcing"
        title="Purchase & Sourcing Inventory"
        description="Track local Ethiopian goods procured from cooperatives and unions, ready for international markets."
        actions={
          <Button onClick={openNew} data-testid="button-create-purchase">
            <Plus className="h-4 w-4 mr-1.5" /> New Purchase
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-total-purchases">{items.length}</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-total-volume">{fmt(totalKg)} <span className="text-xs font-normal text-muted-foreground">kg</span></p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <Wheat className="h-4 w-4 text-amber-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Sourcing Cost</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-sourcing-cost">{fmt(totalValueEtb)} <span className="text-xs font-normal text-muted-foreground">ETB</span></p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Ready for Export</p>
                <p className="text-2xl font-bold mt-1 text-primary" data-testid="text-ready-export">{readyCount}</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <Package className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search supplier, product, ref..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-purchase-search" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-category"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ref</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Supplier / Origin</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Product</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Grade</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Quantity</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Unit ETB</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total ETB</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Warehouse</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Payment</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">No purchases found</td></tr>
                ) : filtered.map((item, i) => (
                  <tr key={item.id} className="border-b last:border-0 hover-elevate" data-testid={`row-purchase-${i}`}>
                    <td className="px-4 py-3 font-semibold text-primary">{item.purchaseRef}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.supplierName}</p>
                      {item.supplierLocation && <p className="text-muted-foreground">{item.supplierLocation}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.productName}</p>
                      <Badge variant="outline" className="text-xs mt-0.5">{item.productCategory}</Badge>
                    </td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{item.qualityGrade}</Badge></td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(Number(item.quantityKg))} kg</td>
                    <td className="px-4 py-3 text-right">{Number(item.unitPriceEtb).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold">{fmt(Number(item.totalCostEtb))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.warehouse}</td>
                    <td className="px-4 py-3"><Badge variant={statusColor(item.status ?? "")}>{item.status}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge variant={item.paymentStatus === "Paid" ? "default" : item.paymentStatus === "Partial" ? "secondary" : "destructive"}>{item.paymentStatus}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(item)} data-testid={`button-edit-purchase-${i}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-purchase-${i}`}>
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

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              {editItem ? "Update Purchase" : "New Purchase Order"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Purchase Reference</Label>
                <Input value={form.purchaseRef ?? ""} onChange={e => field("purchaseRef", e.target.value)} placeholder="Auto-generated if empty" data-testid="input-purchase-ref" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Purchase Date</Label>
                <Input type="date" value={form.purchaseDate ?? ""} onChange={e => field("purchaseDate", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Supplier / Cooperative Name</Label>
                <Select
                  value={suppliers.some(s => s.name === form.supplierName) ? form.supplierName : (form.supplierName ? SUPPLIER_OTHER : "")}
                  onValueChange={applySupplier}
                >
                  <SelectTrigger data-testid="select-supplier-name"><SelectValue placeholder="Select a saved supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}{s.products && s.products.length > 0 ? ` · ${s.products.length} product${s.products.length === 1 ? "" : "s"}` : ""}
                      </SelectItem>
                    ))}
                    <SelectItem value={SUPPLIER_OTHER}>Other (enter manually)</SelectItem>
                  </SelectContent>
                </Select>
                {!suppliers.some(s => s.name === form.supplierName) && (
                  <Input
                    className="mt-2"
                    value={form.supplierName}
                    onChange={e => field("supplierName", e.target.value)}
                    placeholder="Type supplier name"
                    data-testid="input-supplier-name"
                  />
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Origin / Location</Label>
                <Input value={form.supplierLocation ?? ""} onChange={e => field("supplierLocation", e.target.value)} placeholder="e.g. Yirgacheffe, SNNPR" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs flex items-center gap-2">
                  Product Name
                  {suppliers.find(s => s.name === form.supplierName)?.products?.length ? (
                    <span className="text-[0.65rem] text-muted-foreground font-normal">from selected supplier</span>
                  ) : null}
                </Label>
                {(() => {
                  const sup = suppliers.find(s => s.name === form.supplierName);
                  if (sup?.products && sup.products.length > 0) {
                    const PRODUCT_OTHER = "__product_other__";
                    return (
                      <>
                        <Select
                          value={sup.products.includes(form.productName) ? form.productName : (form.productName ? PRODUCT_OTHER : "")}
                          onValueChange={v => field("productName", v === PRODUCT_OTHER ? "" : v)}
                        >
                          <SelectTrigger data-testid="select-product-name"><SelectValue placeholder="Select a product" /></SelectTrigger>
                          <SelectContent>
                            {sup.products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            <SelectItem value={PRODUCT_OTHER}>Other (enter manually)</SelectItem>
                          </SelectContent>
                        </Select>
                        {!sup.products.includes(form.productName) && (
                          <Input
                            className="mt-2"
                            value={form.productName}
                            onChange={e => field("productName", e.target.value)}
                            placeholder="Type product name"
                            data-testid="input-product-name"
                          />
                        )}
                      </>
                    );
                  }
                  return (
                    <Input value={form.productName} onChange={e => field("productName", e.target.value)} placeholder="e.g. Yirgacheffe Coffee Grade 1" data-testid="input-product-name" />
                  );
                })()}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={form.productCategory ?? "Coffee"} onValueChange={v => field("productCategory", v)}>
                  <SelectTrigger data-testid="select-category"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quality Grade</Label>
                <Select value={form.qualityGrade ?? "Grade 1"} onValueChange={v => field("qualityGrade", v)}>
                  <SelectTrigger data-testid="select-grade"><SelectValue /></SelectTrigger>
                  <SelectContent>{QUALITY_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Quantity (kg)</Label>
                <Input type="number" value={form.quantityKg} onChange={e => field("quantityKg", e.target.value)} data-testid="input-quantity" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Unit Price (ETB/kg)</Label>
                <Input type="number" step="0.01" value={form.unitPriceEtb} onChange={e => field("unitPriceEtb", e.target.value)} data-testid="input-unit-price" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Total Cost (ETB)</Label>
                <Input type="number" value={form.totalCostEtb} readOnly className="bg-muted font-bold" data-testid="input-total-cost" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Warehouse</Label>
                <Select value={form.warehouse ?? "Modjo Dry Port"} onValueChange={v => field("warehouse", v)}>
                  <SelectTrigger data-testid="select-warehouse"><SelectValue /></SelectTrigger>
                  <SelectContent>{WAREHOUSES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={form.status ?? "Sourced"} onValueChange={v => field("status", v)}>
                  <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Payment Status</Label>
                <Select value={form.paymentStatus ?? "Unpaid"} onValueChange={v => field("paymentStatus", v)}>
                  <SelectTrigger data-testid="select-payment"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Certifications</Label>
              <div className="flex flex-wrap gap-1.5">
                {CERT_OPTIONS.map(c => (
                  <Badge
                    key={c}
                    variant={selectedCerts.includes(c) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleCert(c)}
                    data-testid={`badge-cert-${c.replace(/\s+/g, "-")}`}
                  >{c}</Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes ?? ""} onChange={e => field("notes", e.target.value)} placeholder="Quality notes, harvest year, etc." className="resize-none" rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-purchase">
              {editItem ? "Save Updates" : "Create Purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
