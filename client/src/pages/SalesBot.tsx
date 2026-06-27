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
  Loader2, MessageSquare, Plus, ShieldAlert, Link2, RefreshCw, CalendarClock, Sun, Moon,
  Copy, Phone, MessageCircle,
} from "lucide-react";
import type { SalesLead, SalesMessage, SalesMeeting, SalesBotConfig, SalesSlot } from "@shared/schema";

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
  const outreachMut = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/sales-bot/leads/${id}/outreach`),
    onSuccess: () => { invalidateLeads(); toast({ title: "Outreach started", description: "The bot just sent its opening message." }); },
    onError: (e: any) => toast({ title: "Outreach failed", description: e.message, variant: "destructive" }),
  });

  const botUsername = status?.bot?.username;
  const companyName = config?.companyName || "EXIMMAN";

  const inviteLink = (leadId: string) => `https://t.me/${botUsername}?start=${leadId}`;

  // A ready-to-send outreach message the CEO can paste into their own SMS or
  // WhatsApp. Telegram bots cannot text phone numbers first, so we hand the CEO
  // a complete message (with the invite link) to send from their phone.
  const buildInviteMessage = (lead: SalesLead) => {
    const greeting = lead.contactName ? `Hello ${lead.contactName},` : "Hello,";
    return (
      `${greeting}\n\n` +
      `This is ${companyName}. We'd love to connect with you about import/export opportunities. ` +
      `Tap the link below to chat with us directly on Telegram:\n\n` +
      `${inviteLink(lead.id)}`
    );
  };

  // Normalise common Ethiopian formats to an international number (no +). Handles
  // 00 prefixes, a leading 0, a bare 9-digit local mobile (9xxxxxxxx), and numbers
  // already in 251... form. Returns "" when the result is not a plausible length.
  const intlPhone = (phone?: string | null) => {
    if (!phone) return "";
    let d = phone.replace(/\D/g, "");
    if (d.startsWith("00")) d = d.slice(2);
    else if (d.startsWith("0")) d = `251${d.slice(1)}`;
    else if (d.length === 9 && d.startsWith("9")) d = `251${d}`; // 912345678 -> 251912345678
    // Plausible international length check (country code + subscriber number).
    if (d.length < 8 || d.length > 15) return "";
    return d;
  };

  // iOS expects `&body=` while Android/others accept `?body=`. Detect iOS so the
  // prefilled message isn't dropped.
  const smsSeparator = () => (/iP(hone|ad|od)/.test(navigator.userAgent) ? "&" : "?");

  const requireBot = () => {
    if (botUsername) return true;
    toast({ title: "Connect the bot first", description: "Set up the Telegram bot before sharing invite links.", variant: "destructive" });
    return false;
  };

  const noPhoneToast = () => toast({ title: "Invalid phone number", description: "Add a valid phone number for this lead first.", variant: "destructive" });

  const copyInvite = async (lead: SalesLead) => {
    if (!requireBot()) return;
    const message = buildInviteMessage(lead);
    try {
      await navigator.clipboard.writeText(message);
      toast({ title: "Message copied", description: "Paste it into SMS or WhatsApp and send it to this contact." });
    } catch {
      toast({ title: "Copy this message", description: message });
    }
  };

  const openSms = (lead: SalesLead) => {
    if (!requireBot()) return;
    const num = intlPhone(lead.phone);
    if (!num) { noPhoneToast(); return; }
    window.open(`sms:${num}${smsSeparator()}body=${encodeURIComponent(buildInviteMessage(lead))}`, "_blank");
  };

  const openWhatsApp = (lead: SalesLead) => {
    if (!requireBot()) return;
    const num = intlPhone(lead.phone);
    if (!num) { noPhoneToast(); return; }
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(buildInviteMessage(lead))}`, "_blank");
  };

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
          <TabsTrigger value="availability" data-testid="tab-availability">Availability</TabsTrigger>
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
                  {lead.telegramChatId ? (
                    lead.status === "approved" && (
                      <Button size="sm" onClick={() => outreachMut.mutate(lead.id)} disabled={outreachMut.isPending} data-testid={`button-outreach-${lead.id}`}>
                        {outreachMut.isPending && outreachMut.variables === lead.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Start outreach
                      </Button>
                    )
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openWhatsApp(lead)} data-testid={`button-whatsapp-${lead.id}`}>
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openSms(lead)} data-testid={`button-sms-${lead.id}`}>
                        <Phone className="h-4 w-4" /> SMS
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copyInvite(lead)} data-testid={`button-invite-${lead.id}`}>
                        <Copy className="h-4 w-4" /> Copy message
                      </Button>
                    </>
                  )}
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

        {/* AVAILABILITY */}
        <TabsContent value="availability" className="mt-4">
          <AvailabilityPanel />
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
            <Label htmlFor="cn">Company name <span className="text-destructive">*</span></Label>
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
            <div><Label htmlFor="ph">Phone <span className="text-destructive">*</span></Label><Input id="ph" value={form.phone} onChange={e => set("phone", e.target.value)} data-testid="input-phone" /></div>
            <div><Label htmlFor="em">Email</Label><Input id="em" value={form.email} onChange={e => set("email", e.target.value)} data-testid="input-email" /></div>
          </div>
          <div><Label htmlFor="nt">Notes</Label><Textarea id="nt" value={form.notes} onChange={e => set("notes", e.target.value)} data-testid="input-notes" /></div>
        </div>
        <DialogFooter>
          <Button onClick={() => mut.mutate()} disabled={!form.companyName.trim() || !form.phone.trim() || mut.isPending} data-testid="button-save-lead">
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

function formatSlotDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function AvailabilityPanel() {
  const { toast } = useToast();
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [morningTime, setMorningTime] = useState("09:00");
  const [eveningTime, setEveningTime] = useState("16:00");
  const [includeMorning, setIncludeMorning] = useState(true);
  const [includeEvening, setIncludeEvening] = useState(true);
  const [weekdaysOnly, setWeekdaysOnly] = useState(true);

  const { data: slots = [], isLoading } = useQuery<SalesSlot[]>({ queryKey: ["/api/sales-bot/slots"] });

  const genMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sales-bot/slots/generate", {
      month, morningTime, eveningTime, includeMorning, includeEvening, weekdaysOnly,
    }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/sales-bot/slots"] });
      toast({ title: `${data.created} time slots added`, description: "The bot will now offer and book only these times." });
    },
    onError: (e: any) => toast({ title: "Could not generate slots", description: e.message, variant: "destructive" }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/sales-bot/slots/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sales-bot/slots"] }),
    onError: (e: any) => toast({ title: "Could not remove slot", description: e.message, variant: "destructive" }),
  });

  const available = slots.filter(s => s.status === "available");
  const booked = slots.filter(s => s.status === "booked");

  // Group available slots by date for a tidy calendar-like list.
  const byDate = new Map<string, SalesSlot[]>();
  for (const s of available) {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  }
  const dates = Array.from(byDate.keys()).sort();

  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-gold" /> Set monthly availability
          </CardTitle>
          <CardDescription>
            Pre-arrange the morning and evening times you are open to meet for a whole month. The sales bot will only ever offer and book these times.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="slot-month">Month</Label>
            <Input id="slot-month" type="month" value={month} onChange={e => setMonth(e.target.value)} data-testid="input-slot-month" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="inc-morning" className="flex items-center gap-2"><Sun className="h-4 w-4 text-muted-foreground" /> Morning slots</Label>
              <Switch id="inc-morning" checked={includeMorning} onCheckedChange={setIncludeMorning} data-testid="switch-include-morning" />
            </div>
            {includeMorning && (
              <Input type="time" value={morningTime} onChange={e => setMorningTime(e.target.value)} data-testid="input-morning-time" />
            )}
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="inc-evening" className="flex items-center gap-2"><Moon className="h-4 w-4 text-muted-foreground" /> Evening slots</Label>
              <Switch id="inc-evening" checked={includeEvening} onCheckedChange={setIncludeEvening} data-testid="switch-include-evening" />
            </div>
            {includeEvening && (
              <Input type="time" value={eveningTime} onChange={e => setEveningTime(e.target.value)} data-testid="input-evening-time" />
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="weekdays-only">Weekdays only</Label>
            <Switch id="weekdays-only" checked={weekdaysOnly} onCheckedChange={setWeekdaysOnly} data-testid="switch-weekdays-only" />
          </div>
          <Button
            className="w-full"
            onClick={() => genMut.mutate()}
            disabled={genMut.isPending || (!includeMorning && !includeEvening)}
            data-testid="button-generate-slots"
          >
            {genMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Generate slots for month
          </Button>
          <p className="text-xs text-muted-foreground">Existing slots for these days are kept — generating again only fills in any gaps.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Available times</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" data-testid="badge-available-count">{available.length} open</Badge>
            <Badge variant="default" data-testid="badge-booked-count">{booked.length} booked</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : available.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No availability set" text="Generate morning and evening slots for the month so the bot can book meetings." />
          ) : (
            <div className="space-y-4">
              {dates.map(date => (
                <div key={date} data-testid={`group-slots-${date}`}>
                  <p className="text-sm font-medium text-foreground mb-2">{formatSlotDate(date)}</p>
                  <div className="flex flex-wrap gap-2">
                    {byDate.get(date)!.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(s => (
                      <div
                        key={s.id}
                        className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1"
                        data-testid={`slot-${s.id}`}
                      >
                        {s.period === "evening" ? <Moon className="h-3.5 w-3.5 text-muted-foreground" /> : <Sun className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="text-sm">{s.startTime}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => delMut.mutate(s.id)}
                          disabled={delMut.isPending}
                          data-testid={`button-delete-slot-${s.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
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
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div><p className="text-sm font-medium text-foreground">Auto-start outreach on approval</p><p className="text-xs text-muted-foreground">When on, approving a connected lead immediately sends the AI opener. Turn off to start outreach manually.</p></div>
            <Switch checked={!!merged.autoOutreachEnabled} onCheckedChange={v => set("autoOutreachEnabled", v)} data-testid="switch-autooutreach" />
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

          <div className="rounded-md border p-3 space-y-1" data-testid="text-business-mode-help">
            <p className="text-sm font-medium text-foreground">Use with Telegram Business (answer on your behalf)</p>
            <p className="text-xs text-muted-foreground">
              Seeing “This bot doesn’t support Telegram Business yet”? You must turn on Business Mode for the bot:<br />
              1. Open <span className="font-medium">@BotFather</span> → <span className="font-mono">/mybots</span> → select your bot.<br />
              2. <span className="font-medium">Bot Settings</span> → <span className="font-medium">Business Mode</span> → <span className="font-medium">Turn on</span>.<br />
              3. Back here, click <span className="font-medium">Connect webhook</span> again so the bot receives business chats.<br />
              4. In Telegram <span className="font-medium">Settings → Telegram Business → Chat Automation</span>, add your bot. It will now auto-reply to customers who message your account.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Telegram does not let bots message phone numbers first. For each approved lead, use
            <span className="font-medium"> WhatsApp</span>, <span className="font-medium">SMS</span> or <span className="font-medium">Copy message</span> in
            the pipeline to send the ready-made invite from your own phone — when the contact taps
            <span className="font-medium"> Start</span>, the bot links them and greets them automatically. After that the AI runs the whole conversation and books the meeting.
            {status?.bot?.username ? <> Your bot: <span className="font-mono">t.me/{status.bot.username}</span>.</> : null}
          </p>

          <div className="pt-1">
            <Label htmlFor="adminChat">Admin chat ID for meeting alerts</Label>
            <Input id="adminChat" value={merged.adminChatId ?? ""} onChange={e => set("adminChatId", e.target.value)} placeholder="e.g. 123456789" data-testid="input-config-adminchat" />
            <p className="text-xs text-muted-foreground mt-1">
              Open your bot in Telegram and send <span className="font-mono">/myid</span> — it replies with your chat ID. Paste it here and save to get a Telegram alert whenever the bot books a meeting.
            </p>
          </div>
          <Button variant="outline" onClick={() => saveMut.mutate()} disabled={Object.keys(form).length === 0 || saveMut.isPending} data-testid="button-save-config-telegram">
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
