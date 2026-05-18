import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Archive, Download, Share2, Loader2, Calendar as CalendarIcon, FileText, Sparkles, Trash2, ArrowLeft } from "lucide-react";
import type { Report } from "@shared/schema";

type Section = { heading: string; paragraphs: string[] };
type GeneratedReport = {
  title: string;
  periodLabel: string;
  from: string;
  to: string;
  generatedAt: string;
  company: string;
  headline: string;
  metrics: Record<string, string | number>;
  sections: Section[];
};

const PRESETS: Array<{ key: string; label: string; compute: () => { from: string; to: string; periodLabel: string } }> = [
  { key: "today",     label: "Today's Report",        compute: () => rangeFromOffset(0, 0, "Today") },
  { key: "yesterday", label: "Yesterday's Report",    compute: () => rangeFromOffset(1, 1, "Yesterday") },
  { key: "week",      label: "This Week",              compute: () => rangeOfWeek("This Week") },
  { key: "month",     label: "This Month",             compute: () => rangeOfMonth(0, "This Month") },
  { key: "quarter",   label: "This Quarter",           compute: () => rangeOfQuarter("This Quarter") },
  { key: "half",      label: "Half-Year Report",       compute: () => rangeOfHalfYear("Half-Year") },
  { key: "year",      label: "This Year",              compute: () => rangeOfYear("This Year") },
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
  const day = now.getDay(); // 0 = Sun
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
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function reportToHtml(r: GeneratedReport, companyLine: string) {
  const sectionsHtml = r.sections.map(s => `
    <section>
      <h2>${escapeHtml(s.heading)}</h2>
      ${s.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("")}
    </section>`).join("");
  const metricsHtml = Object.entries(r.metrics).map(([k, v]) => `
    <div class="metric"><div class="m-label">${escapeHtml(k)}</div><div class="m-value">${escapeHtml(String(v))}</div></div>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(r.title)}</title>
    <style>
      @page { size: A4; margin: 18mm 16mm; }
      body { font-family: Georgia, 'Times New Roman', serif; color: #2a1d12; line-height: 1.55; font-size: 11.5pt; }
      .eyebrow { letter-spacing: 0.18em; font-size: 9pt; color: #b07a4a; font-family: 'Helvetica Neue', Arial, sans-serif; text-transform: uppercase; font-weight: 600; }
      h1 { font-size: 24pt; margin: 4px 0 6px; }
      .meta { color: #7a6553; font-size: 10pt; font-family: 'Helvetica Neue', Arial, sans-serif; }
      .rule { height: 3px; width: 56px; background: #d97a4a; margin: 14px 0 18px; }
      .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 18px; margin: 14px 0 22px; font-family: 'Helvetica Neue', Arial, sans-serif; }
      .metric { display: flex; justify-content: space-between; border-bottom: 1px dotted #e7d3bd; padding: 4px 0; font-size: 10pt; }
      .m-label { color: #7a6553; }
      .m-value { font-weight: 700; color: #2a1d12; }
      h2 { font-size: 13pt; margin: 18px 0 6px; color: #2a1d12; border-left: 3px solid #d97a4a; padding-left: 10px; }
      p { margin: 6px 0 10px; text-align: justify; }
      .footer { margin-top: 26px; color: #9a8470; font-size: 9pt; font-family: 'Helvetica Neue', Arial, sans-serif; border-top: 1px solid #e7d3bd; padding-top: 10px; }
    </style></head><body>
    <div class="eyebrow">Executive Operations Report</div>
    <h1>${escapeHtml(r.title)}</h1>
    <div class="meta">${escapeHtml(companyLine)} &middot; Period: ${escapeHtml(fmtDate(r.from))} — ${escapeHtml(fmtDate(r.to))} &middot; Generated ${escapeHtml(new Date(r.generatedAt).toLocaleString())}</div>
    <div class="rule"></div>
    <div class="metrics">${metricsHtml}</div>
    ${sectionsHtml}
    <div class="footer">EXIMMAN &middot; My Import &amp; Export Manager &middot; This report was auto-generated from live operational data. All figures should be cross-referenced with the underlying transaction modules before external distribution.</div>
    </body></html>`;
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function reportToPlainText(r: GeneratedReport) {
  const lines: string[] = [];
  lines.push(r.title);
  lines.push(`Period: ${fmtDate(r.from)} — ${fmtDate(r.to)}`);
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

export function ReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"new" | "archive">("new");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customFrom, setCustomFrom] = useState(iso(new Date(new Date().setDate(new Date().getDate() - 30))));
  const [customTo, setCustomTo] = useState(iso(new Date()));
  const [report, setReport] = useState<GeneratedReport | null>(null);

  const archiveQuery = useQuery<Report[]>({ queryKey: ["/api/reports"], enabled: open });

  const generate = useMutation({
    mutationFn: async (payload: { from: string; to: string; periodLabel: string }) => {
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
      toast({ title: "Saved to archive", description: "The report is now available under Archive." });
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
    const r = p.compute();
    generate.mutate(r);
  };

  const onCustomGenerate = () => {
    if (customFrom > customTo) {
      toast({ title: "Invalid range", description: "From date must be before To date.", variant: "destructive" });
      return;
    }
    setSelectedPreset("custom");
    generate.mutate({ from: customFrom, to: customTo, periodLabel: `Custom Range` });
  };

  const downloadPdf = () => {
    if (!report) return;
    const html = reportToHtml(report, "EXIMMAN · " + report.company);
    const w = window.open("", "_blank");
    if (!w) return toast({ title: "Pop-up blocked", description: "Allow pop-ups to download the PDF.", variant: "destructive" });
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { try { w.print(); } catch {} }, 300);
  };

  const share = async () => {
    if (!report) return;
    const text = reportToPlainText(report);
    try {
      if (navigator.share) {
        await navigator.share({ title: report.title, text });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard", description: "Report text is ready to paste anywhere." });
    } catch {
      toast({ title: "Share unavailable", description: "Copy the report manually.", variant: "destructive" });
    }
  };

  const openArchived = (a: Report) => {
    try {
      const parsed = JSON.parse(a.content) as GeneratedReport;
      setReport(parsed);
      setActiveTab("new");
    } catch {
      toast({ title: "Could not open report", variant: "destructive" });
    }
  };

  const reset = () => { setReport(null); setSelectedPreset(null); };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-4xl p-0 gap-0 max-h-[88vh] flex flex-col" data-testid="dialog-report">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-4 w-4" />
            {report ? report.title : "Generate Executive Report"}
          </DialogTitle>
          <DialogDescription>
            {report
              ? `Period: ${fmtDate(report.from)} — ${fmtDate(report.to)} · Generated ${new Date(report.generatedAt).toLocaleString()}`
              : "Choose a reporting period. The system will summarise every operation and financial activity in professional, paragraph-style language."}
          </DialogDescription>
        </DialogHeader>

        {!report ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-6 mt-3 self-start">
              <TabsTrigger value="new" data-testid="tab-new-report">New Report</TabsTrigger>
              <TabsTrigger value="archive" data-testid="tab-archive">Archive {archiveQuery.data?.length ? `(${archiveQuery.data.length})` : ""}</TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="flex-1 overflow-auto px-6 pb-6 pt-2 mt-0">
              <div className="space-y-5">
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
                      <Input
                        id="report-from"
                        type="date"
                        value={customFrom}
                        onChange={e => setCustomFrom(e.target.value)}
                        data-testid="input-report-from"
                      />
                    </div>
                    <div>
                      <Label htmlFor="report-to" className="text-xs flex items-center gap-1.5 mb-1.5">
                        <CalendarIcon className="h-3 w-3" /> To
                      </Label>
                      <Input
                        id="report-to"
                        type="date"
                        value={customTo}
                        onChange={e => setCustomTo(e.target.value)}
                        data-testid="input-report-to"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        className="w-full"
                        onClick={onCustomGenerate}
                        disabled={generate.isPending}
                        data-testid="button-generate-custom"
                      >
                        {generate.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                        Generate Report
                      </Button>
                    </div>
                  </div>
                </div>

                {generate.isPending && (
                  <div className="text-center py-8 text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Building professional summary from live data…
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="archive" className="flex-1 overflow-auto px-6 pb-6 pt-2 mt-0">
              {archiveQuery.isLoading ? (
                <div className="text-sm text-muted-foreground py-8 text-center">Loading archive…</div>
              ) : !archiveQuery.data || archiveQuery.data.length === 0 ? (
                <div className="text-sm text-muted-foreground py-12 text-center">
                  No archived reports yet. Generate a report and save it to keep it here.
                </div>
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
                            {fmtDate(a.fromDate)} — {fmtDate(a.toDate)} · saved {new Date(a.createdAt).toLocaleDateString()}
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
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-5">
                {Object.entries(report.metrics).slice(0, 10).map(([k, v]) => (
                  <Card key={k}>
                    <CardContent className="p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{k}</p>
                      <p className="text-sm font-bold truncate" data-testid={`metric-${k.replace(/\s+/g, "-").toLowerCase()}`}>{String(v)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {report.sections.map((s, i) => (
                <div key={i} className="mb-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-l-2 border-primary pl-2 mb-2" data-testid={`section-heading-${i}`}>
                    {s.heading}
                  </h3>
                  <div className="space-y-2.5 text-sm leading-relaxed text-foreground/90" style={{ fontFamily: "Georgia, serif" }}>
                    {s.paragraphs.map((p, j) => (
                      <p key={j} className="text-justify">{p}</p>
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
            <DialogFooter className="px-6 py-3 border-t flex-wrap gap-2 sm:gap-2">
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
