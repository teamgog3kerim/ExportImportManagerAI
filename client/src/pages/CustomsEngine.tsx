import { useState, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { Calculator, Printer, RotateCcw, FileText, PieChart as PieIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface TaxRow {
  code: string;
  name: string;
  defaultPct: string;
}

const TAX_DEFS: TaxRow[] = [
  { code: "01", name: "Import Customs Tax", defaultPct: "0" },
  { code: "03", name: "Excise Tax", defaultPct: "0" },
  { code: "05", name: "Goods Liable to 10% Surtax", defaultPct: "10" },
  { code: "12", name: "Goods Liable to 3% Social Welfare Tax", defaultPct: "3" },
  { code: "04", name: "Value Added Tax", defaultPct: "15" },
  { code: "15", name: "Goods Liable to 3% Withholding Tax", defaultPct: "3" },
  { code: "16", name: "Goods Liable to 0.07% Scanning Fee", defaultPct: "0.07" },
];

const CHART_COLORS = ["#a87b3d", "#c69653", "#7a5a2f", "#d6b27a", "#9c6f3a", "#5c4423", "#e0c089"];

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const emptyInputs = {
  itemDescription: "",
  fobUsd: "",
  exchangeRate: "",
  freightUsd: "",
  insuranceEtb: "",
  otherInlandEtb: "",
};

export default function CustomsEngine() {
  const [inp, setInp] = useState({ ...emptyInputs });
  const [pct, setPct] = useState<Record<string, string>>(
    () => Object.fromEntries(TAX_DEFS.map(t => [t.code, t.defaultPct]))
  );
  const printRef = useRef<HTMLDivElement>(null);

  const set = (k: keyof typeof emptyInputs, v: string) => setInp(p => ({ ...p, [k]: v }));

  const n = (s: string) => parseFloat(s) || 0;

  const c = useMemo(() => {
    const fobUsd = n(inp.fobUsd);
    const rate = n(inp.exchangeRate);
    const freightUsd = n(inp.freightUsd);
    const insuranceEtb = n(inp.insuranceEtb);
    const otherInlandEtb = n(inp.otherInlandEtb);

    const fobEtb = fobUsd * rate;
    const freightEtb = freightUsd * rate;
    const cifEtb = fobEtb + freightEtb + insuranceEtb;
    const taxableEtb = cifEtb + otherInlandEtb;

    const taxes = TAX_DEFS.map(t => {
      const p = n(pct[t.code]);
      const value = taxableEtb * (p / 100);
      return { ...t, pct: p, value };
    });
    const totalItemTax = taxes.reduce((s, t) => s + t.value, 0);

    return { fobEtb, freightEtb, cifEtb, taxableEtb, taxes, totalItemTax };
  }, [inp, pct]);

  const chartData = c.taxes.filter(t => t.value > 0);

  function reset() {
    setInp({ ...emptyInputs });
    setPct(Object.fromEntries(TAX_DEFS.map(t => [t.code, t.defaultPct])));
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="p-6 space-y-6 print:p-0 print:space-y-0">
      <div className="print:hidden">
        <PageHeader
          eyebrow="Import · Customs"
          title="Tax Assessment Calculator"
          description="Compute CIF value, item taxes, and the total assessed amount for any import declaration."
          actions={
            <>
              <Button variant="outline" onClick={reset} data-testid="button-reset-calculator">
                <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
              </Button>
              <Button onClick={handlePrint} data-testid="button-print-assessment">
                <Printer className="h-4 w-4 mr-1.5" /> Print / Save PDF
              </Button>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 print:hidden">
        {/* CALCULATOR */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold text-primary">CIF & Taxable Amount</h2>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Item / Goods Description</Label>
              <Input
                value={inp.itemDescription}
                onChange={e => set("itemDescription", e.target.value)}
                placeholder="e.g. Toyota Spare Parts — 1 Container"
                data-testid="input-item-description"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">FCY / FOB Value (USD)</Label>
                <Input type="number" value={inp.fobUsd} onChange={e => set("fobUsd", e.target.value)} placeholder="0.00" data-testid="input-fob-usd" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Exchange Rate (ETB / USD)</Label>
                <Input type="number" step="0.0001" value={inp.exchangeRate} onChange={e => set("exchangeRate", e.target.value)} placeholder="0.0000" data-testid="input-exchange-rate" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Freight Value (USD)</Label>
                <Input type="number" value={inp.freightUsd} onChange={e => set("freightUsd", e.target.value)} placeholder="0.00" data-testid="input-freight-usd" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Insurance Value (ETB)</Label>
                <Input type="number" value={inp.insuranceEtb} onChange={e => set("insuranceEtb", e.target.value)} placeholder="0.00" data-testid="input-insurance-etb" />
              </div>
            </div>

            {/* CIF result */}
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">Total CIF Value</p>
                <p className="text-[0.7rem] text-muted-foreground/80">FOB ETB + Freight ETB + Insurance ETB</p>
              </div>
              <p className="font-display text-2xl font-semibold text-primary tabular-nums" data-testid="text-cif-value">
                ETB {fmt(c.cifEtb)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Other Inland Costs (ETB)</Label>
              <Input type="number" value={inp.otherInlandEtb} onChange={e => set("otherInlandEtb", e.target.value)} placeholder="0.00" data-testid="input-other-inland" />
              <p className="text-[0.65rem] text-muted-foreground">Inland transport, port handling, terminal charges, etc.</p>
            </div>

            <div className="rounded-md bg-foreground text-background p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.12em] opacity-70">Total Taxable Amount</p>
                <p className="text-[0.7rem] opacity-60">CIF + Other Inland Costs — base for all item taxes</p>
              </div>
              <p className="font-display text-2xl font-semibold tabular-nums" data-testid="text-taxable-amount">
                ETB {fmt(c.taxableEtb)}
              </p>
            </div>

            {/* ITEM TAX TABLE */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-semibold text-primary">Item Taxes</h3>
              </div>
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold w-12">Code</th>
                      <th className="px-3 py-2 text-left font-semibold">Tax Type</th>
                      <th className="px-3 py-2 text-right font-semibold w-28">Rate (%)</th>
                      <th className="px-3 py-2 text-right font-semibold w-44">Value (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.taxes.map((t) => (
                      <tr key={t.code} className="border-t border-border/60 hover:bg-muted/30">
                        <td className="px-3 py-2 text-muted-foreground tabular-nums">{t.code}</td>
                        <td className="px-3 py-2">{t.name}</td>
                        <td className="px-3 py-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={pct[t.code]}
                            onChange={e => setPct(p => ({ ...p, [t.code]: e.target.value }))}
                            className="h-7 text-xs text-right tabular-nums w-24 ml-auto"
                            data-testid={`input-tax-pct-${t.code}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium" data-testid={`text-tax-value-${t.code}`}>
                          {fmt(t.value)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-primary/10 border-t-2 border-primary/40">
                      <td colSpan={3} className="px-3 py-3 font-semibold text-primary uppercase tracking-wide text-[0.7rem]">
                        Total Item Taxes
                      </td>
                      <td className="px-3 py-3 text-right font-display text-lg font-semibold text-primary tabular-nums" data-testid="text-total-item-tax">
                        ETB {fmt(c.totalItemTax)}
                      </td>
                    </tr>
                    <tr className="bg-foreground text-background">
                      <td colSpan={3} className="px-3 py-3 font-bold uppercase tracking-wide text-[0.72rem]">
                        Total Tax Assessed Amount
                      </td>
                      <td className="px-3 py-3 text-right font-display text-xl font-bold tabular-nums" data-testid="text-total-assessed">
                        ETB {fmt(c.totalItemTax)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — CHART + PREVIEW */}
        <div className="space-y-5">
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-semibold text-primary">Tax Breakdown Summary</h3>
              </div>
              {chartData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-md">
                  Enter values to see the breakdown
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                      >
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => `ETB ${fmt(v)}`}
                        contentStyle={{ fontSize: 11, borderRadius: 6 }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="square"
                        wrapperStyle={{ fontSize: 10, lineHeight: "14px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <AssessmentNoticePreview inp={inp} c={c} />
        </div>
      </div>

      {/* PRINTABLE PAGE — only shows in print */}
      <div ref={printRef} className="hidden print:block">
        <PrintableAssessment inp={inp} c={c} />
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

/* ---------- Preview (shown on screen) ---------- */
function AssessmentNoticePreview({ inp, c }: { inp: any; c: any }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold text-primary">Assessment Notice Preview</h3>
        </div>
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <div className="bg-muted/40 px-3 py-2 border-b border-border">
            <p className="font-display text-sm font-semibold text-foreground">Assessment Notice</p>
            <p className="text-[0.65rem] text-muted-foreground mt-0.5 truncate">
              {inp.itemDescription || "— No item description —"}
            </p>
          </div>
          <div className="p-3 space-y-1.5 text-[0.72rem]">
            <Line label="FOB Value (ETB)" value={c.fobEtb} />
            <Line label="Freight (ETB)" value={c.freightEtb} />
            <Line label="Insurance (ETB)" value={Number(inp.insuranceEtb) || 0} />
            <div className="border-t border-border my-1" />
            <Line label="Total CIF Value" value={c.cifEtb} bold />
            <Line label="Other Inland Costs" value={Number(inp.otherInlandEtb) || 0} />
            <div className="border-t border-border my-1" />
            <Line label="Total Taxable Amount" value={c.taxableEtb} bold />
            <div className="border-t border-border my-2" />
            {c.taxes.map((t: any) => (
              <Line key={t.code} label={`${t.code} · ${t.name} (${t.pct}%)`} value={t.value} muted />
            ))}
            <div className="border-t border-border my-2" />
            <div className="bg-primary text-primary-foreground rounded-md p-3 flex items-center justify-between gap-2">
              <p className="text-[0.65rem] uppercase tracking-[0.1em] opacity-90">Total Assessed Amount</p>
              <p className="font-display text-base font-semibold tabular-nums">ETB {fmt(c.totalItemTax)}</p>
            </div>
            <p className="text-[0.6rem] text-muted-foreground italic mt-2">
              System generated assessment notice · No signature required.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Line({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${muted ? "text-muted-foreground" : ""}`}>
      <span className={bold ? "font-semibold text-foreground" : ""}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold text-foreground" : ""}`}>{fmt(value)}</span>
    </div>
  );
}

/* ---------- Printable layout ---------- */
function PrintableAssessment({ inp, c }: { inp: any; c: any }) {
  const today = new Date().toLocaleDateString("en-GB");
  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "#111", padding: "8mm" }}>
      <div style={{ borderBottom: "2px solid #a87b3d", paddingBottom: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#5c4423", margin: 0 }}>Tax Assessment Notice</h1>
        <p style={{ fontSize: 11, color: "#555", margin: "4px 0 0 0" }}>
          Generated {today} · Item: {inp.itemDescription || "—"}
        </p>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 16 }}>
        <tbody>
          {[
            ["FCY / FOB Value (USD)", `$ ${fmt(Number(inp.fobUsd) || 0)}`],
            ["Exchange Rate (ETB / USD)", fmt(Number(inp.exchangeRate) || 0)],
            ["FOB Value (ETB)", `ETB ${fmt(c.fobEtb)}`],
            ["Freight Value (USD)", `$ ${fmt(Number(inp.freightUsd) || 0)}`],
            ["Freight Value (ETB)", `ETB ${fmt(c.freightEtb)}`],
            ["Insurance Value (ETB)", `ETB ${fmt(Number(inp.insuranceEtb) || 0)}`],
            ["TOTAL CIF VALUE (ETB)", `ETB ${fmt(c.cifEtb)}`, true],
            ["Other Inland Costs (ETB)", `ETB ${fmt(Number(inp.otherInlandEtb) || 0)}`],
            ["TOTAL TAXABLE AMOUNT (ETB)", `ETB ${fmt(c.taxableEtb)}`, true],
          ].map(([l, v, b], i) => (
            <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "6px 8px", fontWeight: b ? 700 : 400 }}>{l as string}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: b ? 700 : 500 }}>{v as string}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 14, color: "#5c4423", margin: "12px 0 6px 0" }}>Item Taxes</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ background: "#f4ecde" }}>
            <th style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #c9a876" }}>Code</th>
            <th style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #c9a876" }}>Tax Type</th>
            <th style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid #c9a876" }}>Rate (%)</th>
            <th style={{ padding: "6px 8px", textAlign: "right", borderBottom: "1px solid #c9a876" }}>Value (ETB)</th>
          </tr>
        </thead>
        <tbody>
          {c.taxes.map((t: any) => (
            <tr key={t.code} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "6px 8px" }}>{t.code}</td>
              <td style={{ padding: "6px 8px" }}>{t.name}</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{t.pct}</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>{fmt(t.value)}</td>
            </tr>
          ))}
          <tr style={{ background: "#f4ecde" }}>
            <td colSpan={3} style={{ padding: "8px", fontWeight: 700 }}>Total Item Taxes</td>
            <td style={{ padding: "8px", textAlign: "right", fontWeight: 700 }}>ETB {fmt(c.totalItemTax)}</td>
          </tr>
          <tr style={{ background: "#5c4423", color: "#fff" }}>
            <td colSpan={3} style={{ padding: "10px", fontWeight: 700, fontSize: 12 }}>TOTAL TAX ASSESSED AMOUNT</td>
            <td style={{ padding: "10px", textAlign: "right", fontWeight: 700, fontSize: 13 }}>ETB {fmt(c.totalItemTax)}</td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: 10, color: "#777", marginTop: 16, fontStyle: "italic" }}>
        System generated assessment notice · No signature required.
      </p>
    </div>
  );
}
