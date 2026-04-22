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
import { Plus, Search, FileText, AlertTriangle, Pencil, Trash2 } from "lucide-react";
import type { LC } from "@shared/schema";

function lcStatusColor(s: string) {
  if (s === "Approved") return "default";
  if (s === "Draft") return "secondary";
  if (s === "Settled") return "outline";
  if (s === "Expired") return "destructive";
  return "secondary";
}

function calcLC(lc: Partial<LC>, exchangeRate: number) {
  const fcy = Number(lc.fobValueUsd ?? 0);
  const margin = Number(lc.marginOpenedPct ?? 30) / 100;
  const swiftUsd = 100; // standard swift charge USD
  const etbValue = fcy * exchangeRate;
  const openingMargin = etbValue * margin;
  const bankCommission = etbValue * 0.04;
  const vatBankCommission = bankCommission * 0.15;
  const swiftCharge = swiftUsd * exchangeRate;
  const vatSwiftCharge = swiftCharge * 0.15;
  const totalOpening = openingMargin + bankCommission + vatBankCommission + swiftCharge + vatSwiftCharge;
  const settlementFcy = fcy;
  const settlementEtb = settlementFcy * exchangeRate;
  const marginHeld = etbValue * margin;
  const settlePct = 1 - margin; // 70%
  const settleAmt = settlementEtb * settlePct - marginHeld;
  const nbe = settlementEtb * 0.025;
  const totalSettlement = settleAmt + nbe < 0 ? 0 : settleAmt + nbe;
  const totalPayable = totalOpening + totalSettlement;
  return { etbValue, openingMargin, bankCommission, vatBankCommission, swiftCharge, vatSwiftCharge, totalOpening, marginHeld, settleAmt, nbe, totalSettlement, totalPayable };
}

const BANKS = ["Commercial Bank of Ethiopia (CBE)", "Dashen Bank", "Bank of Abyssinia (BOA)", "Awash Bank", "Wegagen Bank"];
const CURRENCIES = ["USD ($)", "EUR (€)", "GBP (£)", "CNY (¥)"];

export default function LCManagement() {
  const { toast } = useToast();
  const { data: lcs = [], isLoading } = useQuery<LC[]>({ queryKey: ["/api/lcs"] });
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editLC, setEditLC] = useState<LC | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(129.69);

  const emptyForm = {
    lcNumber: "", issuingBank: "", currency: "USD", fobValueUsd: "0", freightValueUsd: "0",
    issueDate: "", expiryDate: "", proformaInvoiceNo: "", proformaInvoiceDate: "",
    supplierName: "", supplierAddress: "", descriptionOfGoods: "", totalQuantity: "",
    entryCertificateLetter: "", entryCertificateDate: "", insurancePaidEtb: "0",
    certificatePaidEtb: "0", marginOpenedPct: "30", paymentTerm: "CIF",
    partialShipmentAllowed: "false", transshipmentAllowed: "false", status: "Draft",
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
  function openEdit(lc: LC) { setEditLC(lc); setForm({ ...lc }); setShowBreakdown(false); setOpenModal(true); }
  function submit() {
    if (editLC) updateMutation.mutate({ id: editLC.id, body: form });
    else createMutation.mutate(form);
  }
  function field(k: string, v: any) { setForm((p: any) => ({ ...p, [k]: v })); }

  const filtered = lcs.filter(lc =>
    lc.lcNumber.toLowerCase().includes(search.toLowerCase()) ||
    lc.supplierName.toLowerCase().includes(search.toLowerCase())
  );

  const calc = calcLC(form, exchangeRate);
  const fmtEtb = (n: number) => n.toFixed(2);

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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {editLC ? `Update Letter of Credit` : "Open Letter of Credit"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
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
                  <Label className="text-xs">Issuing Bank</Label>
                  <Select value={form.issuingBank} onValueChange={v => field("issuingBank", v)}>
                    <SelectTrigger data-testid="select-issuing-bank"><SelectValue placeholder="Select bank" /></SelectTrigger>
                    <SelectContent>{BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">LC Currency</Label>
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
                  <Label className="text-xs">FOB Value (USD)</Label>
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

            {/* Invoice & Supplier */}
            <div>
              <h3 className="text-xs font-semibold text-primary mb-3">Invoice & Supplier Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Proforma Invoice No.</Label>
                  <Input value={form.proformaInvoiceNo ?? ""} onChange={e => field("proformaInvoiceNo", e.target.value)} placeholder="PI-2024-001" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Proforma Invoice Date</Label>
                  <Input type="date" value={form.proformaInvoiceDate ?? ""} onChange={e => field("proformaInvoiceDate", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Supplier Name</Label>
                  <Input value={form.supplierName} onChange={e => field("supplierName", e.target.value)} placeholder="Global Heavy Industries" data-testid="input-supplier-name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Supplier Address</Label>
                  <Input value={form.supplierAddress ?? ""} onChange={e => field("supplierAddress", e.target.value)} placeholder="Shanghai Tech Park, Bldg 4" />
                </div>
              </div>
            </div>

            {/* Goods & Cert */}
            <div>
              <h3 className="text-xs font-semibold text-primary mb-3">Goods & Certification</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Description of Goods</Label>
                  <Input value={form.descriptionOfGoods ?? ""} onChange={e => field("descriptionOfGoods", e.target.value)} placeholder="Industrial Machinery for manufacturing plant" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Total Quantity (Units)</Label>
                  <Input value={form.totalQuantity ?? ""} onChange={e => field("totalQuantity", e.target.value)} placeholder="15 units" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entry Certificate Letter</Label>
                  <Input value={form.entryCertificateLetter ?? ""} onChange={e => field("entryCertificateLetter", e.target.value)} placeholder="ECL-889" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entry Certificate Issued Date</Label>
                  <Input type="date" value={form.entryCertificateDate ?? ""} onChange={e => field("entryCertificateDate", e.target.value)} />
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
                      onCheckedChange={v => field("partialShipmentAllowed", String(v))}
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
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="w-full"
                onClick={() => setShowBreakdown(!showBreakdown)}
                data-testid="button-toggle-cost-breakdown"
              >
                {showBreakdown ? "Hide" : "Show"} LC Cost Breakdown Calculation
              </Button>

              {showBreakdown && (
                <div className="mt-4 space-y-4 border rounded-md p-4">
                  {/* Exchange Rate input */}
                  <div className="flex items-center gap-3">
                    <Label className="text-xs whitespace-nowrap">Exchange Rate (ETB/USD)</Label>
                    <Input
                      type="number"
                      value={exchangeRate}
                      onChange={e => setExchangeRate(Number(e.target.value))}
                      className="w-28"
                      data-testid="input-exchange-rate"
                    />
                  </div>

                  {/* Opening Values */}
                  <div>
                    <h4 className="text-xs font-bold mb-2 uppercase tracking-wide">1. LC Opening Payments Advice</h4>
                    <table className="w-full text-xs">
                      <thead><tr className="bg-muted">
                        <th className="text-left px-2 py-1.5 font-semibold">No.</th>
                        <th className="text-left px-2 py-1.5 font-semibold">Opening Values</th>
                        <th className="text-right px-2 py-1.5 font-semibold">Value USD</th>
                        <th className="text-right px-2 py-1.5 font-semibold">Rate/%</th>
                        <th className="text-right px-2 py-1.5 font-semibold">Value ETB</th>
                      </tr></thead>
                      <tbody>
                        {[
                          ["1", "FCY Value (USD)", Number(form.fobValueUsd).toFixed(2), exchangeRate.toFixed(4), fmtEtb(calc.etbValue)],
                          ["2", "Opening Margin", "", `${form.marginOpenedPct}%`, fmtEtb(calc.openingMargin)],
                          ["3", "Bank Commission", "", "4%", fmtEtb(calc.bankCommission)],
                          ["4", "VAT on Bank Commission", "", "15%", fmtEtb(calc.vatBankCommission)],
                          ["5", "Swift Charge (if available)", "100.00", exchangeRate.toFixed(4), fmtEtb(calc.swiftCharge)],
                          ["6", "VAT on Swift Charge", "", "15%", fmtEtb(calc.vatSwiftCharge)],
                        ].map(([no, item, usd, rate, etb]) => (
                          <tr key={no} className="border-b last:border-0">
                            <td className="px-2 py-1.5 text-muted-foreground">{no}</td>
                            <td className="px-2 py-1.5">{item}</td>
                            <td className="px-2 py-1.5 text-right text-muted-foreground">{usd}</td>
                            <td className="px-2 py-1.5 text-right text-muted-foreground">{rate}</td>
                            <td className="px-2 py-1.5 text-right font-medium">{etb}</td>
                          </tr>
                        ))}
                        <tr className="bg-foreground text-background">
                          <td colSpan={2} className="px-2 py-1.5 font-bold">TOTAL OPENING DEBITED</td>
                          <td colSpan={2} className="px-2 py-1.5">
                            <div className="flex items-center justify-end gap-2">
                              <Checkbox
                                checked={form.openingPaidStatus === "paid"}
                                onCheckedChange={v => field("openingPaidStatus", v ? "paid" : "unpaid")}
                              />
                              <span className="text-xs">{form.openingPaidStatus === "paid" ? "PAID" : "UNPAID"}</span>
                            </div>
                          </td>
                          <td className={`px-2 py-1.5 text-right font-bold ${form.openingPaidStatus === "paid" ? "text-emerald-400" : "text-red-400"}`}>
                            ETB {fmtEtb(calc.totalOpening)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Settlement */}
                  <div>
                    <h4 className="text-xs font-bold mb-2 uppercase tracking-wide">2. Settlement Amount Required / Payable</h4>
                    <table className="w-full text-xs">
                      <thead><tr className="bg-muted">
                        <th className="text-left px-2 py-1.5 font-semibold">No.</th>
                        <th className="text-left px-2 py-1.5 font-semibold">Items</th>
                        <th className="text-right px-2 py-1.5 font-semibold">Value USD</th>
                        <th className="text-right px-2 py-1.5 font-semibold">Rate/%</th>
                        <th className="text-right px-2 py-1.5 font-semibold">Value ETB</th>
                      </tr></thead>
                      <tbody>
                        {[
                          ["1", "FCY Value (USD)", Number(form.fobValueUsd).toFixed(2), exchangeRate.toFixed(4), fmtEtb(Number(form.fobValueUsd) * exchangeRate)],
                          ["2", "Margin Held Payable", "", `${form.marginOpenedPct}%`, fmtEtb(calc.marginHeld)],
                          ["3", `Settlement Amount %`, "", `${100 - Number(form.marginOpenedPct ?? 30)}%`, fmtEtb(calc.settleAmt)],
                          ["4", "NBE 2.5% Rate", "", "2.5%", fmtEtb(calc.nbe)],
                        ].map(([no, item, usd, rate, etb]) => (
                          <tr key={no} className="border-b last:border-0">
                            <td className="px-2 py-1.5 text-muted-foreground">{no}</td>
                            <td className="px-2 py-1.5">{item}</td>
                            <td className="px-2 py-1.5 text-right text-muted-foreground">{usd}</td>
                            <td className="px-2 py-1.5 text-right text-muted-foreground">{rate}</td>
                            <td className="px-2 py-1.5 text-right font-medium">{etb}</td>
                          </tr>
                        ))}
                        <tr className="bg-foreground text-background">
                          <td colSpan={2} className="px-2 py-1.5 font-bold">TOTAL SETTLEMENT DEBITED</td>
                          <td colSpan={2} className="px-2 py-1.5">
                            <div className="flex items-center justify-end gap-2">
                              <Checkbox
                                checked={form.settlementPaidStatus === "paid"}
                                onCheckedChange={v => field("settlementPaidStatus", v ? "paid" : "unpaid")}
                              />
                              <span className="text-xs">{form.settlementPaidStatus === "paid" ? "PAID" : "UNPAID"}</span>
                            </div>
                          </td>
                          <td className={`px-2 py-1.5 text-right font-bold ${form.settlementPaidStatus === "paid" ? "text-emerald-400" : "text-red-400"}`}>
                            ETB {fmtEtb(calc.totalSettlement)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Total Payable */}
                  <div className={`rounded-md p-4 ${(calc.totalPayable > 0) ? "bg-foreground text-background" : "bg-muted"}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-xs opacity-70">Total Amount Payable Value ETB</p>
                        <p className={`text-2xl font-bold mt-1 ${form.openingPaidStatus === "paid" && form.settlementPaidStatus === "paid" ? "text-emerald-400" : "text-red-400"}`}>
                          ETB {fmtEtb(calc.totalPayable)}
                        </p>
                      </div>
                      <Badge variant={form.openingPaidStatus === "paid" && form.settlementPaidStatus === "paid" ? "default" : "destructive"}>
                        {form.openingPaidStatus === "paid" && form.settlementPaidStatus === "paid" ? "PAID" : "PAYMENT PENDING"}
                      </Badge>
                    </div>
                    <p className="text-xs opacity-60 mt-2">SYSTEM GENERATED ADVICE · NB: This is a computer generated document, no signature required.</p>
                  </div>
                </div>
              )}
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
