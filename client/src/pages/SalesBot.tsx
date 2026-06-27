import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, CheckCircle2, XCircle, Sparkles, Upload, Send, CalendarPlus, Trash2,
  Loader2, MessageSquare, Plus, ShieldAlert, Link2, RefreshCw,
} from "lucide-react";
import type { SalesLead, SalesMessage, SalesMeeting, SalesBotConfig } from "@shared/schema";

const SEGMENTS = [
  { value: "import_export", label: "Import / Export" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "kindergarten_academy", label: "Kindergarten / Academy" },
  { value: "other", label: "Other" },
];
const segmentLabel = (v: string) => SEGMENTS.find(s => s.value === v)?.label ?? v;

const STATUS_STYLE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  discovered: "secondary",
  approved: "default",
  rejected: "destructive",
  contacted: "default",
  in_conversation: "default",
  meeting_booked: "default",
  won: "default",
  lost: "destructive",
};
const statusLabel = (s: string) => s.replace(/_/g, " ");

interface BotStatus { telegramConfigured: boolean; bot: { username?: string; first_name?: string } | null; }

export default function SalesBot() {
  const { toast } = useToast();
  const [tab, setTab] = useState("approval");
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);

  const { data: status } = useQuery<BotStatus>({ queryKey: ["/api/sales-bot/status"] });
  const { data: leads = [], isLoading: leadsLoading } = useQuery<SalesLead[]>({ queryKey: ["/api/sales-bot/leads"] });
  const { data: meetings = [] } = useQuery<SalesMeeting[]>({ queryKey: ["/api/sales-bot/meetings"] });
  const { data: config } = useQuery<SalesBotConfig>({ queryKey: ["/api/sales-bot/config"] });

  const invalidateLeads = () => queryClient.invalidateQueries({ queryKey: ["/api/sales-bot/leads"] });

  const pending = leads.filter(l => l.status === "discovered");
  const pipeline = leads.filter(l => !["discovered", "rejected", "lost"].includes(l.status));
  const leadName = (id: string) => leads.find(l => l.id === id)?.companyName ?? "Unknown";

  // --- mutations ---
  const approveMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/sales-bot/leads/${id}/approve`),
    onSuccess: () => { invalidateLeads(); toast({ title: "Lead approved" }); },
    onError: (e: any) => toast({ title: "Approve failed", description: e.message, variant: "destructive" }),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/sales-bot/leads/${id}/reject`),
    onSuccess: () => { invalidateLeads(); toast({ title: "Lead rejected" }); },
  });
  const qualifyMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/sales-bot/leads/${id}/qualify`),
    onSuccess: () => { invalidateLeads(); toast({ title: "Lead scored by AI" }); },
    onError: (e: any) => toast({ title: "Scoring failed", description: e.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sales-bot/leads/${id}`),
    onSuccess: () => { invalidateLeads(); toast({ title: "Lead removed" }); },
  });

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        eyebrow="AI Sales Operations"
        title="Telegram Sales Bot"
        description="Discover and qualify company leads, approve them for outreach, let the AI run sales conversations on Telegram, and book meetings — all in one place."
        actions={<TelegramStatusBadge status={status} />}
      />

      {status && !status.telegramConfigured && (
        <Card className="border-gold/40">
          <CardContent className="flex flex-wrap items-start gap-3 pt-6">
            <ShieldAlert className="h-5 w-5 text-gold shrink-0 mt-0.5" />
            <div className="flex-1 min-w-[16rem]">
              <p className="text-sm font-medium text-foreground">Telegram bot not connected yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a bot with <span className="font-medium">@BotFather</span> on Telegram, then add the token as the
                <span className="font-mono"> TELEGRAM_BOT_TOKEN </span> secret. You can still discover, import and approve
                leads now — conversations start automatically once the bot is connected.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Awaiting Approval" value={pending.length} icon={ShieldAlert} />
        <StatCard label="Active Pipeline" value={pipeline.length} icon={MessageSquare} />
        <StatCard label="Meetings Booked" value={meetings.length} icon={CalendarPlus} />
        <StatCard label="Total Leads" value={leads.length} icon={Bot} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="approval" data-testid="tab-approval">Approval Queue</TabsTrigger>
          <TabsTrigger value="pipeline" data-testid="tab-pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="conversations" data-testid="tab-conversations">Conversations</TabsTrigger>
          <TabsTrigger value="meetings" data-testid="tab-meetings">Meetings</TabsTrigger>
          <TabsTrigger value="discovery" data-testid="tab-discovery">Discover &amp; Import</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        {/* APPROVAL QUEUE */}
        <TabsContent value="approval" className="space-y-3 mt-4">
          {leadsLoading ? <LoadingRow /> : pending.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing waiting" text="New discovered or imported leads will appear here for your approval before any outreach." />
          ) : pending.map(lead => (
            <Card key={lead.id} data-testid={`card-pending-${lead.id}`}>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-[14rem]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-foreground" data-testid={`text-leadname-${lead.id}`}>{lead.companyName}</h3>
                      <Badge variant="secondary">{segmentLabel(lead.segment)}</Badge>
                      <SourceBadge source={lead.source} />
                      {Number(lead.aiScore) > 0 && <Badge variant="outline">Fit {lead.aiScore}/100</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {[lead.location, lead.contactName, lead.phone, lead.email].filter(Boolean).join(" · ") || "No contact details yet"}
                    </p>
                    {lead.aiQualification && <p className="text-sm text-foreground/80 mt-2">{lead.aiQualification}</p>}
                    {lead.notes && <p className="text-sm text-muted-foreground mt-1">{lead.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => qualifyMut.mutate(lead.id)} disabled={qualifyMut.isPending} data-testid={`button-qualify-${lead.id}`}>
                      {qualifyMut.isPending && qualifyMut.variables === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Score
                    </Button>
                    <Button size="sm" onClick={() => approveMut.mutate(lead.id)} disabled={approveMut.isPending} data-testid={`button-approve-${lead.id}`}>
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => rejectMut.mutate(lead.id)} data-testid={`button-reject-${lead.id}`}>
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* PIPELINE */}
        <TabsContent value="pipeline" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <AddLeadDialog />
          </div>
          {pipeline.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No active leads" text="Approve leads from the queue to move them into your pipeline." />
          ) : pipeline.map(lead => (
            <Card key={lead.id} data-testid={`card-pipeline-${lead.id}`}>
              <CardContent className="pt-6 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[14rem]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-foreground">{lead.companyName}</h3>
                    <Badge variant={STATUS_STYLE[lead.status] ?? "secondary"}>{statusLabel(lead.status)}</Badge>
                    <Badge variant="secondary">{segmentLabel(lead.segment)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {[lead.location, lead.contactName, lead.telegramUsername ? `@${lead.telegramUsername}` : null].filter(Boolean).join(" · ") || "No contact details"}
                  </p>
                  {lead.aiPitch && <p className="text-sm text-foreground/80 mt-2">Pitch angle: {lead.aiPitch}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => { setActiveLeadId(lead.id); setTab("conversations"); }} data-testid={`button-open-chat-${lead.id}`}>
                    <MessageSquare className="h-4 w-4" /> Chat
                  </Button>
                  <ScheduleMeetingDialog leadId={lead.id} leadName={lead.companyName} />
                  <Button size="icon" variant="ghost" onClick={() => deleteMut.mutate(lead.id)} data-testid={`button-delete-${lead.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* CONVERSATIONS */}
        <TabsContent value="conversations" className="mt-4">
          <ConversationsPanel leads={leads} activeLeadId={activeLeadId} setActiveLeadId={setActiveLeadId} botConfigured={!!status?.telegramConfigured} />
        </TabsContent>

        {/* MEETINGS */}
        <TabsContent value="meetings" className="space-y-3 mt-4">
          {meetings.length === 0 ? (
            <EmptyState icon={CalendarPlus} title="No meetings scheduled" text="Book physical meetings or live demos from the pipeline." />
          ) : meetings.map(m => (
            <Card key={m.id} data-testid={`card-meeting-${m.id}`}>
              <CardContent className="pt-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-foreground">{m.title}</h3>
                    <Badge variant="secondary">{m.mode}</Badge>
                    <Badge variant={m.status === "cancelled" ? "destructive" : "default"}>{m.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {leadName(m.leadId)} · {new Date(m.scheduledAt).toLocaleString()}{m.location ? ` · ${m.location}` : ""}
                  </p>
                  {m.notes && <p className="text-sm text-foreground/80 mt-1">{m.notes}</p>}
                </div>
                <MeetingStatusControls meeting={m} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* DISCOVERY & IMPORT */}
        <TabsContent value="discovery" className="mt-4 grid gap-4 lg:grid-cols-2">
          <DiscoveryCard />
          <ImportCard />
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="mt-4">
          <SettingsPanel config={config} status={status} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TelegramStatusBadge({ status }: { status?: BotStatus }) {
  if (!status) return null;
  if (status.telegramConfigured) {
    return (
      <Badge variant="default" className="gap-1" data-testid="badge-bot-status">
        <Bot className="h-3.5 w-3.5" />
        {status.bot?.username ? `@${status.bot.username}` : "Bot connected"}
      </Badge>
    );
  }
  return <Badge variant="secondary" data-testid="badge-bot-status">Bot not connected</Badge>;
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center justify-between gap-2">
        <div>
          <p className="text-2xl font-semibold text-foreground" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      </CardContent>
    </Card>
  );
}

function SourceBadge({ source }: { source: string }) {
  if (source === "ai_discovery") return <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" /> AI — verify</Badge>;
  if (source === "csv") return <Badge variant="outline">Imported</Badge>;
  if (source === "telegram_inbound") return <Badge variant="outline">Inbound</Badge>;
  return <Badge variant="outline">Manual</Badge>;
}

function LoadingRow() {
  return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
}

function EmptyState({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <Card>
      <CardContent className="py-12 flex flex-col items-center text-center gap-2">
        <Icon className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground max-w-sm">{text}</p>
      </CardContent>
    </Card>
  );
}

function AddLeadDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ companyName: "", segment: "import_export", contactName: "", phone: "", email: "", location: "", notes: "" });
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sales-bot/leads", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-bot/leads"] });
      toast({ title: "Lead added to the approval queue" });
      setOpen(false);
      setForm({ companyName: "", segment: "import_export", contactName: "", phone: "", email: "", location: "", notes: "" });
    },
    onError: (e: any) => toast({ title: "Could not add lead", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="button-add-lead"><Plus className="h-4 w-4" /> Add Lead</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a lead manually</DialogTitle>
          <DialogDescription>It enters the approval queue before any outreach.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="cn">Company name</Label>
            <Input id="cn" value={form.companyName} onChange={e => set("companyName", e.target.value)} data-testid="input-company-name" />
          </div>
          <div>
            <Label>Segment</Label>
            <Select value={form.segment} onValueChange={v => set("segment", v)}>
              <SelectTrigger data-testid="select-segment"><SelectValue /></SelectTrigger>
              <SelectContent>{SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="con">Contact</Label><Input id="con" value={form.contactName} onChange={e => set("contactName", e.target.value)} data-testid="input-contact" /></div>
            <div><Label htmlFor="loc">Location</Label><Input id="loc" value={form.location} onChange={e => set("location", e.target.value)} data-testid="input-location" /></div>
            <div><Label htmlFor="ph">Phone</Label><Input id="ph" value={form.phone} onChange={e => set("phone", e.target.value)} data-testid="input-phone" /></div>
            <div><Label htmlFor="em">Email</Label><Input id="em" value={form.email} onChange={e => set("email", e.target.value)} data-testid="input-email" /></div>
          </div>
          <div><Label htmlFor="nt">Notes</Label><Textarea id="nt" value={form.notes} onChange={e => set("notes", e.target.value)} data-testid="input-notes" /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={!form.companyName.trim() || mut.isPending} data-testid="button-save-lead">
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleMeetingDialog({ leadId, leadName }: { leadId: string; leadName: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: `Intro meeting — ${leadName}`, scheduledAt: "", location: "", mode: "physical", notes: "" });
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sales-bot/meetings", {
      leadId, title: form.title, scheduledAt: new Date(form.scheduledAt).toISOString(),
      location: form.location || undefined, mode: form.mode, notes: form.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-bot/meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales-bot/leads"] });
      toast({ title: "Meeting scheduled" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Could not schedule", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`button-schedule-${leadId}`}><CalendarPlus className="h-4 w-4" /> Meeting</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule a meeting</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label htmlFor="mt">Title</Label><Input id="mt" value={form.title} onChange={e => set("title", e.target.value)} data-testid="input-meeting-title" /></div>
          <div><Label htmlFor="md">Date &amp; time</Label><Input id="md" type="datetime-local" value={form.scheduledAt} onChange={e => set("scheduledAt", e.target.value)} data-testid="input-meeting-date" /></div>
          <div>
            <Label>Mode</Label>
            <Select value={form.mode} onValueChange={v => set("mode", v)}>
              <SelectTrigger data-testid="select-meeting-mode"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label htmlFor="ml">Location / link</Label><Input id="ml" value={form.location} onChange={e => set("location", e.target.value)} data-testid="input-meeting-location" /></div>
          <div><Label htmlFor="mn">Notes</Label><Textarea id="mn" value={form.notes} onChange={e => set("notes", e.target.value)} data-testid="input-meeting-notes" /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={!form.scheduledAt || mut.isPending} data-testid="button-save-meeting">
            {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MeetingStatusControls({ meeting }: { meeting: SalesMeeting }) {
  const { toast } = useToast();
  const mut = useMutation({
    mutationFn: (status: string) => apiRequest("PATCH", `/api/sales-bot/meetings/${meeting.id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/sales-bot/meetings"] }); },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/sales-bot/meetings/${meeting.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/sales-bot/meetings"] }); },
  });
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={meeting.status} onValueChange={v => mut.mutate(v)}>
        <SelectTrigger className="w-36" data-testid={`select-meeting-status-${meeting.id}`}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="proposed">Proposed</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
      <Button size="icon" variant="ghost" onClick={() => del.mutate()} data-testid={`button-delete-meeting-${meeting.id}`}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

function ConversationsPanel({ leads, activeLeadId, setActiveLeadId, botConfigured }: {
  leads: SalesLead[]; activeLeadId: string | null; setActiveLeadId: (id: string) => void; botConfigured: boolean;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const conversational = leads.filter(l => l.telegramChatId || ["in_conversation", "contacted", "meeting_booked", "won"].includes(l.status));
  const active = conversational.find(l => l.id === activeLeadId) ?? conversational[0] ?? null;

  const { data: messages = [] } = useQuery<SalesMessage[]>({
    queryKey: ["/api/sales-bot/messages", active?.id],
    enabled: !!active,
  });

  const sendMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/sales-bot/leads/${active!.id}/message`, { body: draft }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-bot/messages", active!.id] });
      setDraft("");
    },
    onError: (e: any) => toast({ title: "Could not send", description: e.message, variant: "destructive" }),
  });

  if (conversational.length === 0) {
    return <EmptyState icon={MessageSquare} title="No conversations yet" text="Once leads connect to your Telegram bot (or you approve a connected lead), their conversations appear here." />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
      <Card className="md:max-h-[32rem]">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Leads</CardTitle></CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[26rem]">
            <div className="space-y-1">
              {conversational.map(l => (
                <button
                  key={l.id}
                  onClick={() => setActiveLeadId(l.id)}
                  className={`w-full text-left rounded-md p-2 hover-elevate ${active?.id === l.id ? "bg-muted" : ""}`}
                  data-testid={`conv-lead-${l.id}`}
                >
                  <p className="text-sm font-medium text-foreground truncate">{l.companyName}</p>
                  <p className="text-xs text-muted-foreground">{statusLabel(l.status)}</p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex flex-col md:max-h-[32rem]">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-sm">{active?.companyName}</CardTitle>
          <CardDescription>
            {active?.telegramChatId ? "Connected on Telegram" : "Not connected on Telegram yet — share your bot link so they can message it."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-3">
          <ScrollArea className="h-[22rem] pr-3">
            <div className="space-y-3">
              {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p>}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`} data-testid={`msg-${m.id}`}>
                  <div className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${m.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={`text-[0.65rem] mt-1 ${m.direction === "outbound" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{new Date(m.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
        <div className="p-3 border-t flex items-center gap-2">
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && draft.trim() && active?.telegramChatId) sendMut.mutate(); }}
            placeholder={active?.telegramChatId ? "Type a message to send manually…" : "Lead must connect on Telegram first"}
            disabled={!active?.telegramChatId || !botConfigured}
            data-testid="input-chat-message"
          />
          <Button onClick={() => sendMut.mutate()} disabled={!draft.trim() || !active?.telegramChatId || !botConfigured || sendMut.isPending} data-testid="button-send-message">
            {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function DiscoveryCard() {
  const { toast } = useToast();
  const [segment, setSegment] = useState("import_export");
  const [region, setRegion] = useState("Ethiopia");
  const [count, setCount] = useState("6");

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sales-bot/discover", { segment, region, count: Number(count) }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/sales-bot/leads"] });
      toast({ title: `${data.count} prospects added`, description: "Review them in the Approval Queue. Verify details before outreach." });
    },
    onError: (e: any) => toast({ title: "Discovery failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-gold" /> AI Lead Discovery</CardTitle>
        <CardDescription>Generate candidate companies to research. These are suggestions to verify — not confirmed contacts — and land in the approval queue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Segment</Label>
          <Select value={segment} onValueChange={setSegment}>
            <SelectTrigger data-testid="select-discover-segment"><SelectValue /></SelectTrigger>
            <SelectContent>{SEGMENTS.filter(s => s.value !== "other").map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="rg">Region</Label><Input id="rg" value={region} onChange={e => setRegion(e.target.value)} data-testid="input-discover-region" /></div>
          <div><Label htmlFor="ct">How many</Label><Input id="ct" type="number" min={1} max={15} value={count} onChange={e => setCount(e.target.value)} data-testid="input-discover-count" /></div>
        </div>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending} data-testid="button-discover">
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Discover prospects
        </Button>
      </CardContent>
    </Card>
  );
}

function ImportCard() {
  const { toast } = useToast();
  const [csv, setCsv] = useState("");

  const mut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sales-bot/import", { csv }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/sales-bot/leads"] });
      toast({ title: `${data.count} leads imported`, description: "Review them in the Approval Queue." });
      setCsv("");
    },
    onError: (e: any) => toast({ title: "Import failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4" /> Import Leads (CSV / list)</CardTitle>
        <CardDescription>Paste rows with a header like <span className="font-mono">company,segment,contact,phone,email,location</span>, or just one company name per line.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={csv}
          onChange={e => setCsv(e.target.value)}
          rows={8}
          placeholder={"company,segment,phone,location\nAddis Textiles,manufacturing,+251...,Addis Ababa\nBright Future Academy,kindergarten_academy,,Adama"}
          className="font-mono text-xs"
          data-testid="input-csv"
        />
        <Button onClick={() => mut.mutate()} disabled={!csv.trim() || mut.isPending} data-testid="button-import">
          {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import
        </Button>
      </CardContent>
    </Card>
  );
}

function SettingsPanel({ config, status }: { config?: SalesBotConfig; status?: BotStatus }) {
  const { toast } = useToast();
  const [form, setForm] = useState<Partial<SalesBotConfig>>({});
  const merged = { ...config, ...form } as SalesBotConfig;
  const set = (k: keyof SalesBotConfig, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const saveMut = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/sales-bot/config", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-bot/config"] });
      toast({ title: "Settings saved" });
      setForm({});
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const webhookMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sales-bot/setup-webhook"),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/sales-bot/status"] }); toast({ title: "Webhook connected", description: "Your bot will now receive messages." }); },
    onError: (e: any) => toast({ title: "Webhook setup failed", description: e.message, variant: "destructive" }),
  });

  if (!config) return <LoadingRow />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">AI Sales Agent</CardTitle><CardDescription>How the bot represents EXIMMAN in conversations.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div><Label htmlFor="company">Company name</Label><Input id="company" value={merged.companyName ?? ""} onChange={e => set("companyName", e.target.value)} data-testid="input-config-company" /></div>
          <div><Label htmlFor="persona">Agent persona &amp; tone</Label><Textarea id="persona" rows={4} value={merged.persona ?? ""} onChange={e => set("persona", e.target.value)} data-testid="input-config-persona" /></div>
          <div><Label htmlFor="catalog">Product / service description</Label><Textarea id="catalog" rows={5} value={merged.productCatalog ?? ""} onChange={e => set("productCatalog", e.target.value)} data-testid="input-config-catalog" /></div>
          <div><Label htmlFor="meet">Default meeting link (optional)</Label><Input id="meet" value={merged.meetingLink ?? ""} onChange={e => set("meetingLink", e.target.value)} data-testid="input-config-meetlink" /></div>
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div><p className="text-sm font-medium text-foreground">Auto-reply to inbound messages</p><p className="text-xs text-muted-foreground">When on, the AI answers people who message the bot.</p></div>
            <Switch checked={!!merged.autoReplyEnabled} onCheckedChange={v => set("autoReplyEnabled", v)} data-testid="switch-autoreply" />
          </div>
          <Button onClick={() => saveMut.mutate()} disabled={Object.keys(form).length === 0 || saveMut.isPending} data-testid="button-save-config">
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> Telegram Connection</CardTitle><CardDescription>Connect your BotFather bot to start conversations.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border p-3 space-y-1">
            <p className="text-sm text-foreground">
              Status: {status?.telegramConfigured
                ? <span className="font-medium">Token detected{status.bot?.username ? ` (@${status.bot.username})` : ""}</span>
                : <span className="font-medium">No token set</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              1. In Telegram, open <span className="font-medium">@BotFather</span> and run <span className="font-mono">/newbot</span>.<br />
              2. Copy the token and add it as the <span className="font-mono">TELEGRAM_BOT_TOKEN</span> secret.<br />
              3. Click “Connect webhook” below so the bot receives messages.
            </p>
          </div>
          <Button onClick={() => webhookMut.mutate()} disabled={!status?.telegramConfigured || webhookMut.isPending} data-testid="button-setup-webhook">
            {webhookMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Connect webhook
          </Button>
          <p className="text-xs text-muted-foreground">
            Leads can only be messaged after they tap <span className="font-medium">Start</span> on your bot. Share your bot link
            {status?.bot?.username ? <> (<span className="font-mono">t.me/{status.bot.username}</span>)</> : null} with prospects to begin conversations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
