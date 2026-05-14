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
import { Plus, Search, Ship, AlertTriangle, Pencil, Trash2, MapPin, ChevronRight, Calculator } from "lucide-react";
import type { Shipment, LC } from "@shared/schema";
import { LCCostCalculator } from "@/components/LCCostCalculator";

const STATUSES = [
  "Under Production", "Port Loading", "Sea Transit", "Djibouti Port arrived",
  "Arrived to our Store - clearance Complete", "Risk", "Delivered"
];

const DOCUMENT_TYPES = [
  "Bill Of Loading", "Packaging List", "Truckway Bill", "Chamber Of Commerce",
  "Commercial Invoice", "Certificate Of Origin", "Airway Bill"
];

function statusColor(s: string) {
  if (s.includes("Complete")) return "default";
  if (s.includes("Risk") || s.includes("risk")) return "destructive";
  if (s.includes("Djibouti")) return "secondary";
  return "secondary";
}

const ROUTE_STAGES = ["Supplier", "Port Loading", "Sea Transit", "Djibouti", "Modjo", "Warehouse"];

export default function ImportShipments() {
  const { toast } = useToast();
  const { data: shipments = [], isLoading } = useQuery<Shipment[]>({ queryKey: ["/api/shipments"] });
  const { data: lcs = [] } = useQuery<LC[]>({ queryKey: ["/api/lcs"] });
  const EXCHANGE_RATE = 157.5;
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editShipment, setEditShipment] = useState<Shipment | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  const emptyForm = {
    origin: "", destination: "Addis Ababa, Ethiopia", status: "Under Production",
    etdDate: "", etaDate: "", billNumber: "", declarationNumber: "",
    supplierName: "", supplierAddress: "", paymentTerm: "FOB",
    descriptionOfGoods: "", totalValueUsd: "0", lcId: "",
    transitPayableEtb: "0", inlandPayableEtb: "0", customsToWarehouseEtb: "0",
    advancedTaxEtb: "0", demurragePayableEtb: "0",
    documents: "[]",
  };
  const [form, setForm] = useState<any>(emptyForm);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/shipments", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/shipments"] }); setOpenModal(false); toast({ title: "Shipment created" }); },
    onError: () => toast({ title: "Error creating shipment", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: any) => apiRequest("PATCH", `/api/shipments/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/shipments"] }); setOpenModal(false); toast({ title: "Shipment updated" }); },
    onError: () => toast({ title: "Error updating shipment", variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/shipments/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/shipments"] }); toast({ title: "Shipment deleted" }); },
  });

  function openNew() {
    setEditShipment(null);
    setForm(emptyForm);
    setSelectedDocs([]);
    setOpenModal(true);
  }
  function openEdit(s: Shipment) {
    setEditShipment(s);
    try { setSelectedDocs(JSON.parse(s.documents ?? "[]")); } catch { setSelectedDocs([]); }
    setForm({ ...s });
    setOpenModal(true);
  }
  function submit() {
    const body = { ...form, documents: JSON.stringify(selectedDocs) };
    if (editShipment) updateMutation.mutate({ id: editShipment.id, body });
    else createMutation.mutate(body);
  }
  function field(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }
  function toggleDoc(doc: string) {
    setSelectedDocs(prev => prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]);
  }

  const filtered = shipments.filter(s =>
    (s.origin + s.destination + (s.billNumber ?? "") + (s.declarationNumber ?? "")).toLowerCase().includes(search.toLowerCase())
  );

  const approvedLCs = lcs.filter(lc => lc.status === "Approved");
  const activeTracking = selectedShipment || (filtered.length > 0 ? filtered[0] : null);
  const trackingProgress = activeTracking ? ROUTE_STAGES.indexOf(
    activeTracking.status.includes("Sea") ? "Sea Transit" :
    activeTracking.status.includes("Djibouti") ? "Djibouti" :
    activeTracking.status.includes("Modjo") ? "Modjo" :
    activeTracking.status.includes("Complete") ? "Warehouse" : "Supplier"
  ) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Shipments</h1>
          <p className="text-sm text-muted-foreground">Manage and track your global logistics lifecycle</p>
        </div>
        <Button onClick={openNew} data-testid="button-create-shipment">
          <Plus className="h-4 w-4 mr-1.5" /> Create Shipment
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by ID, route or bill number..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9" data-testid="input-shipment-search"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Shipment ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Route</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">ETA</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Details</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No shipments found</td></tr>
                ) : filtered.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`border-b last:border-0 hover-elevate cursor-pointer ${activeTracking?.id === s.id ? "bg-muted/50" : ""}`}
                    onClick={() => setSelectedShipment(s)}
                    data-testid={`row-shipment-${i}`}
                  >
                    <td className="px-4 py-3 font-semibold text-primary">SHP-{String(i + 1).padStart(3, "0")}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.origin}</p>
                      <p className="text-muted-foreground flex items-center gap-0.5"><ChevronRight className="h-3 w-3" />{s.destination}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColor(s.status) as any} className="text-xs max-w-[130px] truncate">
                        {s.status.length > 18 ? s.status.slice(0, 18) + "…" : s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.etaDate ?? "TBD"}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.billNumber ?? "—"}</p>
                      <p className="text-muted-foreground">{s.declarationNumber ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(s); }} data-testid={`button-edit-shipment-${i}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); deleteMutation.mutate(s.id); }} data-testid={`button-delete-shipment-${i}`}>
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

      {activeTracking && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Active Tracking */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Ship className="h-4 w-4 text-primary" />
                  Active Tracking: SHP-{String(filtered.findIndex(f => f.id === activeTracking.id) + 1).padStart(3, "0")}
                </CardTitle>
                <Badge variant="outline" className="text-xs">Live Status</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4 overflow-x-auto gap-1">
                {ROUTE_STAGES.map((stage, idx) => (
                  <div key={stage} className="flex flex-col items-center gap-1 min-w-[56px]">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold border-2 ${idx <= trackingProgress ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"}`}>
                      {idx + 1}
                    </div>
                    <p className="text-xs text-center text-muted-foreground leading-tight">{stage}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-md bg-muted p-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                    {Math.round(((trackingProgress + 1) / ROUTE_STAGES.length) * 100)}%
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">In Route: {activeTracking.origin} to {activeTracking.destination}</p>
                    <p className="text-xs text-muted-foreground">Current Status: {activeTracking.status}</p>
                  </div>
                </div>
              </div>

              {/* Action Required */}
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Action Required
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs font-bold text-destructive">DEMURRAGE WARNING</p>
                    <p className="text-xs text-muted-foreground mt-1">SHP-002 arrives in 48h. Clear documents to avoid storage costs.</p>
                    <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-1">Process Now</Button>
                  </div>
                  <div className="rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-900/10 p-3">
                    <p className="text-xs font-bold text-amber-600">DOCUMENT UPLOAD</p>
                    <p className="text-xs text-muted-foreground mt-1">Commercial invoice missing for SHP-001. Required for customs.</p>
                    <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-1">Upload Documents</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Port Update & Network */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Djibouti Port Update</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Congestion levels are currently moderate. Average clearing time: <strong>4.2 days</strong>.</p>
                <Button variant="outline" size="sm" className="mt-3 w-full text-xs">Full Report</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Global Network</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Our partner transitors in 45 ports ensure your cargo moves without friction.</p>
                <div className="mt-3 rounded-md bg-primary p-3 text-primary-foreground">
                  <p className="text-xs opacity-80">Transit Performance</p>
                  <p className="text-lg font-bold">98.2% On Time</p>
                </div>
                <Button variant="outline" size="sm" className="mt-3 w-full text-xs">Contact Support</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Shipment Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-primary" />
              {editShipment ? "Update Shipment" : "Create New Shipment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Pre-fill from LC */}
            {!editShipment && approvedLCs.length > 0 && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <Ship className="h-3.5 w-3.5 text-primary" /> Pre-fill from Approved LC
                </p>
                <p className="text-xs text-muted-foreground mb-2">Select an approved LC to automatically populate shipment details.</p>
                <Select value={form.lcId || undefined} onValueChange={lcId => {
                  const lc = approvedLCs.find(l => l.id === lcId);
                  if (lc) {
                    setForm((p: any) => ({
                      ...p,
                      lcId,
                      supplierName: lc.supplierName ?? "",
                      supplierAddress: lc.supplierAddress ?? "",
                      descriptionOfGoods: lc.descriptionOfGoods ?? "",
                      totalValueUsd: String(Number(lc.fobValueUsd ?? 0) + Number(lc.freightValueUsd ?? 0)),
                      paymentTerm: lc.paymentTerm ?? "FOB",
                    }));
                  }
                }}>
                  <SelectTrigger className="text-xs" data-testid="select-prefill-lc">
                    <SelectValue placeholder="Select an LC..." />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedLCs.map(lc => (
                      <SelectItem key={lc.id} value={lc.id}>{lc.lcNumber} — {lc.supplierName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* LC & Freight Cost Breakdown Calculator (duplicated from LC) */}
            {(() => {
              const selectedLc = lcs.find(l => l.id === form.lcId);
              if (!selectedLc) return null;
              return (
                <div className="rounded-md border border-border bg-card">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
                    <Calculator className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-base font-semibold text-primary">
                      LC & Freight Cost Breakdown Calculator
                    </h3>
                    <span className="ml-auto text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                      From {selectedLc.lcNumber}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-[0.7rem] text-muted-foreground mb-3">
                      Pre-filled from the selected LC. Record LC Settlement Payables and Sea Freight Payables here.
                    </p>
                    <LCCostCalculator
                      key={selectedLc.id}
                      initialBank={selectedLc.issuingBank ?? ""}
                      initialLcNumber={selectedLc.lcNumber ?? ""}
                      initialFcyValue={String(selectedLc.fobValueUsd ?? "")}
                      initialOpeningRate={String(EXCHANGE_RATE)}
                      initialTotalUnits={String(selectedLc.totalQuantity ?? "")}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Logistics Info */}
            <div>
              <h3 className="text-xs font-semibold text-primary mb-3 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Logistics Info
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Origin</Label>
                  <Input value={form.origin} onChange={e => field("origin", e.target.value)} placeholder="Shanghai, China" data-testid="input-origin" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Destination</Label>
                  <Input value={form.destination} onChange={e => field("destination", e.target.value)} placeholder="Addis Ababa, ET" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Shipment Status</Label>
                  <Select value={form.status} onValueChange={v => field("status", v)}>
                    <SelectTrigger data-testid="select-shipment-status"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ETD Date</Label>
                  <Input type="date" value={form.etdDate ?? ""} onChange={e => field("etdDate", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ETA Date</Label>
                  <Input type="date" value={form.etaDate ?? ""} onChange={e => field("etaDate", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bill Number</Label>
                  <Input value={form.billNumber ?? ""} onChange={e => field("billNumber", e.target.value)} placeholder="BL-XXXXX" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Declaration Number</Label>
                  <Input value={form.declarationNumber ?? ""} onChange={e => field("declarationNumber", e.target.value)} placeholder="DEC-XXXXX" />
                </div>
              </div>
            </div>

            {/* Supplier & Terms */}
            <div>
              <h3 className="text-xs font-semibold text-primary mb-3">Supplier & Terms</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Supplier Name</Label>
                  <Input value={form.supplierName ?? ""} onChange={e => field("supplierName", e.target.value)} placeholder="Supplier Ltd" data-testid="input-shipment-supplier" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Payment Term</Label>
                  <Input value={form.paymentTerm ?? ""} onChange={e => field("paymentTerm", e.target.value)} placeholder="e.g. FOB, CIF" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Supplier Address</Label>
                  <Input value={form.supplierAddress ?? ""} onChange={e => field("supplierAddress", e.target.value)} placeholder="Business District, City" />
                </div>
              </div>
            </div>

            {/* Goods */}
            <div>
              <h3 className="text-xs font-semibold text-primary mb-3">Description of Goods</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-3">
                  <Label className="text-xs">Item Description</Label>
                  <Input value={form.descriptionOfGoods ?? ""} onChange={e => field("descriptionOfGoods", e.target.value)} placeholder="e.g. Industrial Pumps, Solar Panels" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total Value (USD)</Label>
                  <Input type="number" value={form.totalValueUsd ?? "0"} onChange={e => field("totalValueUsd", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Documents */}
            <div>
              <h3 className="text-xs font-semibold text-primary mb-3">Collected Documents</h3>
              <div className="grid grid-cols-2 gap-2">
                {DOCUMENT_TYPES.map(doc => (
                  <div key={doc} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedDocs.includes(doc)}
                      onCheckedChange={() => toggleDoc(doc)}
                      data-testid={`checkbox-doc-${doc.toLowerCase().replace(/\s+/g, "-")}`}
                    />
                    <Label className="text-xs">{doc}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Financials */}
            <div>
              <h3 className="text-xs font-semibold text-primary mb-3">Financials (ETB)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ["transitPayableEtb", "Transit Payable ETB"],
                  ["inlandPayableEtb", "Inland Payable ETB"],
                  ["customsToWarehouseEtb", "Customs to Warehouse"],
                  ["advancedTaxEtb", "Advanced Tax Payable"],
                  ["demurragePayableEtb", "Demurrage Payable (if any)"],
                ].map(([k, label]) => (
                  <div key={k} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input type="number" value={form[k] ?? "0"} onChange={e => field(k, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-shipment">
              {editShipment ? "Update Shipment" : "Create Shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
