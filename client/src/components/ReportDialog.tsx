import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Archive, Download, Share2, Loader2, Calendar as CalendarIcon, FileText, Sparkles, Trash2, ArrowLeft, BarChart3 } from "lucide-react";
import jsPDF from "jspdf";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import type { Report } from "@shared/schema";

type Section = { heading: string; paragraphs: string[] };
type Chart = { title: string; unit: string; data: Array<{ label: string; value: number; valueLabel: string }> };
type ReportMode = "detailed" | "precise";
type GeneratedReport = {
  title: string;
  periodLabel: string;
  from: string;
  to: string;
  generatedAt: string;
  company: string;
  mode: ReportMode;
  compact: boolean;
  headline: string;
  metrics: Record<string, string | number>;
  sections: Section[];
  charts: Chart[];
};

const PRESETS: Array<{ key: string; label: string; compute: () => { from: string; to: string; periodLabel: string } }> = [
  { key: "today",     label: "Today",          compute: () => rangeFromOffset(0, 0, "Today") },
  { key: "yesterday", label: "Yesterday",      compute: () => rangeFromOffset(1, 1, "Yesterday") },
  { key: "week",      label: "This Week",      compute: () => rangeOfWeek("This Week") },
  { key: "month",     label: "This Month",     compute: () => rangeOfMonth(0, "This Month") },
  { key: "quarter",   label: "This Quarter",   compute: () => rangeOfQuarter("This Quarter") },
  { key: "half",      label: "Half-Year",      compute: () => rangeOfHalfYear("Half-Year") },
  { key: "year",      label: "This Year",      compute: () => rangeOfYear("This Year") },
];

function iso(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}
function rangeFromOffset(startDaysAgo: number, endDaysAgo: number, label: string) {
  const now = new Date();
  const from = new Date(now); from.setDate(from.getDate() - startDaysAgo);
  const to = new Date(now); to.setDate(to.getDate() - endDaysAgo);
  return { from: iso(from), to: iso(to), periodLabel: label };
}
function rangeOfWeek(label: string) {
  const now = new Date();
  const day = now.getDay();
  const monOffset = day === 0 ? 6 : day - 1;
  const start = new Date(now); start.setDate(now.getDate() - monOffset);
  return { from: iso(start), to: iso(now), periodLabel: label };
}
function rangeOfMonth(monthsBack: number, label: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const end = monthsBack === 0 ? now : new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0);
  return { from: iso(start), to: iso(end), periodLabel: label };
}
function rangeOfQuarter(label: string) {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1);
  return { from: iso(start), to: iso(now), periodLabel: label };
}
function rangeOfHalfYear(label: string) {
  const now = new Date();
  const half = now.getMonth() < 6 ? 0 : 6;
  const start = new Date(now.getFullYear(), half, 1);
  return { from: iso(start), to: iso(now), periodLabel: label };
}
function rangeOfYear(label: string) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return { from: iso(start), to: iso(now), periodLabel: label };
}
function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function compactNum(n: number) {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}
function reportToPlainText(r: GeneratedReport) {
  const lines: string[] = [];
  lines.push(r.title);
  lines.push(`Period: ${fmtDate(r.from)} – ${fmtDate(r.to)}`);
  lines.push(`Generated: ${new Date(r.generatedAt).toLocaleString()}`);
  lines.push("");
  for (const [k, v] of Object.entries(r.metrics)) lines.push(`${k}: ${v}`);
  lines.push("");
  for (const s of r.sections) {
    lines.push(s.heading.toUpperCase());
    for (const p of s.paragraphs) { lines.push(p); lines.push(""); }
  }
  return lines.join("\n");
}

const CHART_COLORS = ["#d97a4a", "#b07a4a", "#8b5e3c", "#c89868", "#e3a87d"];

function drawChartOnPdf(doc: jsPDF, chart: Chart, x: number, y: number, w: number): number {
  const titleH = 5;
  const rowH = 5.5;
  const padTop = 1;
  const padBottom = 3;
  const labelW = 38;
  const valueW = 26;
  const barAreaW = w - labelW - valueW - 4;
  const max = Math.max(...chart.data.map(d => d.value), 1);
  const h = titleH + padTop + chart.data.length * rowH + padBottom;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(42, 29, 18);
  doc.text(chart.title, x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(154, 132, 112);
  doc.text(`(${chart.unit})`, x + doc.getTextWidth(chart.title) + 2, y);

  let yy = y + padTop + 3;
  for (let i = 0; i < chart.data.length; i++) {
    const d = chart.data[i];
    const colorHex = CHART_COLORS[i % CHART_COLORS.length];
    const [r, g, b] = hexToRgb(colorHex);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 45, 30);
    const labelTxt = doc.splitTextToSize(d.label, labelW)[0];
    doc.text(labelTxt, x, yy + 2.5);

    // bar background
    doc.setFillColor(244, 230, 215);
    doc.rect(x + labelW, yy, barAreaW, 3.2, "F");
    // bar fill
    const fillW = Math.max(0.5, (d.value / max) * barAreaW);
    doc.setFillColor(r, g, b);
    doc.rect(x + labelW, yy, fillW, 3.2, "F");

    // value label on right
    doc.setTextColor(42, 29, 18);
    doc.setFont("helvetica", "bold");
    doc.text(d.valueLabel, x + labelW + barAreaW + 2, yy + 2.5, { maxWidth: valueW });
    yy += rowH;
  }
  return h;
}
function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
}

function generatePdf(r: GeneratedReport): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const marginTop = 16;
  const marginBottom = 14;
  const contentW = pageW - marginX * 2;

  const cfg = r.compact
    ? { body: 9, head: 11, h2: 10, lh: 4.2, gapAfterPara: 1.5, gapAfterSection: 2.5, metricsGap: 2.5 }
    : { body: 10.5, head: 14, h2: 11.5, lh: 5, gapAfterPara: 2, gapAfterSection: 4, metricsGap: 3 };

  let y = marginTop;
  const ensureSpace = (need: number) => {
    if (y + need > pageH - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setTextColor(176, 122, 74);
  doc.setFontSize(8);
  doc.text(r.mode === "detailed" ? "EXECUTIVE OPERATIONS REPORT" : "OPERATIONS REPORT (PRECISE)", marginX, y);
  y += 4.5;

  doc.setTextColor(42, 29, 18);
  doc.setFontSize(cfg.head);
  doc.text(r.title, marginX, y);
  y += cfg.head * 0.45;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(122, 101, 83);
  doc.text(`${r.company}  ·  ${fmtDate(r.from)} – ${fmtDate(r.to)}  ·  Generated ${new Date(r.generatedAt).toLocaleString()}`, marginX, y);
  y += 3;

  doc.setDrawColor(217, 122, 74);
  doc.setLineWidth(0.8);
  doc.line(marginX, y, marginX + 18, y);
  y += 5;

  // Metrics
  doc.setFontSize(cfg.body);
  const entries = Object.entries(r.metrics);
  const colW = contentW / 2;
  const rowH = cfg.lh;
  for (let i = 0; i < entries.length; i += 2) {
    ensureSpace(rowH);
    for (let c = 0; c < 2 && i + c < entries.length; c++) {
      const [k, v] = entries[i + c];
      const x = marginX + c * colW;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(122, 101, 83);
      doc.text(k, x, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(42, 29, 18);
      doc.text(String(v), x + colW - 2, y, { align: "right", maxWidth: colW - 30 });
    }
    y += rowH;
    doc.setDrawColor(231, 211, 189);
    doc.setLineWidth(0.1);
    doc.line(marginX, y - rowH + 1.5, marginX + contentW, y - rowH + 1.5);
  }
  y += cfg.metricsGap;

  // Charts (2-col grid)
  if (r.charts.length > 0) {
    ensureSpace(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(cfg.h2);
    doc.setTextColor(42, 29, 18);
    doc.text("Visual Snapshot", marginX, y);
    y += cfg.h2 * 0.55;

    const chartW = (contentW - 6) / 2;
    for (let i = 0; i < r.charts.length; i += 2) {
      const left = r.charts[i];
      const right = r.charts[i + 1];
      const leftH = 5 + 1 + left.data.length * 5.5 + 3;
      const rightH = right ? 5 + 1 + right.data.length * 5.5 + 3 : 0;
      const rowMax = Math.max(leftH, rightH);
      ensureSpace(rowMax + 2);
      drawChartOnPdf(doc, left, marginX, y, chartW);
      if (right) drawChartOnPdf(doc, right, marginX + chartW + 6, y, chartW);
      y += rowMax + 4;
    }
    y += 1;
  }

  // Sections
  for (const s of r.sections) {
    ensureSpace(cfg.h2 + cfg.lh);
    doc.setDrawColor(217, 122, 74);
    doc.setLineWidth(1.2);
    doc.line(marginX, y - cfg.h2 * 0.32, marginX, y + 1);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(cfg.h2);
    doc.setTextColor(42, 29, 18);
    doc.text(s.heading, marginX + 2.5, y);
    y += cfg.h2 * 0.55;

    doc.setFont("times", "normal");
    doc.setFontSize(cfg.body);
    doc.setTextColor(42, 29, 18);
    for (const p of s.paragraphs) {
      const wrapped = doc.splitTextToSize(p, contentW);
      ensureSpace(wrapped.length * cfg.lh);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * cfg.lh + cfg.gapAfterPara;
    }
    y += cfg.gapAfterSection - cfg.gapAfterPara;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(154, 132, 112);
    doc.text(`EXIMMAN · My Import & Export Manager · Page ${i} of ${pageCount}`, pageW / 2, pageH - 6, { align: "center" });
  }
  return doc;
}

function safeFilename(s: string) {
  return s.replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "");
}

export function ReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"new" | "archive">("new");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customFrom, setCustomFrom] = useState(iso(new Date(new Date().setDate(new Date().getDate() - 30))));
  const [customTo, setCustomTo] = useState(iso(new Date()));
  const [mode, setMode] = useState<ReportMode>("precise");
  const [report, setReport] = useState<GeneratedReport | null>(null);

  const archiveQuery = useQuery<Report[]>({ queryKey: ["/api/reports"], enabled: open });

  const generate = useMutation({
    mutationFn: async (payload: { from: string; to: string; periodLabel: string; mode: ReportMode }) => {
      const res = await apiRequest("POST", "/api/reports/generate", payload);
      return (await res.json()) as GeneratedReport;
    },
    onSuccess: r => setReport(r),
    onError: (e: any) => toast({ title: "Could not generate report", description: String(e?.message ?? e), variant: "destructive" }),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!report) return;
      const res = await apiRequest("POST", "/api/reports", {
        title: report.title,
        periodLabel: report.periodLabel,
        fromDate: report.from,
        toDate: report.to,
        content: JSON.stringify(report),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      toast({ title: "Saved to archive" });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/reports/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/reports"] }),
  });

  const onPresetClick = (key: string) => {
    const p = PRESETS.find(x => x.key === key);
    if (!p) return;
    setSelectedPreset(key);
    generate.mutate({ ...p.compute(), mode });
  };

  const onCustomGenerate = () => {
    if (customFrom > customTo) {
      toast({ title: "Invalid range", description: "From date must be before To date.", variant: "destructive" });
      return;
    }
    setSelectedPreset("custom");
    generate.mutate({ from: customFrom, to: customTo, periodLabel: "Custom Range", mode });
  };

  const regenerateWithMode = (newMode: ReportMode) => {
    setMode(newMode);
    if (report) {
      generate.mutate({ from: report.from, to: report.to, periodLabel: report.periodLabel, mode: newMode });
    }
  };

  const downloadPdf = () => {
    if (!report) return;
    try {
      const doc = generatePdf(report);
      const filename = `EXIMMAN_${report.mode}_${safeFilename(report.periodLabel)}_${report.from}_to_${report.to}.pdf`;
      doc.save(filename);
      toast({ title: "PDF downloaded", description: filename });
    } catch (e: any) {
      toast({ title: "PDF failed", description: String(e?.message ?? e), variant: "destructive" });
    }
  };

  const share = async () => {
    if (!report) return;
    const text = reportToPlainText(report);
    try {
      if (navigator.share) { await navigator.share({ title: report.title, text }); return; }
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Share unavailable", variant: "destructive" });
    }
  };

  const openArchived = (a: Report) => {
    try {
      const parsed = JSON.parse(a.content) as GeneratedReport;
      if (!parsed.charts) parsed.charts = [];
      if (!parsed.mode) parsed.mode = "precise";
      setMode(parsed.mode);
      setReport(parsed);
      setActiveTab("new");
    } catch {
      toast({ title: "Could not open report", variant: "destructive" });
    }
  };

  const reset = () => { setReport(null); setSelectedPreset(null); setMode("precise"); };

  const ModeChooser = (
    <div className="flex items-center gap-4 text-sm" data-testid="mode-chooser">
      <div className="flex items-center gap-2">
        <Checkbox
          id="mode-detailed"
          checked={mode === "detailed"}
          onCheckedChange={(v) => v && regenerateWithMode("detailed")}
          data-testid="checkbox-detailed"
        />
        <Label htmlFor="mode-detailed" className="cursor-pointer">Detailed report</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="mode-precise"
          checked={mode === "precise"}
          onCheckedChange={(v) => v && regenerateWithMode("precise")}
          data-testid="checkbox-precise"
        />
        <Label htmlFor="mode-precise" className="cursor-pointer">Precise report</Label>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-4xl p-0 gap-0 max-h-[88vh] flex flex-col overflow-hidden" data-testid="dialog-report">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-4 w-4" />
            {report ? report.title : "Generate Executive Report"}
          </DialogTitle>
          <DialogDescription>
            {report
              ? `${fmtDate(report.from)} – ${fmtDate(report.to)} · ${report.mode === "detailed" ? "Detailed" : "Precise"} · Generated ${new Date(report.generatedAt).toLocaleString()}`
              : "Choose a period and report style. The system summarises every operation and financial movement, with charts on periods longer than a week."}
          </DialogDescription>
        </DialogHeader>

        {!report ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-6 mt-3 self-start shrink-0">
              <TabsTrigger value="new" data-testid="tab-new-report">New Report</TabsTrigger>
              <TabsTrigger value="archive" data-testid="tab-archive">Archive {archiveQuery.data?.length ? `(${archiveQuery.data.length})` : ""}</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="flex-1 overflow-y-auto px-6 pb-6 pt-2 mt-0 min-h-0">
              <div className="space-y-5">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Report Style</Label>
                  <div className="mt-2">{ModeChooser}</div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {mode === "detailed"
                      ? "Detailed mode produces full narrative paragraphs across all modules."
                      : "Precise mode produces short, factual one-line summaries per module."}
                    {" "}Periods over 7 days include visual charts.
                  </p>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quick Periods</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                    {PRESETS.map(p => (
                      <Button
                        key={p.key}
                        variant={selectedPreset === p.key ? "default" : "outline"}
                        className="justify-start h-auto py-3 px-3 flex-col items-start gap-0.5"
                        onClick={() => onPresetClick(p.key)}
                        disabled={generate.isPending}
                        data-testid={`button-preset-${p.key}`}
                      >
                        <span className="text-sm font-semibold">{p.label}</span>
                        <span className="text-xs opacity-70">{previewRange(p.compute())}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Custom Date Range</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                    <div>
                      <Label htmlFor="report-from" className="text-xs flex items-center gap-1.5 mb-1.5">
                        <CalendarIcon className="h-3 w-3" /> From
                      </Label>
                      <Input id="report-from" type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} data-testid="input-report-from" />
                    </div>
                    <div>
                      <Label htmlFor="report-to" className="text-xs flex items-center gap-1.5 mb-1.5">
                        <CalendarIcon className="h-3 w-3" /> To
                      </Label>
                      <Input id="report-to" type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} data-testid="input-report-to" />
                    </div>
                    <div className="flex items-end">
                      <Button className="w-full" onClick={onCustomGenerate} disabled={generate.isPending} data-testid="button-generate-custom">
                        {generate.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                        Generate Report
                      </Button>
                    </div>
                  </div>
                </div>

                {generate.isPending && (
                  <div className="text-center py-8 text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Building {mode} summary from live data…
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="archive" className="flex-1 overflow-y-auto px-6 pb-6 pt-2 mt-0 min-h-0">
              {archiveQuery.isLoading ? (
                <div className="text-sm text-muted-foreground py-8 text-center">Loading archive…</div>
              ) : !archiveQuery.data || archiveQuery.data.length === 0 ? (
                <div className="text-sm text-muted-foreground py-12 text-center">No archived reports yet. Generate a report and save it to keep it here.</div>
              ) : (
                <div className="space-y-2">
                  {archiveQuery.data.map(a => (
                    <Card key={a.id} className="hover-elevate" data-testid={`card-archived-${a.id}`}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{a.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {fmtDate(a.fromDate)} – {fmtDate(a.toDate)} · saved {new Date(a.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">{a.periodLabel}</Badge>
                        <Button variant="outline" size="sm" onClick={() => openArchived(a)} data-testid={`button-open-${a.id}`}>Open</Button>
                        <Button variant="ghost" size="icon" onClick={() => del.mutate(a.id)} data-testid={`button-delete-${a.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <div className="px-6 py-2.5 border-b flex items-center justify-between flex-wrap gap-2 shrink-0 bg-muted/30">
              {ModeChooser}
              {generate.isPending && (
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Rebuilding…
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0" data-testid="report-scroll-area">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-5">
                {Object.entries(report.metrics).map(([k, v]) => (
                  <Card key={k}>
                    <CardContent className="p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{k}</p>
                      <p className="text-sm font-bold truncate" data-testid={`metric-${k.replace(/\s+/g, "-").toLowerCase()}`}>{String(v)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {report.charts.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground border-l-2 border-border pl-2 mb-3 flex items-center gap-2" data-testid="section-heading-charts">
                    <BarChart3 className="h-3.5 w-3.5" /> Visual Snapshot
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.charts.map((c, i) => (
                      <Card key={i} data-testid={`chart-${i}`}>
                        <CardContent className="p-3">
                          <div className="flex items-baseline justify-between mb-1.5">
                            <p className="text-xs font-semibold">{c.title}</p>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.unit}</span>
                          </div>
                          <div className="h-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={c.data} layout="vertical" margin={{ top: 2, right: 10, bottom: 2, left: 4 }}>
                                <XAxis type="number" hide tickFormatter={compactNum} />
                                <YAxis type="category" dataKey="label" width={88} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} />
                                <Tooltip
                                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                                  contentStyle={{ fontSize: 11, padding: "4px 8px", borderRadius: 6 }}
                                  formatter={(_v: any, _n: any, p: any) => [p.payload.valueLabel, ""]}
                                  labelFormatter={(l) => l}
                                />
                                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                                  {c.data.map((_d, idx) => (
                                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {report.sections.map((s, i) => (
                <div key={i} className="mb-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground border-l-2 border-border pl-2 mb-2" data-testid={`section-heading-${i}`}>{s.heading}</h3>
                  <div className="space-y-2 text-sm leading-relaxed text-foreground/90" style={{ fontFamily: "Georgia, serif" }}>
                    {s.paragraphs.map((p, j) => (<p key={j} className="text-justify">{p}</p>))}
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter className="px-6 py-3 border-t flex-wrap gap-2 sm:gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={reset} data-testid="button-back-to-presets">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => save.mutate()} disabled={save.isPending} data-testid="button-save-archive">
                {save.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Archive className="h-3.5 w-3.5 mr-1.5" />}
                Save to Archive
              </Button>
              <Button variant="outline" size="sm" onClick={share} data-testid="button-share">
                <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
              </Button>
              <Button size="sm" onClick={downloadPdf} data-testid="button-download-pdf">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download PDF
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function previewRange(r: { from: string; to: string }) {
  if (r.from === r.to) return fmtDate(r.from);
  const a = new Date(r.from + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const b = new Date(r.to + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${a} – ${b}`;
}
