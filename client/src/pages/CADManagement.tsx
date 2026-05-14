import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Search, Banknote, Pencil, Trash2, FileCheck, Globe, TrendingUp } from "lucide-react";
import type { Cad } from "@shared/schema";

const COUNTRIES = ["Germany", "Italy", "Netherlands", "Belgium", "France", "Saudi Arabia", "UAE", "China", "Japan", "USA", "United Kingdom", "Sudan"];
const PAYMENT_TERMS = ["Sight", "30 Days", "60 Days", "90 Days", "120 Days"];
const STATUSES = ["Draft", "Documents Sent", "Awaiting Payment", "Paid", "Settled", "Disputed"];
const DOC_OPTIONS = ["Commercial Invoice", "Bill of Lading", "Certificate of Origin", "Phytosanitary Certificate", "Quality Certificate (ECX)", "Packing List", "Insurance Certificate", "Inspection Certificate (SGS)", "Fumigation Certificate", "Weight Certificate"];

function statusVariant(s: string): any {
  if (s === "Paid" || s === "Settled") return "default";
  if (s === "Awaiting Payment") return "secondary";
  if (s === "Disputed") return "destructive";
  return "outline";
}

export default function CADManagement() {
  const { toast } = useToast();
  const { data: cads = [], isLoading } = useQuery<Cad[]>({ queryKey: ["/api/export/cads"] });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState<Cad | null>(null);

  const emptyForm = {
    cadNumber: "", buyerName: "", buyerAddress: "", buyerCountry: "Germany", buyerBank: "", buyerSwift: "",
    productDescription: "", quantityKg: "0", unitPriceUsd: "0", fobValueUsd: "0",
    freightUsd: "0", insuranceUsd: "0", totalContractUsd: "0", exchangeRate: "157.50",
    bankCommissionPct: "1", nbeRetentionPct: "30", paymentTerms: "Sight",
    documentsRequired: "[]", contractDate: new Date().toISOString().slice(0, 10), shipmentDate: "",
    status: "Draft", paidStatus: "unpaid",
  };
  const [form, setForm] = useState<any>(emptyForm);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/export/cads", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/export/cads"] }); setOpenModal(false); toast({ title: "CAD created" }); },
    onError: () => toast({ title: "Error creating CAD", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: any) => apiRequest("PATCH", `/api/export/cads/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/export/cads"] }); setOpenModal(false); toast({ title: "CAD updated" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/export/cads/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/export/cads"] }); toast({ title: "CAD deleted" }); },
  });

  function openNew() { setEditItem(null); setForm(emptyForm); setSelectedDocs([]); setOpenModal(true); }
  function openEdit(c: Cad) {
    setEditItem(c); setForm({ ...c });
    try { setSelectedDocs(JSON.parse(c.documentsRequired ?? "[]")); } catch { setSelectedDocs([]); }
    setOpenModal(true);
  }
  function field(k: string, v: any) {
    setForm((p: any) => {
      const next = { ...p, [k]: v };
      if (["quantityKg", "unitPriceUsd", "freightUsd", "insuranceUsd"].includes(k)) {
        const q = Number(k === "quantityKg" ? v : next.quantityKg) || 0;
        const u = Number(k === "unitPriceUsd" ? v : next.unitPriceUsd) || 0;
        const fr = Number(k === "freightUsd" ? v : next.freightUsd) || 0;
        const ins = Number(k === "insuranceUsd" ? v : next.insuranceUsd) || 0;
        next.fobValueUsd = String(q * u);
        next.totalContractUsd = String(q * u + fr + ins);
      }
      return next;
    });
  }
  function toggleDoc(d: string) {
    setSelectedDocs(prev => {
      const next = prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d];
      setForm((p: any) => ({ ...p, documentsRequired: JSON.stringify(next) }));
      return next;
    });
  }
  function submit() {
    const body = { ...form, documentsRequired: JSON.stringify(selectedDocs) };
    if (editItem) updateMutation.mutate({ id: editItem.id, body });
    else createMutation.mutate(body);
  }

  const filtered = cads.filter(c => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    const q = search.toLowerCase();
    return (c.cadNumber + " " + c.buyerName + " " + (c.buyerCountry ?? "")).toLowerCase().includes(q);
  });

  const totalContractUsd = cads.reduce((s, c) => s + Number(c.totalContractUsd), 0);
  const paidUsd = cads.filter(c => c.status === "Paid" || c.status === "Settled").reduce((s, c) => s + Number(c.totalContractUsd), 0);
  const awaitingUsd = cads.filter(c => c.status === "Awaiting Payment" || c.status === "Documents Sent").reduce((s, c) => s + Number(c.totalContractUsd), 0);
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

  // NBE retention preview for current form
  const formFob = Number(form.fobValueUsd) || 0;
  const formRate = Number(form.exchangeRate) || 0;
  const formCommissionPct = Number(form.bankCommissionPct) || 0;
  const formNbePct = Number(form.nbeRetentionPct) || 0;
  const grossEtb = formFob * formRate;
  const commissionEtb = grossEtb * (formCommissionPct / 100);
  const nbeRetentionEtb = grossEtb * (formNbePct / 100);
  const exporterNetEtb = grossEtb - commissionEtb - nbeRetentionEtb;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        eyebrow="Export · Payments"
        title="Cash Against Documents"
        description="Manage export payment instruments and preview NBE forex settlement in real time."
        actions={
          <Button onClick={openNew} data-testid="button-create-cad">
            <Plus className="h-4 w-4 mr-1.5" /> New CAD
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Total CADs</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-total-cads">{cads.length}</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <FileCheck className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Contract Value</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-total-contract">${fmt(totalContractUsd)}</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <Banknote className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Paid / Settled</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600" data-testid="text-paid-settled">${fmt(paidUsd)}</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Awaiting Payment</p>
                <p className="text-2xl font-bold mt-1 text-amber-600" data-testid="text-awaiting">${fmt(awaitingUsd)}</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <Globe className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search CAD#, buyer, country..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-cad-search" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">CAD #</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Buyer / Country</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Bank</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Product</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">FOB USD</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total USD</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Terms</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No CADs found</td></tr>
                ) : filtered.map((c, i) => (
                  <tr key={c.id} className="border-b last:border-0 hover-elevate" data-testid={`row-cad-${i}`}>
                    <td className="px-4 py-3 font-semibold text-primary">{c.cadNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.buyerName}</p>
                      <p className="text-muted-foreground">{c.buyerCountry}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.buyerBank}</p>
                      {c.buyerSwift && <p className="text-muted-foreground font-mono">{c.buyerSwift}</p>}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{c.productDescription}</td>
                    <td className="px-4 py-3 text-right font-medium">${fmt(Number(c.fobValueUsd))}</td>
                    <td className="px-4 py-3 text-right font-bold">${fmt(Number(c.totalContractUsd))}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{c.paymentTerms}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(c.status ?? "")}>{c.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)} data-testid={`button-edit-cad-${i}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(c.id)} data-testid={`button-delete-cad-${i}`}>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              {editItem ? "Update CAD" : "New Cash Against Documents"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">CAD Number</Label>
                <Input value={form.cadNumber ?? ""} onChange={e => field("cadNumber", e.target.value)} placeholder="Auto-generated if empty" data-testid="input-cad-number" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contract Date</Label>
                <Input type="date" value={form.contractDate ?? ""} onChange={e => field("contractDate", e.target.value)} />
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Foreign Buyer Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Buyer Name</Label>
                  <Input value={form.buyerName} onChange={e => field("buyerName", e.target.value)} data-testid="input-buyer-name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Country</Label>
                  <Select value={form.buyerCountry ?? "Germany"} onValueChange={v => field("buyerCountry", v)}>
                    <SelectTrigger data-testid="select-buyer-country"><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Buyer Address</Label>
                  <Input value={form.buyerAddress ?? ""} onChange={e => field("buyerAddress", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Buyer's Bank</Label>
                  <Input value={form.buyerBank ?? ""} onChange={e => field("buyerBank", e.target.value)} placeholder="e.g. Deutsche Bank AG" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SWIFT / BIC</Label>
                  <Input value={form.buyerSwift ?? ""} onChange={e => field("buyerSwift", e.target.value)} placeholder="DEUTDEFF" className="font-mono" />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Goods & Pricing (USD)</p>
              <div className="space-y-1">
                <Label className="text-xs">Product Description</Label>
                <Input value={form.productDescription ?? ""} onChange={e => field("productDescription", e.target.value)} placeholder="e.g. Yirgacheffe Coffee Grade 1 — 12,000 kg" data-testid="input-product-desc" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Quantity (kg)</Label>
                  <Input type="number" value={form.quantityKg} onChange={e => field("quantityKg", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit Price (USD)</Label>
                  <Input type="number" step="0.01" value={form.unitPriceUsd} onChange={e => field("unitPriceUsd", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">FOB Value (USD)</Label>
                  <Input type="number" value={form.fobValueUsd} readOnly className="bg-muted font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Freight (USD)</Label>
                  <Input type="number" value={form.freightUsd} onChange={e => field("freightUsd", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Insurance (USD)</Label>
                  <Input type="number" value={form.insuranceUsd} onChange={e => field("insuranceUsd", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total Contract (USD)</Label>
                  <Input type="number" value={form.totalContractUsd} readOnly className="bg-muted font-bold text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">NBE Forex & Banking</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Exchange Rate (ETB / USD)</Label>
                  <Input type="number" step="0.0001" value={form.exchangeRate} onChange={e => field("exchangeRate", e.target.value)} data-testid="input-exchange-rate" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Payment Terms</Label>
                  <Select value={form.paymentTerms ?? "Sight"} onValueChange={v => field("paymentTerms", v)}>
                    <SelectTrigger data-testid="select-payment-terms"><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bank Commission (%)</Label>
                  <Input type="number" step="0.01" value={form.bankCommissionPct} onChange={e => field("bankCommissionPct", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">NBE Forex Surrender (%)</Label>
                  <Input type="number" step="0.01" value={form.nbeRetentionPct} onChange={e => field("nbeRetentionPct", e.target.value)} data-testid="input-nbe-pct" />
                </div>
              </div>

              {formFob > 0 && formRate > 0 && (
                <div className="rounded-md bg-muted p-3 space-y-1.5 text-xs">
                  <p className="font-semibold">Settlement Preview</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">Gross Proceeds (FOB × Rate)</span><span className="font-medium">{fmt(grossEtb)} ETB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">− Bank Commission ({formCommissionPct}%)</span><span className="text-destructive">−{fmt(commissionEtb)} ETB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">− NBE Forex Surrender ({formNbePct}%)</span><span className="text-destructive">−{fmt(nbeRetentionEtb)} ETB</span></div>
                  <div className="flex justify-between border-t pt-1.5 mt-1.5"><span className="font-semibold">Net to Exporter Account</span><span className="font-bold text-emerald-600" data-testid="text-net-exporter">{fmt(exporterNetEtb)} ETB</span></div>
                </div>
              )}
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Required Documents</p>
              <div className="flex flex-wrap gap-1.5">
                {DOC_OPTIONS.map(d => (
                  <Badge
                    key={d}
                    variant={selectedDocs.includes(d) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => toggleDoc(d)}
                    data-testid={`badge-doc-${d.replace(/\s+/g, "-")}`}
                  >{d}</Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Shipment Date</Label>
                <Input type="date" value={form.shipmentDate ?? ""} onChange={e => field("shipmentDate", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={form.status ?? "Draft"} onValueChange={v => field("status", v)}>
                  <SelectTrigger data-testid="select-cad-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-cad">
              {editItem ? "Save Updates" : "Create CAD"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
