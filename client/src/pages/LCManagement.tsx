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
import { Plus, Search, FileText, AlertTriangle, Pencil, Trash2, Calculator } from "lucide-react";
import type { LC, Supplier, Bank } from "@shared/schema";
import { LCCostCalculator } from "@/components/LCCostCalculator";

function lcStatusColor(s: string) {
  if (s === "Approved") return "default";
  if (s === "Draft") return "secondary";
  if (s === "Settled") return "outline";
  if (s === "Expired") return "destructive";
  return "secondary";
}

const CURRENCIES = ["USD ($)", "EUR (€)", "GBP (£)", "CNY (¥)"];

export default function LCManagement() {
  const { toast } = useToast();
  const { data: lcs = [], isLoading } = useQuery<LC[]>({ queryKey: ["/api/lcs"] });
  const { data: suppliersRaw = [] } = useQuery<Supplier[]>({ queryKey: ["/api/settings/suppliers"] });
  const suppliers = suppliersRaw.filter(s => !!s.name && s.name.trim().length > 0);
  const { data: banksRaw = [] } = useQuery<Bank[]>({ queryKey: ["/api/settings/banks"] });
  const bankNames = Array.from(new Set(
    banksRaw.map(b => b.bankName).filter((n): n is string => !!n && n.trim().length > 0)
  ));
  const SUPPLIER_OTHER = "__other__";
  function applySupplier(name: string) {
    if (name === SUPPLIER_OTHER) {
      setForm((p: any) => ({ ...p, supplierName: "", supplierAddress: "", descriptionOfGoods: "" }));
      return;
    }
    const s = suppliers.find(x => x.name === name);
    if (!s) return;
    setForm((p: any) => ({
      ...p,
      supplierName: s.name,
      supplierAddress: s.address ?? p.supplierAddress ?? "",
      descriptionOfGoods: "",
    }));
  }
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editLC, setEditLC] = useState<LC | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(157.50);

  const emptyForm = {
    lcNumber: "", issuingBank: "", currency: "USD", fobValueUsd: "0", freightValueUsd: "0",
    issueDate: "", expiryDate: "", proformaInvoiceNo: "", proformaInvoiceDate: "",
    supplierName: "", supplierAddress: "", descriptionOfGoods: "", totalQuantity: "",
    entryCertificateLetter: "", entryCertificateDate: "", insuranceReferenceNo: "", insurancePaidEtb: "0",
    certificatePaidEtb: "0", marginOpenedPct: "30", paymentTerm: "CIF",
    partialShipmentAllowed: "false", partialShipmentUnits: "", transshipmentAllowed: "false", status: "Draft",
    openingPaidStatus: "unpaid", settlementPaidStatus: "unpaid",
  };
  const [form, setForm] = useState<any>(emptyForm);

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/lcs", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/lcs"] }); setOpenModal(false); toast({ title: "LC created" }); },
    onError: () => toast({ title: "Error creating LC", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: any) => apiRequest("PATCH", `/api/lcs/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/lcs"] }); setOpenModal(false); toast({ title: "LC updated" }); },
    onError: () => toast({ title: "Error updating LC", variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/lcs/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/lcs"] }); toast({ title: "LC deleted" }); },
  });

  function openNew() { setEditLC(null); setForm(emptyForm); setShowBreakdown(false); setOpenModal(true); }
  function openEdit(lc: LC) {
    const cleanBank = bankNames.includes(lc.issuingBank) ? lc.issuingBank : "";
    const cleanSupplier = suppliers.some(s => s.name === lc.supplierName) ? lc.supplierName : "";
    setEditLC(lc);
    setForm({ ...lc, issuingBank: cleanBank, supplierName: cleanSupplier });
    setShowBreakdown(false);
    setOpenModal(true);
    if (!cleanBank || !cleanSupplier) {
      const missing = [!cleanBank && "Issuing Bank", !cleanSupplier && "Supplier"].filter(Boolean).join(" & ");
      toast({
        title: `Re-select ${missing}`,
        description: `Saved ${missing.toLowerCase()} is no longer in Settings. Please pick again.`,
      });
    }
  }
  function submit() {
    const requiredFields: { key: string; label: string }[] = [
      { key: "issuingBank", label: "Issuing Bank" },
      { key: "currency", label: "LC Currency" },
      { key: "fobValueUsd", label: "FOB Value (USD)" },
      { key: "proformaInvoiceNo", label: "Proforma Invoice No." },
      { key: "proformaInvoiceDate", label: "Proforma Invoice Date" },
      { key: "supplierName", label: "Supplier Name" },
      { key: "supplierAddress", label: "Supplier Address" },
      { key: "descriptionOfGoods", label: "Description of Goods" },
      { key: "totalQuantity", label: "Total Quantity (Units)" },
    ];
    const missing = requiredFields.filter(f => {
      const v = form[f.key];
      if (f.key === "fobValueUsd") return v === undefined || v === null || v === "" || Number(v) <= 0;
      return v === undefined || v === null || String(v).trim() === "";
    });
    if (missing.length > 0) {
      toast({
        title: "Missing required fields",
        description: missing.map(m => m.label).join(", "),
        variant: "destructive",
      });
      return;
    }
    if (!bankNames.includes(form.issuingBank)) {
      toast({
        title: "Issuing Bank not in Settings",
        description: "Pick a bank saved under Settings → Banks, or add it there first.",
        variant: "destructive",
      });
      return;
    }
    if (!suppliers.some(s => s.name === form.supplierName)) {
      toast({
        title: "Supplier not in Settings",
        description: "Pick a supplier saved under Settings → Suppliers, or add it there first.",
        variant: "destructive",
      });
      return;
    }
    if (editLC) updateMutation.mutate({ id: editLC.id, body: form });
    else createMutation.mutate(form);
  }
  function field(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  const filtered = lcs.filter(lc =>
    lc.lcNumber.toLowerCase().includes(search.toLowerCase()) ||
    lc.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">LC Management</h1>
          <p className="text-sm text-muted-foreground">Review and process bank-issued letters of credit</p>
        </div>
        <Button onClick={openNew} data-testid="button-open-new-lc">
          <Plus className="h-4 w-4 mr-1.5" /> Open New LC
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by LC number, bank, or supplier..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9" data-testid="input-lc-search"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">LC & Proforma</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Supplier & Bank</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Value (USD)</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Terms</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No LCs found</td></tr>
                    ) : filtered.map((lc, i) => (
                      <tr key={lc.id} className="border-b last:border-0 hover-elevate" data-testid={`row-lc-${i}`}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-primary">{lc.lcNumber}</p>
                          <p className="text-muted-foreground">{lc.proformaInvoiceNo ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{lc.supplierName}</p>
                          <p className="text-muted-foreground truncate max-w-[140px]">{lc.issuingBank}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          ${Number(lc.fobValueUsd).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">{lc.paymentTerm}</td>
                        <td className="px-4 py-3">
                          <Badge variant={lcStatusColor(lc.status) as any}>{lc.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(lc)} data-testid={`button-edit-lc-${i}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(lc.id)} data-testid={`button-delete-lc-${i}`}>
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
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-4">
              <p className="text-xs opacity-80">Financial Limits</p>
              <p className="text-xs opacity-80 mt-1">You have used 72% of your global trade finance limit.</p>
              <p className="text-lg font-bold mt-3">Available Credit</p>
              <p className="text-2xl font-bold">$1.48M</p>
              <Button variant="outline" size="sm" className="mt-3 w-full text-xs bg-white/10 border-white/20 text-primary-foreground">
                Request Limit Increase
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Action Required
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md bg-muted p-3">
                <div className="flex justify-between items-start gap-1 flex-wrap">
                  <p className="text-xs font-semibold">LC-78923</p>
                  <Badge variant="secondary" className="text-xs">Draft</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">SWIFT message needs correction for shipment port details (Modjo vs Addis).</p>
                <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-1">Correct Details</Button>
              </div>
              <div className="rounded-md bg-muted p-3">
                <div className="flex justify-between items-start gap-1 flex-wrap">
                  <p className="text-xs font-semibold text-amber-600">EXPIRY WATCH</p>
                  <Badge variant="destructive" className="text-xs">Warning</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">LC-78921 expires in 2 weeks. Ensure all shipping documents are presented.</p>
                <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-1">Notify Logistics</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* LC Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {editLC ? `Update Letter of Credit` : "Open Letter of Credit"}
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground -mt-1">Fields marked <span className="text-destructive">*</span> are required to issue the LC. All other fields can be filled in or updated later.</p>
          <div className="space-y-5 py-2">
            {/* Invoice & Supplier */}
            <div>
              <h3 className="text-xs font-semibold text-primary mb-3">Invoice & Supplier Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Proforma Invoice No. <span className="text-destructive">*</span></Label>
                  <Input value={form.proformaInvoiceNo ?? ""} onChange={e => field("proformaInvoiceNo", e.target.value)} placeholder="PI-2024-001" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Proforma Invoice Date <span className="text-destructive">*</span></Label>
                  <Input type="date" value={form.proformaInvoiceDate ?? ""} onChange={e => field("proformaInvoiceDate", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Supplier Name <span className="text-destructive">*</span></Label>
                  <Select
                    value={suppliers.some(s => s.name === form.supplierName) ? form.supplierName : ""}
                    onValueChange={applySupplier}
                    disabled={suppliers.length === 0}
                  >
                    <SelectTrigger data-testid="select-supplier-name">
                      <SelectValue placeholder={suppliers.length === 0 ? "Add a supplier in Settings → Suppliers first" : "Select a saved supplier"} />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.name}>
                          {s.name}{s.products && s.products.length > 0 ? ` · ${s.products.length} product${s.products.length === 1 ? "" : "s"}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {suppliers.length === 0 && (
                    <p className="text-[0.65rem] text-muted-foreground">No saved suppliers yet — add them under Settings → Suppliers to be able to issue an LC.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Supplier Address <span className="text-destructive">*</span></Label>
                  <Input value={form.supplierAddress ?? ""} onChange={e => field("supplierAddress", e.target.value)} placeholder="Shanghai Tech Park, Bldg 4" />
                </div>
              </div>
            </div>

            {/* Goods & Cert */}
            <div>
              <h3 className="text-xs font-semibold text-primary mb-3">Goods & Certification</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-2">
                    <span>Description of Goods <span className="text-destructive">*</span></span>
                    {suppliers.find(s => s.name === form.supplierName)?.products?.length ? (
                      <span className="text-[0.65rem] text-muted-foreground font-normal">pick from this supplier's products</span>
                    ) : null}
                  </Label>
                  {(() => {
                    const sup = suppliers.find(s => s.name === form.supplierName);
                    if (sup?.products && sup.products.length > 0) {
                      const DESC_OTHER = "__desc_other__";
                      return (
                        <>
                          <Select
                            value={sup.products.includes(form.descriptionOfGoods ?? "") ? form.descriptionOfGoods : (form.descriptionOfGoods ? DESC_OTHER : "")}
                            onValueChange={v => field("descriptionOfGoods", v === DESC_OTHER ? "" : v)}
                          >
                            <SelectTrigger data-testid="select-description-of-goods"><SelectValue placeholder="Select a product" /></SelectTrigger>
                            <SelectContent>
                              {sup.products.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                              <SelectItem value={DESC_OTHER}>Other (enter manually)</SelectItem>
                            </SelectContent>
                          </Select>
                          {!sup.products.includes(form.descriptionOfGoods ?? "") && (
                            <Input
                              className="mt-2"
                              value={form.descriptionOfGoods ?? ""}
                              onChange={e => field("descriptionOfGoods", e.target.value)}
                              placeholder="Type description of goods"
                              data-testid="input-description-of-goods"
                            />
                          )}
                        </>
                      );
                    }
                    return (
                      <Input value={form.descriptionOfGoods ?? ""} onChange={e => field("descriptionOfGoods", e.target.value)} placeholder="Industrial Machinery for manufacturing plant" data-testid="input-description-of-goods" />
                    );
                  })()}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total Quantity (Units) <span className="text-destructive">*</span></Label>
                  <Input value={form.totalQuantity ?? ""} onChange={e => field("totalQuantity", e.target.value)} placeholder="15 units" data-testid="input-total-quantity" />
                </div>
                <div className="sm:col-span-2 rounded-md border border-border/60 bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={form.partialShipmentAllowed === "true"}
                      onCheckedChange={v => {
                        const on = String(v);
                        setForm((f: any) => ({ ...f, partialShipmentAllowed: on, partialShipmentUnits: on === "true" ? f.partialShipmentUnits : "" }));
                      }}
                      data-testid="checkbox-partial-shipment-available"
                    />
                    <Label className="text-xs">Partial shipment available from total quantity</Label>
                  </div>
                  {form.partialShipmentAllowed === "true" && (() => {
                    const totalUnits = parseInt(String(form.totalQuantity ?? "").replace(/[^0-9]/g, ""), 10);
                    const partialUnits = parseInt(String(form.partialShipmentUnits ?? "").replace(/[^0-9]/g, ""), 10);
                    const hasTotal = !isNaN(totalUnits);
                    const hasPartial = !isNaN(partialUnits);
                    const remaining = hasTotal && hasPartial ? totalUnits - partialUnits : NaN;
                    const overLimit = hasTotal && hasPartial && partialUnits > totalUnits;
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                        <div className="space-y-1">
                          <Label className="text-xs">Partial Shipment Units</Label>
                          <Input
                            type="number"
                            min={0}
                            value={form.partialShipmentUnits ?? ""}
                            onChange={e => field("partialShipmentUnits", e.target.value)}
                            placeholder="e.g. 5"
                            data-testid="input-partial-shipment-units"
                          />
                          {overLimit && (
                            <p className="text-[0.65rem] text-destructive">Partial units cannot exceed the total quantity ({totalUnits}).</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Remaining Units</Label>
                          <Input
                            readOnly
                            className="bg-muted"
                            value={hasTotal && hasPartial ? (overLimit ? "" : String(remaining)) : ""}
                            placeholder={hasTotal ? "Auto-calculated" : "Enter total quantity first"}
                            data-testid="input-remaining-units"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entry Certificate Letter</Label>
                  <Input value={form.entryCertificateLetter ?? ""} onChange={e => field("entryCertificateLetter", e.target.value)} placeholder="ECL-889" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entry Certificate Issued Date</Label>
                  <Input type="date" value={form.entryCertificateDate ?? ""} onChange={e => field("entryCertificateDate", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Insurance Reference No.</Label>
                  <Input value={form.insuranceReferenceNo ?? ""} onChange={e => field("insuranceReferenceNo", e.target.value)} placeholder="INS-2024-001" data-testid="input-insurance-reference-no" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Insurance Amount (ETB)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">ETB</span>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      className="pl-12 tabular-nums"
                      value={form.insurancePaidEtb ?? "0"}
                      onChange={e => field("insurancePaidEtb", e.target.value)}
                      onBlur={e => {
                        const n = parseFloat(e.target.value);
                        field("insurancePaidEtb", isNaN(n) ? "0.00" : n.toFixed(2));
                      }}
                      placeholder="0.00"
                      data-testid="input-insurance-amount-etb"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* General LC Info */}
            <div>
              <h3 className="text-xs font-semibold text-primary mb-3 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> General LC Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">LC Number</Label>
                  <Input value={form.lcNumber} onChange={e => field("lcNumber", e.target.value)} placeholder="LC-XXXXX" data-testid="input-lc-number" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Issuing Bank <span className="text-destructive">*</span></Label>
                  <Select
                    value={bankNames.includes(form.issuingBank) ? form.issuingBank : ""}
                    onValueChange={v => field("issuingBank", v)}
                    disabled={bankNames.length === 0}
                  >
                    <SelectTrigger data-testid="select-issuing-bank">
                      <SelectValue placeholder={bankNames.length === 0 ? "Add a bank in Settings → Banks first" : "Select bank"} />
                    </SelectTrigger>
                    <SelectContent>
                      {bankNames.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {bankNames.length === 0 && (
                    <p className="text-[0.65rem] text-muted-foreground">No saved banks yet — add them under Settings → Banks to be able to issue an LC.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">LC Currency <span className="text-destructive">*</span></Label>
                  <Select value={form.currency} onValueChange={v => field("currency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">FOB Value (USD) <span className="text-destructive">*</span></Label>
                  <Input type="number" value={form.fobValueUsd} onChange={e => field("fobValueUsd", e.target.value)} data-testid="input-fob-value" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Freight Value (USD)</Label>
                  <Input type="number" value={form.freightValueUsd} onChange={e => field("freightValueUsd", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total Value (USD)</Label>
                  <Input value={`$${(Number(form.fobValueUsd) + Number(form.freightValueUsd)).toLocaleString()}`} readOnly className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Issue Date</Label>
                  <Input type="date" value={form.issueDate} onChange={e => field("issueDate", e.target.value)} data-testid="input-issue-date" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Expiry Date</Label>
                  <Input type="date" value={form.expiryDate} onChange={e => field("expiryDate", e.target.value)} />
                  <p className="text-xs text-muted-foreground">Set to 90 days from issue date.</p>
                </div>
              </div>
            </div>

            {/* Financial Terms */}
            <div>
              <h3 className="text-xs font-semibold text-primary mb-3">Financial & Shipping Terms</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Margin Opened %</Label>
                  <Input type="number" value={form.marginOpenedPct ?? "30"} onChange={e => field("marginOpenedPct", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Payment Term</Label>
                  <Select value={form.paymentTerm ?? "CIF"} onValueChange={v => field("paymentTerm", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOB">FOB</SelectItem>
                      <SelectItem value="CIF">CIF</SelectItem>
                      <SelectItem value="CFR">CFR</SelectItem>
                      <SelectItem value="EXW">EXW</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={form.status} onValueChange={v => field("status", v)}>
                    <SelectTrigger data-testid="select-lc-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Settled">Settled</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 sm:col-span-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={form.partialShipmentAllowed === "true"}
                      onCheckedChange={v => {
                        const on = String(v);
                        setForm((f: any) => ({ ...f, partialShipmentAllowed: on, partialShipmentUnits: on === "true" ? f.partialShipmentUnits : "" }));
                      }}
                      data-testid="checkbox-partial-shipment"
                    />
                    <Label className="text-xs">Partial Shipment Allowed</Label>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Checkbox
                      checked={form.transshipmentAllowed === "true"}
                      onCheckedChange={v => field("transshipmentAllowed", String(v))}
                    />
                    <Label className="text-xs">Transshipment Allowed</Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Breakdown Toggle */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-semibold text-primary">LC & Freight Cost Breakdown Calculator</h3>
              </div>
              <LCCostCalculator
                initialFcyValue={form.fobValueUsd}
                initialOpeningRate={String(exchangeRate)}
                initialTotalUnits={String(form.totalQuantity ?? "").replace(/[^0-9]/g, "")}
                initialPartialUnits={form.partialShipmentAllowed === "true" ? (form.partialShipmentUnits ?? "") : ""}
                initialBank={form.issuingBank}
                initialLcNumber={form.lcNumber}
                lockedShipType={form.partialShipmentAllowed === "true" ? "partial" : "full"}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)} data-testid="button-discard-lc">Discard</Button>
            <Button
              onClick={submit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-issue-lc"
            >
              {editLC ? "Save Changes" : "Issue Letter of Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
