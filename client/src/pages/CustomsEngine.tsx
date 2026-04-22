import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, FileText, CheckCircle, XCircle, Clock, BrainCircuit } from "lucide-react";

const requiredDocs = [
  { name: "Commercial Invoice", status: "verified" },
  { name: "Packing List", status: "verified" },
  { name: "Certificate of Origin", status: "missing" },
  { name: "Insurance Certificate", status: "verified" },
  { name: "Bill of Lading", status: "pending" },
];

function docBadge(status: string) {
  if (status === "verified") return <Badge variant="default" className="text-xs">verified</Badge>;
  if (status === "missing") return <Badge variant="destructive" className="text-xs">missing</Badge>;
  return <Badge variant="secondary" className="text-xs">pending</Badge>;
}

function docIcon(status: string) {
  if (status === "verified") return <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />;
  if (status === "missing") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  return <Clock className="h-3.5 w-3.5 text-amber-600" />;
}

export default function CustomsEngine() {
  const [fobUsd, setFobUsd] = useState("");
  const [exchangeRate, setExchangeRate] = useState("120.5");
  const [freightUsd, setFreightUsd] = useState("");
  const [insuranceEtb, setInsuranceEtb] = useState("");
  const [dutyRate, setDutyRate] = useState("20");

  const calc = useMemo(() => {
    const fob = Number(fobUsd) || 0;
    const rate = Number(exchangeRate) || 0;
    const freight = Number(freightUsd) || 0;
    const insurance = Number(insuranceEtb) || 0;
    const duty = Number(dutyRate) || 20;

    const fobEtb = fob * rate;
    const freightEtb = freight * rate;
    const cifEtb = fobEtb + freightEtb + insurance;
    const customsDuty = cifEtb * (duty / 100);
    const surtax = cifEtb * 0.03;
    const vat = cifEtb * 0.15;
    const withholding = cifEtb * 0.03;
    const total = customsDuty + surtax + vat + withholding;

    return { cifEtb, customsDuty, surtax, vat, withholding, total };
  }, [fobUsd, exchangeRate, freightUsd, insuranceEtb, dutyRate]);

  const fmtEtb = (n: number) => `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customs Engine</h1>
        <p className="text-sm text-muted-foreground">Estimate duties and taxes for your imports into Ethiopia</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tax Calculator */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" /> Tax Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">FCY Currency FOB Value (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                  <Input
                    type="number"
                    value={fobUsd}
                    onChange={e => setFobUsd(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                    data-testid="input-fob-usd"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Exchange Rate (ETB/USD)</Label>
                <Input
                  type="number"
                  value={exchangeRate}
                  onChange={e => setExchangeRate(e.target.value)}
                  data-testid="input-customs-exchange-rate"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Freight Value (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                  <Input
                    type="number"
                    value={freightUsd}
                    onChange={e => setFreightUsd(e.target.value)}
                    placeholder="0.00"
                    className="pl-7"
                    data-testid="input-freight-usd"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Insurance Value (ETB)</Label>
                <Input
                  type="number"
                  value={insuranceEtb}
                  onChange={e => setInsuranceEtb(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-insurance-etb"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1.5">
                  Duty Rate (%)
                  <span className="text-muted-foreground font-normal">— Standard: 20%</span>
                </Label>
                <Input
                  type="number"
                  value={dutyRate}
                  onChange={e => setDutyRate(e.target.value)}
                  data-testid="input-duty-rate"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-primary font-semibold">Calculated CIF Value (ETB)</Label>
                <div className="h-9 flex items-center px-3 rounded-md bg-muted border text-sm font-semibold text-primary" data-testid="text-cif-value">
                  {fmtEtb(calc.cifEtb)}
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  {[
                    { label: `Customs Duty (${dutyRate}%)`, value: calc.customsDuty, color: "" },
                    { label: "Surtax (3%)", value: calc.surtax, color: "" },
                    { label: "VAT (15%)", value: calc.vat, color: "" },
                    { label: "Withholding Tax (3%)", value: calc.withholding, color: "" },
                  ].map((row, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-2.5 font-medium text-muted-foreground">{row.label}</td>
                      <td className="px-4 py-2.5 text-right font-semibold" data-testid={`text-tax-${i}`}>{fmtEtb(row.value)}</td>
                    </tr>
                  ))}
                  <tr className="bg-primary text-primary-foreground">
                    <td className="px-4 py-3 font-bold">
                      <p className="text-xs opacity-80">Total Payable Amount</p>
                      <p>TO CUSTOMS (ETB)</p>
                    </td>
                    <td className="px-4 py-3 text-right text-xl font-bold" data-testid="text-total-customs">
                      {fmtEtb(calc.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Required Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {requiredDocs.map((doc, i) => (
                <div key={i} className="flex items-center justify-between gap-2" data-testid={`row-doc-${i}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {docIcon(doc.status)}
                    <span className="text-xs truncate">{doc.name}</span>
                  </div>
                  {docBadge(doc.status)}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">New Feature</Badge>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <BrainCircuit className="h-5 w-5" />
                <p className="text-sm font-semibold">Freight Cost Prediction</p>
              </div>
              <p className="text-xs opacity-80">Predict container rates 3 months in advance with 88% accuracy.</p>
              <Button variant="outline" size="sm" className="mt-3 w-full text-xs bg-white/10 border-white/20 text-primary-foreground">
                Predict Rates
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-primary" /> AI HS Code Classification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">Enter product description to get the Ethiopian Customs HS code.</p>
              <Input placeholder="e.g. Industrial water pumps, Solar panels..." className="text-xs mb-2" data-testid="input-hs-classification" />
              <Button variant="outline" size="sm" className="w-full text-xs" data-testid="button-classify-hs">
                Classify Product
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
