import { useState, useMemo, useEffect, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  RotateCcw, Save, Printer, Download, Trash2, FolderOpen, Search, Package, Boxes,
  ArrowRightLeft, BarChart3,
} from "lucide-react";

const NUM_DEFAULTS: Record<string, number> = {
  units: 3, fobPU: 13400, seaFreight: 8000, marginOpen: 1,
  rateO: 158.324, rateS: 160.2345, rateT: 161.6483,
  monthlyPct: 1.8, projMonths: 3,
  i_N19: 1000, i_F21: 0.04, i_F22: 0.15, i_F25: 0.15, i_F26: 0.025,
  i_N27: 200, i_F28: 0.15, i_F29: 0.04, i_F30: 0.15, i_F31: 0.025,
  i_E34: 0.0007, i_F34: 0.06, i_G34: 0.15, i_H34: 0.03, i_I34: 0.03,
  i_J39: 35000, i_unstaf: 0, i_trucks: 0, i_bb: 0, i_cont: 0, i_dem: 0, i_contRet: 0,
  i_J48: 25000, i_J49: 2400000, i_driven: 0, i_portIns: 0, i_local: 0, i_delivery: 0,
  i_K55: 0.0005, volume: 0, weight: 0,
};

const DEFAULTS: Record<string, string> = {
  supplier: "", customer: "", payTerms: "CIF", invoiceNo: "", transport: "Sea freight",
  model: "", descGoods: "", lcNumber: "", lotNo: "", origin: "CHINA",
  deliveryPt: "ADDIS ABABA", bankName: "", containerType: '20"', statusSel: "draft",
  volume: "", weight: "",
  units: "3", fobPU: "13400", seaFreight: "8000", marginOpen: "1",
  rateO: "158.324", rateS: "160.2345", rateT: "161.6483",
  monthlyPct: "1.8", projMonths: "3",
  i_N19: "1000", i_F21: "0.04", i_F22: "0.15", i_F25: "0.15", i_F26: "0.025",
  i_N27: "200", i_F28: "0.15", i_F29: "0.04", i_F30: "0.15", i_F31: "0.025",
  i_E34: "0.0007", i_F34: "0.06", i_G34: "0.15", i_H34: "0.03", i_I34: "0.03",
  i_J39: "35000", i_unstaf: "0", i_trucks: "0", i_bb: "0", i_cont: "0", i_dem: "0", i_contRet: "0",
  i_J48: "25000", i_J49: "2400000", i_driven: "0", i_portIns: "0", i_local: "0", i_delivery: "0",
  i_K55: "0.0005",
};

const STORAGE_KEY = "lc_records";

const fmt = (n: number, d = 2) =>
  !isFinite(n) || isNaN(n) ? "—"
    : Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fpct4 = (n: number) => (isNaN(n) ? "—" : (n * 100).toFixed(4) + "%");
const fpct2 = (n: number) => (isNaN(n) ? "—" : (n * 100).toFixed(2) + "%");

interface SavedRecord {
  id: number;
  name: string;
  status: string;
  notes: string;
  date: string;
  data: Record<string, string>;
}

function getRecords(): SavedRecord[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function persistRecords(r: SavedRecord[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); } catch { /* storage full */ }
}

export default function CostEstimator() {
  const { toast } = useToast();
  const [f, setF] = useState<Record<string, string>>({ ...DEFAULTS });
  const [records, setRecords] = useState<SavedRecord[]>(() => getRecords());
  const [search, setSearch] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveStatus, setSaveStatus] = useState("draft");
  const [saveNotes, setSaveNotes] = useState("");

  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const g = (k: string) => {
    const x = parseFloat(f[k]);
    return isNaN(x) ? (NUM_DEFAULTS[k] ?? 0) : x;
  };

  const c = useMemo(() => {
    const units = Math.max(1, g("units"));
    const fobPU = g("fobPU");
    const N5 = fobPU * units;
    const J8 = g("seaFreight");
    const rateO = g("rateO");
    const rateS = g("rateS");
    const rateT = g("rateT");
    const mOpen = g("marginOpen");
    const monthPct = g("monthlyPct") / 100;
    const projMo = g("projMonths");

    const H11 = rateO > 0 ? (rateS - rateO) / rateO : 0;
    const J11 = rateO > 0 ? (rateT - rateO) / rateO : 0;
    const M11 = J11 + monthPct * projMo;
    const forecastRate = rateT * (1 + M11);

    const M14 = fobPU;
    const N14 = M14 * rateS;
    const fobEtbTotal = N5 * rateS;
    const M15 = J8 / units;
    const N15 = M15 * rateS;
    const N16 = N14 + N15;
    const CFtotal = N16 * units;

    const K18 = 0.02;
    const J18 = N14 * K18;
    const N18 = J18 / units;
    const N17 = N16 + N18;

    const N19 = g("i_N19");

    const F21 = g("i_F21"); const N21 = N14 * F21; const J21 = N21 * units;
    const F22 = g("i_F22"); const N22 = N21 * F22; const J22 = N22 * units;
    const F23 = mOpen;
    const F24 = 1 - F23;
    const N24 = 0; const J23 = 0; const J24 = N24 * units;
    const F25 = g("i_F25"); const N25 = F25 * N24; const J25 = N25 * units;
    const F26 = g("i_F26"); const N26 = N14 * F26; const J26 = N26 * units;
    const N27 = g("i_N27"); const J27 = N27 * units;
    const F28 = g("i_F28"); const N28 = N27 * F28; const J28 = N28 * units;
    const F29 = g("i_F29"); const N29 = N15 * F29; const J29 = N29 * units;
    const F30 = g("i_F30"); const N30 = N29 * F30; const J30 = N30 * units;
    const F31 = g("i_F31"); const N31 = N15 * F31; const J31 = N31 * units;

    const E34 = g("i_E34"), F34 = g("i_F34"), G34 = g("i_G34"), H34 = g("i_H34"), I34 = g("i_I34");
    const J34 = E34 + F34 + G34 + H34 + I34;

    const J37 = 2400 * rateS; const N37 = J37 / units;
    const J38 = 3410 * rateS; const N38 = J38 / units;
    const N39 = g("i_J39") / units;

    const M34 = (N17 + N38 + N39) * J34;
    const N34 = M34;

    const Ntrucks = (g("i_trucks") * rateS) / units;
    const Nbb = (g("i_bb") * rateS) / units;
    const Ncont = (g("i_cont") * rateS) / units;
    const Ndem = (g("i_dem") * rateS) / units;
    const NcontRet = g("i_contRet");
    const Nunstaf = g("i_unstaf") / units;

    const J48 = g("i_J48"); const N48 = J48 / units;
    const J49 = g("i_J49");
    const Ndriven = g("i_driven");
    const NportIns = g("i_portIns");

    const G52 = E34;
    const M52 = CFtotal * G52;
    const scanPU = M52 / units;

    const Nlocal = g("i_local");
    const Ndelivery = g("i_delivery");
    const K55 = g("i_K55");
    const N55 = K55 * N16;
    const M55 = rateS > 0 ? N55 / rateS : 0;

    const N56 = (N17 - N18)
      + N19
      + N21 + N22 + N24 + N25 + N26
      + N27 + N28 + N29 + N30 + N31
      + N34
      + N37 + N38 + N39
      + Nunstaf
      + Ntrucks + Nbb + Ncont + Ndem + NcontRet
      + N48 + (J49 / units)
      + Ndriven + NportIns
      + scanPU
      + Nlocal + Ndelivery
      + N55;

    const N57 = N56;
    const N58 = M14 > 0 ? N57 / M14 : 0;

    const kRates = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1];
    const allRates: (number | "forecast")[] = [...kRates, "forecast", 0.05, 0];
    const sup = f.supplier || "";
    const lc = f.lcNumber || "";
    const margin = allRates.map((k, idx) => {
      const isFc = k === "forecast";
      const K = isFc ? M11 : (k as number);
      const L = K * N57;
      const Ndp = L + N57;
      const I = M14 > 0 ? Ndp / M14 : 0;
      const isFirst = idx === 0;
      const isZero = k === 0;
      let desc: string;
      if (isFc) desc = `Forecasted Sales Value — ${projMo} Month${projMo > 1 ? "s" : ""}`;
      else if (isFirst) desc = sup || "Primary Scenario";
      else if (idx === 1) desc = "LC No: " + (lc || "—");
      else if (isZero) desc = "Zero Margin — Cost Price Only";
      else desc = "Scenario " + (K * 100).toFixed(0) + "%";
      return { kind: isFc ? "forecast" : isZero ? "zero" : "normal", K, L, Ndp, I, desc, isFirst };
    });

    return {
      units, fobPU, N5, rateS, mOpen, projMo, M11,
      H11, J11, forecastRate,
      M14, N14, fobEtbTotal, M15, N15, N16, N17, N18, J18,
      N19, F21, N21, J21, F22, N22, J22, F23, F24, J23, J24, N24,
      F25, N25, J25, F26, N26, J26, N27, J27, F28, N28, J28,
      F29, N29, J29, F30, N30, J30, F31, N31, J31,
      E34, F34, G34, H34, I34, J34, M34, N34,
      J37, N37, J38, N38, N39,
      Ntrucks, Nbb, Ncont, Ndem, NcontRet, Nunstaf,
      J48, N48, J49, Ndriven, NportIns,
      G52, scanPU, M52, Nlocal, Ndelivery, K55, N55, M55,
      N56, N57, N58,
      margin,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f]);

  useEffect(() => { setRecords(getRecords()); }, []);

  const filteredRecords = records.filter(r => {
    const q = search.toLowerCase();
    return !q || r.name.toLowerCase().includes(q)
      || (r.notes || "").toLowerCase().includes(q)
      || (r.data?.supplier || "").toLowerCase().includes(q);
  });

  const openSave = () => {
    const inv = f.invoiceNo || "";
    const sup = f.supplier || "";
    setSaveName(inv || (sup ? sup + " — " : "") + new Date().toLocaleDateString("en-GB"));
    setSaveStatus(f.statusSel || "draft");
    setSaveNotes("");
    setSaveOpen(true);
  };

  const saveRecord = () => {
    const name = saveName.trim() || ("Record — " + new Date().toLocaleDateString());
    const rec: SavedRecord = {
      id: Date.now(), name, status: saveStatus, notes: saveNotes.trim(),
      date: new Date().toISOString(), data: { ...f },
    };
    const next = [rec, ...records];
    persistRecords(next);
    setRecords(next);
    setSaveOpen(false);
    toast({ title: "Record saved", description: name });
  };

  const loadRecord = (id: number) => {
    const rec = records.find(r => r.id === id);
    if (!rec) return;
    setF({ ...DEFAULTS, ...rec.data });
    toast({ title: "Record loaded", description: rec.name });
  };

  const deleteRecord = (id: number) => {
    const next = records.filter(r => r.id !== id);
    persistRecords(next);
    setRecords(next);
    toast({ title: "Record deleted", variant: "destructive" });
  };

  const clearAll = () => {
    persistRecords([]);
    setRecords([]);
    toast({ title: "All records cleared", variant: "destructive" });
  };

  const exportCSV = () => {
    if (!records.length) { toast({ title: "No records to export", variant: "destructive" }); return; }
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const hdr = "ID,Name,Status,Date,Supplier,Units,FOB/Unit (USD),Settlement Rate,Notes\n";
    const rows = records.map(r => {
      const d = r.data || {};
      return [esc(r.id), esc(r.name), esc(r.status), esc(new Date(r.date).toLocaleDateString("en-GB")),
        esc(d.supplier || ""), esc(d.units || ""), esc(d.fobPU || ""), esc(d.rateS || ""), esc(r.notes || "")].join(",");
    });
    const blob = new Blob([hdr + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "LC_Records_" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported" });
  };

  const resetAll = () => { setF({ ...DEFAULTS }); toast({ title: "Fields reset to defaults" }); };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        eyebrow="Import · Landed Cost"
        title="Cost Estimator"
        description="Build up the full landed cost per unit — invoice, insurance, bank charges, duties, port, warehouse and margin scenarios."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={resetAll} data-testid="button-reset">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
            <Button variant="outline" size="sm" onClick={openSave} data-testid="button-save-record">
              <Save className="h-4 w-4" /> Save Record
            </Button>
            <Button size="sm" onClick={() => window.print()} data-testid="button-print">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary" data-testid="badge-units">Units: {c.units}</Badge>
        <Badge variant="secondary" data-testid="badge-fob">FOB Total: {fmt(c.N5)} USD</Badge>
        <Badge data-testid="badge-landed">Landed Cost / Unit: {fmt(c.N57)} ETB</Badge>
      </div>

      <Tabs defaultValue="input" className="w-full">
        <TabsList>
          <TabsTrigger value="input" data-testid="tab-input">Shipment Input</TabsTrigger>
          <TabsTrigger value="costs" data-testid="tab-costs">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="margin" data-testid="tab-margin">Margin Analysis</TabsTrigger>
          <TabsTrigger value="records" data-testid="tab-records">Records ({records.length})</TabsTrigger>
        </TabsList>

        {/* ===== INPUT ===== */}
        <TabsContent value="input" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <SummaryCard label="Landed Cost / Unit" value={fmt(c.N57)} unit="ETB per unit" testid="summary-landed" />
            <SummaryCard label="Total Cost (All Units)" value={fmt(c.N57 * c.units)} unit="Grand total ETB" testid="summary-total" />
            <SummaryCard label="CIF Value / Unit" value={fmt(c.N17)} unit="Cost, Insurance & Freight" testid="summary-cif" />
            <SummaryCard label="Taxes & Duties / Unit" value={fmt(c.N34)} unit="Customs payable ETB" testid="summary-duty" />
            <SummaryCard label="Cost Rate" value={fmt(c.N58, 6)} unit="ETB per USD" testid="summary-rate" />
          </div>

          <Card className="overflow-hidden">
            <SectionHeader icon={<Package className="h-4 w-4" />} title="Shipment Information" badge="Header Fields" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
              <Field label="Supplier"><Input value={f.supplier} onChange={e => set("supplier", e.target.value)} placeholder="Supplier name" data-testid="input-supplier" /></Field>
              <Field label="Customer"><Input value={f.customer} onChange={e => set("customer", e.target.value)} placeholder="Customer name" data-testid="input-customer" /></Field>
              <Field label="Payment Terms"><Input value={f.payTerms} onChange={e => set("payTerms", e.target.value)} data-testid="input-payterms" /></Field>
              <Field label="Invoice No."><Input value={f.invoiceNo} onChange={e => set("invoiceNo", e.target.value)} placeholder="Invoice number" data-testid="input-invoice" /></Field>
              <Field label="Mode of Transport"><Input value={f.transport} onChange={e => set("transport", e.target.value)} data-testid="input-transport" /></Field>
              <Field label="Model"><Input value={f.model} onChange={e => set("model", e.target.value)} placeholder="Product model" data-testid="input-model" /></Field>
              <Field label="Description of Goods"><Input value={f.descGoods} onChange={e => set("descGoods", e.target.value)} placeholder="Description" data-testid="input-descgoods" /></Field>
              <Field label="LC Number"><Input value={f.lcNumber} onChange={e => set("lcNumber", e.target.value)} placeholder="LC number" data-testid="input-lcnumber" /></Field>
              <Field label="Lot No."><Input value={f.lotNo} onChange={e => set("lotNo", e.target.value)} placeholder="Lot number" data-testid="input-lotno" /></Field>
              <Field label="Origin"><Input value={f.origin} onChange={e => set("origin", e.target.value)} data-testid="input-origin" /></Field>
              <Field label="Delivery Point"><Input value={f.deliveryPt} onChange={e => set("deliveryPt", e.target.value)} data-testid="input-delivery" /></Field>
              <Field label="Bank Name"><Input value={f.bankName} onChange={e => set("bankName", e.target.value)} placeholder="Bank" data-testid="input-bank" /></Field>
            </div>
            <div className="bg-muted px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-y">Quantity & Invoice Value</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
              <Field label="Units (Qty)"><Input type="number" min="1" value={f.units} onChange={e => set("units", e.target.value)} className="text-right font-mono" data-testid="input-qty" /></Field>
              <Field label="FOB per Unit (USD)"><Input type="number" value={f.fobPU} onChange={e => set("fobPU", e.target.value)} className="text-right font-mono" data-testid="input-fobpu" /></Field>
              <Field label="Sea Freight Cost — Total (USD)"><Input type="number" value={f.seaFreight} onChange={e => set("seaFreight", e.target.value)} className="text-right font-mono" data-testid="input-seafreight" /></Field>
              <Field label="Margin Opening %"><Input type="number" step="0.01" value={f.marginOpen} onChange={e => set("marginOpen", e.target.value)} className="text-right font-mono" data-testid="input-marginopen" /></Field>
              <Field label="Total FOB Value (USD)">
                <div className="flex h-9 items-center justify-end rounded-md border bg-secondary px-3 font-mono text-sm font-semibold" data-testid="text-total-fob">{fmt(c.N5)} USD</div>
              </Field>
              <Field label="Container Type">
                <Select value={f.containerType} onValueChange={v => set("containerType", v)}>
                  <SelectTrigger data-testid="select-container"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='20"'>20"</SelectItem>
                    <SelectItem value='40"'>40"</SelectItem>
                    <SelectItem value="RoRo">RoRo</SelectItem>
                    <SelectItem value="Tender">Tender</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Volume (CBM)"><Input type="number" value={f.volume} onChange={e => set("volume", e.target.value)} placeholder="CBM" className="text-right font-mono" data-testid="input-volume" /></Field>
              <Field label="Weight (Tons)"><Input type="number" value={f.weight} onChange={e => set("weight", e.target.value)} placeholder="Tons" className="text-right font-mono" data-testid="input-weight" /></Field>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <SectionHeader icon={<ArrowRightLeft className="h-4 w-4" />} title="Exchange Rates" badge="ETB / USD" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
              <Field label="Opening Exchange Rate"><Input type="number" step="0.001" value={f.rateO} onChange={e => set("rateO", e.target.value)} className="text-right font-mono" data-testid="input-rate-open" /></Field>
              <Field label="Settlement Exchange Rate"><Input type="number" step="0.001" value={f.rateS} onChange={e => set("rateS", e.target.value)} className="text-right font-mono" data-testid="input-rate-settle" /></Field>
              <Field label="Report Date Exchange Rate"><Input type="number" step="0.001" value={f.rateT} onChange={e => set("rateT", e.target.value)} className="text-right font-mono" data-testid="input-rate-today" /></Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/50 px-4 py-4 border-y">
              <RateStat label="Opening → Settlement Increment" value={fpct4(c.H11)} testid="stat-incr-os" />
              <RateStat label="Opening → Today Increment" value={fpct4(c.J11)} testid="stat-incr-ot" />
              <RateStat label="Forecasted Increment" value={fpct4(c.M11)} accent testid="stat-incr-f" />
            </div>
            <div className="flex flex-wrap items-end gap-4 p-4">
              <Field label="Avg Monthly Increment %" className="w-40"><Input type="number" step="0.01" value={f.monthlyPct} onChange={e => set("monthlyPct", e.target.value)} className="text-right font-mono" data-testid="input-monthly" /></Field>
              <Field label="Projection Months" className="w-36"><Input type="number" min="1" step="1" value={f.projMonths} onChange={e => set("projMonths", e.target.value)} className="text-right font-mono" data-testid="input-projmonths" /></Field>
              <Field label="Forecasted Rate (ETB/USD)" className="w-48">
                <div className="flex h-9 items-center justify-end rounded-md border bg-secondary px-3 font-mono text-sm font-semibold" data-testid="text-forecast-rate">{fmt(c.forecastRate, 4)}</div>
              </Field>
              <Field label="Record Status" className="w-44">
                <Select value={f.statusSel} onValueChange={v => set("statusSel", v)}>
                  <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="review">Under Review</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Card>
        </TabsContent>

        {/* ===== COSTS ===== */}
        <TabsContent value="costs" className="space-y-6 mt-6">
          <Card className="overflow-hidden">
            <SectionHeader icon={<Boxes className="h-4 w-4" />} title="Full Landed Cost Breakdown" badge="Birr Values per Unit (ETB)" />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" style={{ minWidth: "940px" }}>
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ minWidth: "280px" }}>Cost Line Item</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">Rate</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">Foreign Total</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">ETB Total</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">Cur.</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">Foreign / Unit</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">Birr / Unit</th>
                  </tr>
                </thead>
                <tbody>
                  <SecRow label="1. Invoice Amount" />
                  <Row label="FOB Charges" rate={fmt(c.rateS, 4)} fc={`${fmt(c.N5)} USD`} etb={`${fmt(c.fobEtbTotal)} ETB`} cur="USD" fg={fmt(c.M14, 4)} birr={fmt(c.N14)} birrTeal />
                  <Row label="Freight Charge" rate={fmt(c.rateS, 4)} fc="—" etb="—" cur="USD" fg={fmt(c.M15, 4)} birr={fmt(c.N15)} birrTeal />
                  <HiRow label="Cost & Freight (C&F)" value={fmt(c.N16)} tone="teal" />
                  <HiRow label="Cost, Insurance & Freight (CIF)" value={fmt(c.N17)} tone="blue" />

                  <SecRow label="2. Insurance" />
                  <Row label="Insurance (Marine)" rate="" fc={`${fmt(c.J18)} ETB`} etb={`${fmt(c.J18)} ETB`} cur="Birr" fg="—" birr={fmt(c.N18)} />
                  <Row label="Entry Certifications" rate="" fc="—" etb="—" cur="Birr" fg="—"
                    birrInput={<TI value={f.i_N19} onChange={v => set("i_N19", v)} testid="input-entrycert" />} />

                  <SecRow label="3. Bank Charges" />
                  <Row label="L/C Charges" rateInput={<TI value={f.i_F21} onChange={v => set("i_F21", v)} step="0.005" testid="input-f21" />} fc={fmt(c.J21)} etb="—" cur="Birr" fg="—" birr={fmt(c.N21)} />
                  <Row label="L/C Service Charge VAT" rateInput={<TI value={f.i_F22} onChange={v => set("i_F22", v)} step="0.01" testid="input-f22" />} fc={fmt(c.J22)} etb="—" cur="Birr" fg="—" birr={fmt(c.N22)} />
                  <Row label="Margin Hold" rate={fpct2(c.F23)} fc={fmt(c.J23)} etb="—" cur="—" fg="—" birr="—" />
                  <Row label="Unpaid Margin Service Charge" rate={fpct2(c.F24)} fc={fmt(c.J24)} etb="—" cur="—" fg="—" birr="—" />
                  <Row label="Unpaid Margin Charge VAT" rateInput={<TI value={f.i_F25} onChange={v => set("i_F25", v)} step="0.01" testid="input-f25" />} fc={fmt(c.J25)} etb="—" cur="—" fg="—" birr="—" />
                  <Row label="NBE Rate Payable" rateInput={<TI value={f.i_F26} onChange={v => set("i_F26", v)} step="0.005" testid="input-f26" />} fc={fmt(c.J26)} etb="—" cur="Birr" fg="—" birr={fmt(c.N26)} />
                  <Row label="SWIFT Charge" rate="" fc={fmt(c.J27)} etb="—" cur="Birr" fg="—"
                    birrInput={<TI value={f.i_N27} onChange={v => set("i_N27", v)} testid="input-swift" />} />
                  <Row label="SWIFT Charge VAT" rateInput={<TI value={f.i_F28} onChange={v => set("i_F28", v)} step="0.01" testid="input-f28" />} fc={fmt(c.J28)} etb="—" cur="Birr" fg="—" birr={fmt(c.N28)} />
                  <Row label="Sea Freight Service Charge" rateInput={<TI value={f.i_F29} onChange={v => set("i_F29", v)} step="0.005" testid="input-f29" />} fc={fmt(c.J29)} etb="—" cur="Birr" fg="—" birr={fmt(c.N29)} />
                  <Row label="Sea Freight Service Charge VAT" rateInput={<TI value={f.i_F30} onChange={v => set("i_F30", v)} step="0.01" testid="input-f30" />} fc={fmt(c.J30)} etb="—" cur="Birr" fg="—" birr={fmt(c.N30)} />
                  <Row label="Sea Freight Service Charge — NBE Payable" rateInput={<TI value={f.i_F31} onChange={v => set("i_F31", v)} step="0.005" testid="input-f31" />} fc={fmt(c.J31)} etb="—" cur="Birr" fg="—" birr={fmt(c.N31)} />

                  <SecRow label="4. Taxes & Duties" />
                  <tr>
                    <td colSpan={7} className="p-0">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-b">
                        <DutyCell label="Scanning %"><TI value={f.i_E34} onChange={v => set("i_E34", v)} step="0.0001" testid="input-e34" /></DutyCell>
                        <DutyCell label="Duty Tax %"><TI value={f.i_F34} onChange={v => set("i_F34", v)} step="0.01" testid="input-f34" /></DutyCell>
                        <DutyCell label="VAT %"><TI value={f.i_G34} onChange={v => set("i_G34", v)} step="0.01" testid="input-g34" /></DutyCell>
                        <DutyCell label="Withholding %"><TI value={f.i_H34} onChange={v => set("i_H34", v)} step="0.01" testid="input-h34" /></DutyCell>
                        <DutyCell label="Social Welfare %"><TI value={f.i_I34} onChange={v => set("i_I34", v)} step="0.01" testid="input-i34" /></DutyCell>
                        <DutyCell label="Total Tax Rate"><div className="font-mono text-base font-bold text-destructive pt-1" data-testid="text-totaltax">{fpct2(c.J34)}</div></DutyCell>
                      </div>
                    </td>
                  </tr>
                  <tr className="bg-accent/40 font-semibold">
                    <td className="px-3 py-1.5 pl-3">Actual Duty</td>
                    <td className="px-3 py-1.5" colSpan={4} />
                    <td className="px-3 py-1.5 text-right font-mono text-[hsl(var(--chart-4))]">{fmt(c.M34)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-[hsl(var(--chart-4))]" style={{ fontSize: "13px" }}>{fmt(c.N34)}</td>
                  </tr>

                  <SecRow label="5. Port Related Charges" />
                  <Row label="Port Charges — Djibouti Clearance" rate="" fc="—" etb={`${fmt(c.J37)} ETB`} cur="Birr" fg="—" birr={fmt(c.N37)} />
                  <Row label="Djibouti → Addis Ababa Transport" rate="" fc="—" etb={`${fmt(c.J38)} ETB`} cur="ETB" fg="—" birr={fmt(c.N38)} />
                  <Row label="Transport: Customs → Warehouse" rate="" fc="—" etb="—" cur="ETB" fg="—"
                    birrInput={<TI value={f.i_J39} onChange={v => set("i_J39", v)} testid="input-j39" />} />
                  <Row label="Container Unstuffing Costs" rate="" fc="—" etb="—" cur="ETB" fg="—"
                    birrInput={<TI value={f.i_unstaf} onChange={v => set("i_unstaf", v)} testid="input-unstaf" />} />

                  <SecRow label="5.2 Storage Charges (if any)" />
                  <Row label="Trucks / Construction Equipment" rate="" fc="—" etb="—" cur="USD"
                    fgInput={<TI value={f.i_trucks} onChange={v => set("i_trucks", v)} testid="input-trucks" />} birr={fmt(c.Ntrucks)} />
                  <Row label="Break Bulk" rate="" fc="—" etb="—" cur="USD"
                    fgInput={<TI value={f.i_bb} onChange={v => set("i_bb", v)} testid="input-bb" />} birr={fmt(c.Nbb)} />
                  <Row label="Container Storage" rate="" fc="—" etb="—" cur="USD"
                    fgInput={<TI value={f.i_cont} onChange={v => set("i_cont", v)} testid="input-cont" />} birr={fmt(c.Ncont)} />
                  <Row label="Container Demurrage" rate="" fc="—" etb="—" cur="USD"
                    fgInput={<TI value={f.i_dem} onChange={v => set("i_dem", v)} testid="input-dem" />} birr={fmt(c.Ndem)} />
                  <Row label="Container Return" rate="" fc="—" etb="—" cur="Birr" fg="—"
                    birrInput={<TI value={f.i_contRet} onChange={v => set("i_contRet", v)} testid="input-contret" />} />

                  <SecRow label="6. Other Costs" />
                  <Row label="Warehouse Costs" rate="" fc="—" etb={`${fmt(c.J48)} ETB`} cur="Birr" fg="—" birr={fmt(c.N48)} />
                  <SubInputRow label="Warehouse Cost (total)" input={<TI value={f.i_J48} onChange={v => set("i_J48", v)} testid="input-j48" />} />
                  <Row label="Assembly at Warehouse" rate="" fc="—" etb={`${fmt(c.J49)} ETB`} cur="Birr" fg="—" birr="—" />
                  <SubInputRow label="Assembly Cost (total)" input={<TI value={f.i_J49} onChange={v => set("i_J49", v)} testid="input-j49" />} />
                  <Row label="Driven Costs" rate="" fc="—" etb="—" cur="Birr" fg="—"
                    birrInput={<TI value={f.i_driven} onChange={v => set("i_driven", v)} testid="input-driven" />} />
                  <Row label="Insurance — Port to Addis" rate="" fc="—" etb="—" cur="Birr" fg="—"
                    birrInput={<TI value={f.i_portIns} onChange={v => set("i_portIns", v)} testid="input-portins" />} />
                  <Row label="Scanning Charge" rate={(c.G52 * 100).toFixed(4) + "%"} fc="—" etb="—" cur="Birr" fg="—" birr={fmt(c.scanPU)} />

                  <SecRow label="7–9. Additional Costs" />
                  <Row label="Locally Fitted Components / Retrofitting" rate="" fc="—" etb="—" cur="Birr" fg="—"
                    birrInput={<TI value={f.i_local} onChange={v => set("i_local", v)} testid="input-local" />} />
                  <Row label="Delivery / Installation / Commissioning" rate="" fc="—" etb="—" cur="Birr" fg="—"
                    birrInput={<TI value={f.i_delivery} onChange={v => set("i_delivery", v)} testid="input-delivery2" />} />
                  <Row label="Miscellaneous Costs" rateInput={<TI value={f.i_K55} onChange={v => set("i_K55", v)} step="0.0001" testid="input-k55" />} fc="—" etb="—" cur="Birr" fg={`${fmt(c.M55, 4)} USD`} birr={fmt(c.N55)} />

                  <tr className="bg-primary/90 text-primary-foreground font-bold">
                    <td colSpan={6} className="px-3 py-2 text-right pr-6" style={{ fontSize: "13px" }}>Sub-Total — ETB per Unit</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ fontSize: "15px" }} data-testid="text-subtotal">{fmt(c.N56)}</td>
                  </tr>
                  <tr className="bg-primary text-primary-foreground font-bold">
                    <td colSpan={6} className="px-3 py-2 text-right pr-6" style={{ fontSize: "14px" }}>Total Landed Cost — ETB per Unit</td>
                    <td className="px-3 py-2 text-right font-mono" style={{ fontSize: "17px" }} data-testid="text-total-landed">{fmt(c.N57)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 bg-foreground px-6 py-3 text-background">
              <div className="flex flex-wrap items-center gap-6">
                <CrItem label="Cost Rate" value={fmt(c.N58, 6)} unit="ETB per USD" big />
                <CrItem label="Total All Units" value={fmt(c.N57 * c.units)} unit="ETB" />
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <CrItem label="C&F / Unit" value={fmt(c.N16)} unit="ETB" />
                <CrItem label="CIF / Unit" value={fmt(c.N17)} unit="ETB" />
                <CrItem label="Total Duty / Unit" value={fmt(c.N34)} unit="ETB" />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ===== MARGIN ===== */}
        <TabsContent value="margin" className="space-y-6 mt-6">
          <Card className="overflow-hidden">
            <SectionHeader icon={<BarChart3 className="h-4 w-4" />} title="Margin Analysis & Pricing Scenarios" badge="Total Cost plus Margin at Each Rate" />
            <div className="flex flex-wrap gap-6 bg-muted/50 px-4 py-3 border-b">
              <MetaItem label="Landed Cost / Unit" value={`${fmt(c.N57)} ETB`} />
              <MetaItem label="FOB / Unit (USD)" value={`${fmt(c.M14)} USD`} />
              <MetaItem label="FOB / Unit (ETB)" value={`${fmt(c.N14)} ETB`} />
              <MetaItem label="Units" value={String(c.units)} />
              <MetaItem label="Margin Opening" value={`${fmt(c.mOpen, 2)}%`} />
              <MetaItem label="Forecasted Increment" value={fpct4(c.M11)} />
            </div>
            <p className="px-4 py-3 text-xs text-muted-foreground bg-muted/30 border-b">
              Each row shows the total cost plus margin at that margin percentage. The amber row is the forecasted value for the projected period; the highlighted row is the zero-margin cost price.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" style={{ minWidth: "520px" }}>
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">Margin Rate</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">Margin Amount (ETB)</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">Total Cost plus Margin (ETB)</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">VAT Amount (ETB)</th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">Total Sales Value (ETB)</th>
                  </tr>
                </thead>
                <tbody>
                  {c.margin.map((m, i) => (
                    <tr key={i} className={
                      m.kind === "forecast" ? "bg-[hsl(var(--chart-3)/0.18)] font-semibold"
                        : m.kind === "zero" ? "bg-secondary font-semibold" : "hover-elevate"
                    } data-testid={`margin-row-${i}`}>
                      <td className="px-3 py-1.5">{m.desc}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold">{(m.K * 100).toFixed(2)}%</td>
                      <td className="px-3 py-1.5 text-right font-mono text-[hsl(var(--chart-4))] font-semibold">{fmt(m.L)}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold">{fmt(m.Ndp)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-[hsl(var(--chart-5))] font-semibold">{fmt(m.Ndp * 0.15)}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-primary">{fmt(m.Ndp + m.Ndp * 0.15)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ===== RECORDS ===== */}
        <TabsContent value="records" className="space-y-6 mt-6">
          <Card className="overflow-hidden">
            <SectionHeader icon={<FolderOpen className="h-4 w-4" />} title="Saved Cost Build-Up Records" badge="Stored Locally in Browser" />
            <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or notes…" className="pl-9 w-56" data-testid="input-search-records" />
              </div>
              <Button size="sm" onClick={openSave} data-testid="button-save-current"><Save className="h-4 w-4" /> Save Current</Button>
              <Button size="sm" variant="outline" onClick={exportCSV} data-testid="button-export-csv"><Download className="h-4 w-4" /> Export CSV</Button>
              <Button size="sm" variant="outline" onClick={clearAll} className="ml-auto text-destructive" data-testid="button-clear-all"><Trash2 className="h-4 w-4" /> Clear All</Button>
            </div>
            {filteredRecords.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground">
                <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-semibold">{search ? `No results for "${search}"` : "No records saved yet"}</p>
                <p className="text-sm mt-1">Use "Save Current" to store your cost build-up for future reference.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted text-muted-foreground text-left">
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider">#</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider">Record Name</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider">Supplier</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">FOB/Unit (USD)</th>
                      <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider">Units</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">Settlement Rate</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider">Date Saved</th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider">Notes</th>
                      <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r, i) => (
                      <tr key={r.id} className="border-b" data-testid={`record-row-${r.id}`}>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-3 py-2 font-semibold">{r.name}</td>
                        <td className="px-3 py-2"><StatusChip status={r.status} /></td>
                        <td className="px-3 py-2">{r.data?.supplier || "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.data?.fobPU ? fmt(parseFloat(r.data.fobPU)) : "—"}</td>
                        <td className="px-3 py-2 text-center font-mono">{r.data?.units || "—"}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.data?.rateS ? parseFloat(r.data.rateS).toFixed(4) : "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs max-w-[160px] truncate">{r.notes || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => loadRecord(r.id)} data-testid={`button-load-${r.id}`}><FolderOpen className="h-3.5 w-3.5" /> Load</Button>
                            <Button size="icon" variant="ghost" onClick={() => deleteRecord(r.id)} className="text-destructive" data-testid={`button-delete-${r.id}`}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save Cost Build-Up Record</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Record Name / Reference"><Input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="e.g. INV-2024-001 — Machinery Import" data-testid="input-savename" /></Field>
            <Field label="Status">
              <Select value={saveStatus} onValueChange={setSaveStatus}>
                <SelectTrigger data-testid="select-savestatus"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Under Review</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Notes (optional)"><Input value={saveNotes} onChange={e => setSaveNotes(e.target.value)} placeholder="Any notes…" data-testid="input-savenotes" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)} data-testid="button-cancel-save">Cancel</Button>
            <Button onClick={saveRecord} data-testid="button-confirm-save"><Save className="h-4 w-4" /> Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, unit, testid }: { label: string; value: string; unit: string; testid: string }) {
  return (
    <Card className="p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-semibold text-primary truncate mt-1" data-testid={testid}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{unit}</p>
    </Card>
  );
}

function SectionHeader({ icon, title, badge }: { icon: ReactNode; title: string; badge: string }) {
  return (
    <div className="flex items-center gap-2 bg-primary px-4 py-2.5 text-primary-foreground">
      {icon}
      <h2 className="text-xs font-semibold uppercase tracking-wider">{title}</h2>
      <span className="ml-auto rounded-md bg-primary-foreground/15 px-2.5 py-0.5 text-[10px]">{badge}</span>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function RateStat({ label, value, accent, testid }: { label: string; value: string; accent?: boolean; testid: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className={`font-mono text-xl font-bold ${accent ? "text-[hsl(var(--chart-4))]" : "text-primary"}`} data-testid={testid}>{value}</p>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function CrItem({ label, value, unit, big }: { label: string; value: string; unit: string; big?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</p>
      <p className="font-mono font-bold text-[hsl(var(--chart-3))]" style={{ fontSize: big ? "26px" : "20px" }}>
        {value}<span className="text-[10px] opacity-50 ml-1">{unit}</span>
      </p>
    </div>
  );
}

function SecRow({ label }: { label: string }) {
  return (
    <tr className="bg-foreground/90 text-background">
      <td colSpan={7} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider">{label}</td>
    </tr>
  );
}

function Row({ label, rate, rateInput, fc, etb, cur, fg, fgInput, birr, birrInput, birrTeal }: {
  label: string; rate?: string; rateInput?: ReactNode; fc: string; etb: string; cur: string;
  fg?: string; fgInput?: ReactNode; birr?: string; birrInput?: ReactNode; birrTeal?: boolean;
}) {
  return (
    <tr className="border-b hover-elevate">
      <td className="px-3 py-1.5 pl-6">{label}</td>
      <td className="px-3 py-1.5 text-right font-mono text-xs">{rateInput ?? (rate || "—")}</td>
      <td className="px-3 py-1.5 text-right font-mono text-xs text-muted-foreground">{fc}</td>
      <td className="px-3 py-1.5 text-right font-mono text-xs text-muted-foreground">{etb}</td>
      <td className="px-3 py-1.5 text-right font-mono text-xs text-muted-foreground">{cur}</td>
      <td className="px-3 py-1.5 text-right font-mono text-xs">{fgInput ?? (fg || "—")}</td>
      <td className={`px-3 py-1.5 text-right font-mono text-xs ${birrTeal ? "text-primary font-semibold" : "font-medium"}`}>{birrInput ?? (birr || "—")}</td>
    </tr>
  );
}

function HiRow({ label, value, tone }: { label: string; value: string; tone: "teal" | "blue" }) {
  const color = tone === "teal" ? "text-primary" : "text-[hsl(var(--chart-5))]";
  return (
    <tr className="bg-secondary/60 font-semibold border-b">
      <td className="px-3 py-1.5 pl-3">{label}</td>
      <td colSpan={5} className="px-3 py-1.5" />
      <td className={`px-3 py-1.5 text-right font-mono ${color}`} style={{ fontSize: "13px" }}>{value}</td>
    </tr>
  );
}

function SubInputRow({ label, input }: { label: string; input: ReactNode }) {
  return (
    <tr className="bg-muted/40 border-b">
      <td className="px-3 py-1.5 pl-10 text-xs text-muted-foreground">{label}</td>
      <td colSpan={5} />
      <td className="px-3 py-1.5 text-right">{input}</td>
    </tr>
  );
}

function DutyCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-r p-2.5 last:border-r-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      {children}
    </div>
  );
}

function TI({ value, onChange, step, testid }: { value: string; onChange: (v: string) => void; step?: string; testid?: string }) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      onChange={e => onChange(e.target.value)}
      className="h-7 w-full min-w-[80px] rounded-md border bg-background px-2 text-right font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
      data-testid={testid}
    />
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-secondary text-secondary-foreground",
    review: "bg-[hsl(var(--chart-3)/0.25)] text-[hsl(var(--chart-4))]",
    final: "bg-[hsl(var(--chart-5)/0.2)] text-[hsl(var(--chart-5))]",
  };
  return <span className={`inline-block rounded-md px-2.5 py-0.5 text-[10px] font-semibold ${map[status] || map.draft}`}>{status || "draft"}</span>;
}
