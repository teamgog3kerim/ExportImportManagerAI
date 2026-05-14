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
import { Plus, Search, Send, Pencil, Trash2, Ship, MapPin, Anchor, FileText } from "lucide-react";
import type { ExportShipment, Cad } from "@shared/schema";

const ORIGINS = ["Modjo Dry Port", "Addis Ababa Central", "Awasa Hub", "Kality A1", "Dire Dawa Warehouse"];
const PORTS = ["Djibouti", "Berbera", "Port Sudan", "Mombasa"];
const DESTINATIONS = ["Hamburg Port", "Rotterdam Port", "Antwerp Port", "Genoa Port", "Jeddah Islamic Port", "Jebel Ali Port", "Shanghai Port", "Mundra Port", "New York Port"];
const COUNTRIES = ["Germany", "Netherlands", "Belgium", "Italy", "Saudi Arabia", "UAE", "China", "India", "USA", "United Kingdom"];
const STATUSES = ["Preparing", "At Origin Warehouse", "In Transit to Port", "At Djibouti Port", "Sea Transit", "Arrived at Destination", "Delivered"];
const DOC_OPTIONS = ["Commercial Invoice", "Bill of Lading", "Certificate of Origin", "Phytosanitary Certificate", "ECX Quality Certificate", "Packing List", "Insurance Certificate", "SGS Inspection", "Fumigation Certificate"];
const CERT_OPTIONS = ["Organic (USDA)", "Fairtrade", "Rainforest Alliance", "UTZ", "Leather Working Group (LWG)", "Halal", "ISO 22000"];

function statusVariant(s: string): any {
  if (s === "Delivered") return "default";
  if (s === "Sea Transit" || s === "Arrived at Destination") return "secondary";
  if (s === "Preparing") return "outline";
  return "secondary";
}

export default function ExportShipments() {
  const { toast } = useToast();
  const { data: shipments = [], isLoading } = useQuery<ExportShipment[]>({ queryKey: ["/api/export/shipments"] });
  const { data: cads = [] } = useQuery<Cad[]>({ queryKey: ["/api/export/cads"] });
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState<ExportShipment | null>(null);

  const emptyForm = {
    exportRef: "", cadId: "", origin: "Modjo Dry Port", port: "Djibouti",
    destination: "Hamburg Port", destinationCountry: "Germany", buyerName: "",
    status: "Preparing", etdDate: "", etaDate: "",
    vesselName: "", containerNumber: "", blNumber: "", declarationNumber: "",
    productDescription: "", quantityKg: "0", fobValueUsd: "0", freightUsd: "0",
    insuranceEtb: "0", inlandTransportEtb: "0", customsClearanceEtb: "0", portHandlingEtb: "0",
    documents: "[]", certifications: "[]",
  };
  const [form, setForm] = useState<any>(emptyForm);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/export/shipments", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/export/shipments"] }); setOpenModal(false); toast({ title: "Shipment created" }); },
    onError: () => toast({ title: "Error creating shipment", variant: "destructive" }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: any) => apiRequest("PATCH", `/api/export/shipments/${id}`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/export/shipments"] }); setOpenModal(false); toast({ title: "Shipment updated" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/export/shipments/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/export/shipments"] }); toast({ title: "Shipment deleted" }); },
  });

  function openNew() { setEditItem(null); setForm(emptyForm); setSelectedDocs([]); setSelectedCerts([]); setOpenModal(true); }
  function openEdit(s: ExportShipment) {
    setEditItem(s); setForm({ ...s, cadId: s.cadId ?? "" });
    try { setSelectedDocs(JSON.parse(s.documents ?? "[]")); } catch { setSelectedDocs([]); }
    try { setSelectedCerts(JSON.parse(s.certifications ?? "[]")); } catch { setSelectedCerts([]); }
    setOpenModal(true);
  }
  function field(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }
  function pickCad(cadId: string) {
    const cad = cads.find(c => c.id === cadId);
    if (!cad) return;
    setForm((p: any) => ({
      ...p, cadId,
      buyerName: cad.buyerName,
      destinationCountry: cad.buyerCountry ?? p.destinationCountry,
      productDescription: cad.productDescription ?? "",
      quantityKg: cad.quantityKg,
      fobValueUsd: cad.fobValueUsd,
      freightUsd: cad.freightUsd,
    }));
  }
  function toggleDoc(d: string) {
    setSelectedDocs(prev => {
      const next = prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d];
      setForm((p: any) => ({ ...p, documents: JSON.stringify(next) }));
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
    const body = { ...form, documents: JSON.stringify(selectedDocs), certifications: JSON.stringify(selectedCerts), cadId: form.cadId || null };
    if (editItem) updateMutation.mutate({ id: editItem.id, body });
    else createMutation.mutate(body);
  }

  const filtered = shipments.filter(s => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    const q = search.toLowerCase();
    return (s.exportRef + " " + s.origin + " " + s.destination + " " + (s.buyerName ?? "")).toLowerCase().includes(q);
  });

  const totalFob = shipments.reduce((sum, s) => sum + Number(s.fobValueUsd), 0);
  const inTransit = shipments.filter(s => s.status === "Sea Transit" || s.status === "At Djibouti Port").length;
  const delivered = shipments.filter(s => s.status === "Delivered").length;
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

  // Cost summary for current form (in ETB equivalent)
  const formRate = 129.67;
  const fobEtb = Number(form.fobValueUsd) * formRate;
  const totalEtbCost = Number(form.insuranceEtb) + Number(form.inlandTransportEtb) + Number(form.customsClearanceEtb) + Number(form.portHandlingEtb);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        eyebrow="Export · Logistics"
        title="Export Shipments"
        description="Track outbound consignments from Ethiopian origins through transit ports to international destinations."
        actions={
          <Button onClick={openNew} data-testid="button-create-export-shipment">
            <Plus className="h-4 w-4 mr-1.5" /> New Shipment
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Total Shipments</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-total-shipments">{shipments.length}</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <Send className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold mt-1 text-amber-600" data-testid="text-in-transit">{inTransit}</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <Ship className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600" data-testid="text-delivered">{delivered}</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <Anchor className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Total FOB Value</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-total-fob">${fmt(totalFob)}</p>
              </div>
              <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search ref, origin, destination, buyer..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-shipment-search" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]" data-testid="select-filter-shipment-status"><SelectValue /></SelectTrigger>
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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Export Ref</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Route</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Buyer</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Vessel / BL</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">ETD → ETA</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Quantity</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">FOB USD</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No shipments found</td></tr>
                ) : filtered.map((s, i) => (
                  <tr key={s.id} className="border-b last:border-0 hover-elevate" data-testid={`row-export-shipment-${i}`}>
                    <td className="px-4 py-3 font-semibold text-primary">{s.exportRef}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="font-medium">{s.origin}</span>
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{s.port}</span>
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{s.destination}</span>
                      </div>
                      <p className="text-muted-foreground mt-0.5">{s.destinationCountry}</p>
                    </td>
                    <td className="px-4 py-3">{s.buyerName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.vesselName || "—"}</p>
                      <p className="text-muted-foreground font-mono">{s.blNumber || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p>{s.etdDate || "—"}</p>
                      <p>→ {s.etaDate || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(Number(s.quantityKg))} kg</td>
                    <td className="px-4 py-3 text-right font-bold">${fmt(Number(s.fobValueUsd))}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(s.status ?? "")}>{s.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(s)} data-testid={`button-edit-export-${i}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(s.id)} data-testid={`button-delete-export-${i}`}>
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
              <Send className="h-4 w-4 text-primary" />
              {editItem ? "Update Export Shipment" : "New Export Shipment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editItem && cads.length > 0 && (
              <div className="rounded-md bg-muted p-3 space-y-1.5">
                <p className="text-xs font-semibold flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-primary" /> Link to existing CAD</p>
                <p className="text-xs text-muted-foreground">Auto-fill buyer, product, FOB from a CAD contract</p>
                <Select value={form.cadId} onValueChange={pickCad}>
                  <SelectTrigger data-testid="select-link-cad"><SelectValue placeholder="Select a CAD..." /></SelectTrigger>
                  <SelectContent>
                    {cads.map(c => <SelectItem key={c.id} value={c.id}>{c.cadNumber} — {c.buyerName} (${Number(c.totalContractUsd).toLocaleString()})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Export Reference</Label>
                <Input value={form.exportRef ?? ""} onChange={e => field("exportRef", e.target.value)} placeholder="Auto-generated if empty" data-testid="input-export-ref" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={form.status ?? "Preparing"} onValueChange={v => field("status", v)}>
                  <SelectTrigger data-testid="select-shipment-status"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Route</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Origin (Ethiopia)</Label>
                  <Select value={form.origin ?? "Modjo Dry Port"} onValueChange={v => field("origin", v)}>
                    <SelectTrigger data-testid="select-origin"><SelectValue /></SelectTrigger>
                    <SelectContent>{ORIGINS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Transit Port</Label>
                  <Select value={form.port ?? "Djibouti"} onValueChange={v => field("port", v)}>
                    <SelectTrigger data-testid="select-port"><SelectValue /></SelectTrigger>
                    <SelectContent>{PORTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Destination Port</Label>
                  <Select value={form.destination ?? "Hamburg Port"} onValueChange={v => field("destination", v)}>
                    <SelectTrigger data-testid="select-destination"><SelectValue /></SelectTrigger>
                    <SelectContent>{DESTINATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Destination Country</Label>
                  <Select value={form.destinationCountry ?? "Germany"} onValueChange={v => field("destinationCountry", v)}>
                    <SelectTrigger data-testid="select-dest-country"><SelectValue /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ETD</Label>
                  <Input type="date" value={form.etdDate ?? ""} onChange={e => field("etdDate", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">ETA</Label>
                  <Input type="date" value={form.etaDate ?? ""} onChange={e => field("etaDate", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Vessel & Customs</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Buyer Name</Label>
                  <Input value={form.buyerName ?? ""} onChange={e => field("buyerName", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vessel Name</Label>
                  <Input value={form.vesselName ?? ""} onChange={e => field("vesselName", e.target.value)} placeholder="e.g. MAERSK SEMARANG" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Container Number</Label>
                  <Input value={form.containerNumber ?? ""} onChange={e => field("containerNumber", e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bill of Lading #</Label>
                  <Input value={form.blNumber ?? ""} onChange={e => field("blNumber", e.target.value)} className="font-mono" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Customs Declaration #</Label>
                  <Input value={form.declarationNumber ?? ""} onChange={e => field("declarationNumber", e.target.value)} className="font-mono" placeholder="EXP-DEC-..." />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Goods & Values</p>
              <div className="space-y-1">
                <Label className="text-xs">Product Description</Label>
                <Input value={form.productDescription ?? ""} onChange={e => field("productDescription", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Quantity (kg)</Label>
                  <Input type="number" value={form.quantityKg} onChange={e => field("quantityKg", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">FOB Value (USD)</Label>
                  <Input type="number" value={form.fobValueUsd} onChange={e => field("fobValueUsd", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Freight (USD)</Label>
                  <Input type="number" value={form.freightUsd} onChange={e => field("freightUsd", e.target.value)} />
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Local Costs (ETB)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Inland Transport</Label>
                  <Input type="number" value={form.inlandTransportEtb} onChange={e => field("inlandTransportEtb", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Customs Clearance</Label>
                  <Input type="number" value={form.customsClearanceEtb} onChange={e => field("customsClearanceEtb", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Port Handling</Label>
                  <Input type="number" value={form.portHandlingEtb} onChange={e => field("portHandlingEtb", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Insurance</Label>
                  <Input type="number" value={form.insuranceEtb} onChange={e => field("insuranceEtb", e.target.value)} />
                </div>
              </div>
              {(fobEtb > 0 || totalEtbCost > 0) && (
                <div className="rounded-md bg-muted p-2 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">FOB equivalent (ETB)</span><span className="font-medium">{fmt(fobEtb)} ETB</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total local export costs</span><span className="font-bold">{fmt(totalEtbCost)} ETB</span></div>
                </div>
              )}
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Documents Attached</p>
              <div className="flex flex-wrap gap-1.5">
                {DOC_OPTIONS.map(d => (
                  <Badge key={d} variant={selectedDocs.includes(d) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleDoc(d)} data-testid={`badge-shipment-doc-${d.replace(/\s+/g, "-")}`}>{d}</Badge>
                ))}
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Certifications</p>
              <div className="flex flex-wrap gap-1.5">
                {CERT_OPTIONS.map(c => (
                  <Badge key={c} variant={selectedCerts.includes(c) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleCert(c)} data-testid={`badge-shipment-cert-${c.replace(/\s+/g, "-")}`}>{c}</Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button onClick={submit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-export-shipment">
              {editItem ? "Save Updates" : "Create Shipment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
