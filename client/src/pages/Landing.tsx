import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Reveal } from "@/components/Reveal";
import { apiRequest } from "@/lib/queryClient";
import eximmanLogo from "@assets/eximman_logo_trim.png";
import pitchDeckPdf from "@assets/EXIMMAN_App_Pitch_Deck_PRESENTATION_1781384251130.pdf";
import {
  Ship, FileText, Calculator, BrainCircuit, Wallet, Package,
  Globe2, ShieldCheck, Sparkles, ArrowRight, Building2, MapPin, Mail, Phone,
  Presentation, Maximize2, TrendingUp, Coins, OctagonX, Send, CheckCircle2,
} from "lucide-react";
import { SiWhatsapp, SiTelegram } from "react-icons/si";

const CATEGORY_OPTIONS = [
  { value: "export", label: "Export" },
  { value: "import", label: "Import" },
  { value: "export_import", label: "Export and Import" },
  { value: "other", label: "Other (please describe)" },
];

function LandingDemoForm() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyCategory, setCompanyCategory] = useState("");
  const [categoryOther, setCategoryOther] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (fullName.trim().length < 2) return setError("Please enter your full name.");
    if (!companyName.trim()) return setError("Please enter your company name.");
    if (!companyCategory) return setError("Please select your company category.");
    if (companyCategory === "other" && !categoryOther.trim())
      return setError("Please describe your company category.");
    if (!position.trim()) return setError("Please enter your position in the company.");
    if (!phone.trim()) return setError("Please enter your phone number.");
    if (!email.trim()) return setError("Please enter your email.");
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/auth/demo-request", {
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        companyCategory,
        categoryOther: companyCategory === "other" ? categoryOther.trim() : undefined,
        position: position.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message?.replace(/^\d+:\s*/, "") || "Could not send your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-10" data-testid="text-landing-demo-success">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h3 className="font-display text-2xl font-semibold tracking-tight">Request received</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Thank you. Our team has received your demo request and will reach back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="form-landing-demo">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ld-name" className="text-xs">Full name</Label>
          <Input
            id="ld-name"
            placeholder="Your full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            data-testid="input-landing-fullname"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ld-company" className="text-xs">Company name</Label>
          <Input
            id="ld-company"
            placeholder="Your company name"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            data-testid="input-landing-company"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ld-category" className="text-xs">Company category</Label>
          <Select value={companyCategory} onValueChange={setCompanyCategory}>
            <SelectTrigger id="ld-category" data-testid="select-landing-category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} data-testid={`option-landing-category-${opt.value}`}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ld-position" className="text-xs">Your position</Label>
          <Input
            id="ld-position"
            placeholder="e.g. General Manager"
            value={position}
            onChange={e => setPosition(e.target.value)}
            data-testid="input-landing-position"
          />
        </div>
      </div>

      {companyCategory === "other" && (
        <div className="space-y-1.5">
          <Label htmlFor="ld-category-other" className="text-xs">Please describe</Label>
          <Textarea
            id="ld-category-other"
            placeholder="Describe your company category"
            value={categoryOther}
            onChange={e => setCategoryOther(e.target.value)}
            className="resize-none"
            rows={2}
            data-testid="input-landing-category-other"
          />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="ld-phone" className="text-xs">Phone number</Label>
          <Input
            id="ld-phone"
            type="tel"
            placeholder="e.g. +251 ..."
            value={phone}
            onChange={e => setPhone(e.target.value)}
            data-testid="input-landing-phone"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ld-email" className="text-xs">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="ld-email"
              type="email"
              autoComplete="email"
              className="pl-9"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              data-testid="input-landing-email"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive" data-testid="text-landing-demo-error">{error}</p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={submitting} data-testid="button-landing-request-demo">
        {submitting ? "Sending..." : <><Send className="h-4 w-4 mr-1.5" /> Send us your request</>}
      </Button>
    </form>
  );
}

const features = [
  { icon: FileText, title: "Letter of Credit Management", desc: "Issue, track and settle LCs with Ethiopian bank workflows and international UCP terminology built in." },
  { icon: Ship, title: "Shipment Tracking", desc: "Monitor import and export shipments end-to-end — from PI to port clearance and delivery." },
  { icon: Calculator, title: "Customs & Tax Engine", desc: "Calculate Ethiopian customs duties, VAT, surtax and withholding on every HS-coded line item." },
  { icon: Wallet, title: "Finance & FX", desc: "Track ETB exposure with live exchange rate scenarios and cost breakdowns across CIF, FOB and CFR." },
  { icon: Package, title: "Inventory Control", desc: "Reconcile landed cost per unit against goods-in-warehouse to know your true margins." },
  { icon: TrendingUp, title: "Sales Management", desc: "Track sales orders, customers and revenue against landed cost to see real margins on every deal." },
  { icon: Coins, title: "Cost Estimator", desc: "Estimate total landed cost upfront — FOB, freight, insurance, duties and inland charges before you commit." },
  { icon: BrainCircuit, title: "AI Insights", desc: "Get predictive alerts on LC expiry, shipment delays and FX volatility tailored to your portfolio." },
];

const audiences = [
  "Import & Export Trading Houses",
  "Manufacturing Companies",
  "Coffee, Oilseed & Pulses Exporters",
  "Restaurants & Hospitality",
  "Logistics & Clearing Agents",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <div className="flex items-center">
            <img
              src={eximmanLogo}
              alt="EXIMMAN — My Export · Import Manager App"
              className="h-16 w-auto object-contain"
              data-testid="img-brand-logo"
            />
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground" data-testid="link-features">Features</a>
            <a href="#pitch-deck" className="text-muted-foreground hover:text-foreground" data-testid="link-pitchdeck">Pitch Deck</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground" data-testid="link-about">About</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground" data-testid="link-contact">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="outline" className="hidden sm:inline-flex" data-testid="button-request-demo-nav">
              <a href="#request-demo">Request a Demo</a>
            </Button>
            <Button asChild data-testid="button-signin-nav">
              <Link href="/signin">Sign In <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </header>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute -top-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 backdrop-blur px-3 py-1 text-xs text-muted-foreground mb-6 animate-fade-up" style={{ animationDelay: "0ms" }}>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Built for Ethiopian businesses, fluent in local and international terms
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05] animate-fade-up" style={{ animationDelay: "80ms" }} data-testid="text-hero-title">
              My Export / Import <span className="text-primary">Manager App</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed animate-fade-up" style={{ animationDelay: "180ms" }} data-testid="text-hero-subtitle">
              A complete operating system for Ethiopian importers and exporters — Letters of Credit, customs duties, shipment tracking, inventory and FX, all in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3 animate-fade-up" style={{ animationDelay: "280ms" }}>
              <Button asChild size="lg" data-testid="button-request-demo-hero">
                <a href="#request-demo">Request a Demo <ArrowRight className="h-4 w-4 ml-1" /></a>
              </Button>
              <Button asChild size="lg" variant="outline" data-testid="button-signin-hero">
                <Link href="/signin">Sign In to Dashboard</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground animate-fade-up" style={{ animationDelay: "380ms" }}>
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> NBE-aligned workflows</div>
              <div className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5 text-primary" /> UCP 600 & Incoterms ready</div>
              <div className="flex items-center gap-1.5"><BrainCircuit className="h-3.5 w-3.5 text-primary" /> AI-assisted insights</div>
            </div>
          </div>

          {/* Hero illustration card */}
          <div className="relative animate-fade-up" style={{ animationDelay: "320ms" }}>
            <Card className="shadow-xl animate-float">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                      <BrainCircuit className="h-4 w-4 text-primary" />
                    </div>
                    <p className="font-display text-sm font-semibold tracking-tight">Live AI Insights</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[0.65rem] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Live
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="rounded-md border p-3 flex items-start gap-3">
                    <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold">LC Expiry Alert</p>
                        <span className="text-[0.6rem] uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">High</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        LC #LC-22041 expires in 12 days. Confirm vessel ETA and prepare shipping documents.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border p-3 flex items-start gap-3">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Wallet className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold">FX Volatility</p>
                        <span className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">Medium</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        ETB/USD weakened 1.8% this week — locking the next LC at today's rate saves ≈ 412,000 ETB.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border p-3 flex items-start gap-3">
                    <div className="h-7 w-7 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Ship className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold">Shipment On Track</p>
                        <span className="text-[0.6rem] uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Good</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        MV Addis Star arriving Djibouti in 4 days — customs pre-clearance ready to file.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">AI Summary:</span> 3 active LCs · 1 priority alert · projected savings 412K ETB this week.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Features */}
      <section id="features" className="py-20 sm:py-24 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Reveal className="max-w-3xl">
            <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 mb-8" data-testid="banner-stop-slogan">
              <OctagonX className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
              <p className="font-display text-lg sm:text-xl font-semibold tracking-tight leading-snug animate-text-shimmer">
                <span className="font-bold">STOP</span> managing your trade business through spreadsheets and phone calls.
              </p>
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">What's Inside</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-2">Everything trade operations need, under one roof.</h2>
            <p className="mt-3 text-muted-foreground">From the moment a Proforma Invoice arrives to the day goods leave the warehouse — EXIMMAN handles the paperwork, the math, and the follow-ups.</p>
          </Reveal>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 80}>
                <Card className="hover-elevate h-full transition-transform duration-300 ease-out hover:-translate-y-1.5">
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-base">{f.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed text-left">{f.desc}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      {/* Pitch Deck Preview */}
      <section id="pitch-deck" className="py-20 sm:py-24 border-b bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground mb-5">
                <Presentation className="h-3.5 w-3.5 text-primary" />
                Product pitch deck · v1.0
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight" data-testid="text-pitchdeck-title">
                See the whole platform before you commit.
              </h2>
              <p className="mt-3 text-muted-foreground leading-relaxed text-justify">
                Flip through our pitch deck for a guided tour of all twelve modules — Letters of Credit, customs, shipments, inventory, finance and AI insights — built specifically for Ethiopian importers and exporters.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Twelve connected modules on one calm surface",
                  "UCP 600 compliant LC workflows, bank-by-bank logic",
                  "Live ETB rates from 26 banks, refreshed every 5 minutes",
                  "AI-powered risk scoring and FX hedging hints",
                ].map(point => (
                  <li key={point} className="flex items-start gap-2.5 text-sm">
                    <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" data-testid="button-request-demo-pitchdeck">
                  <a href="#request-demo">Request a Demo <ArrowRight className="h-4 w-4 ml-1" /></a>
                </Button>
                <Button asChild size="lg" variant="outline" data-testid="button-open-pitchdeck">
                  <a href={pitchDeckPdf} target="_blank" rel="noopener noreferrer">
                    <Maximize2 className="h-4 w-4 mr-1.5" /> Open Full Deck
                  </a>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={120}>
            <Card className="overflow-hidden shadow-xl">
              <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm font-semibold truncate">EXIMMAN Pitch Deck</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">PDF · 19 slides</span>
              </div>
              <a
                href={pitchDeckPdf}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-gradient-to-br from-primary/10 via-muted to-background transition-colors hover:from-primary/15"
                data-testid="link-pitchdeck-preview"
              >
                <div className="flex flex-col items-center justify-center text-center h-[420px] sm:h-[520px] px-6">
                  <div className="h-16 w-16 rounded-md bg-primary/15 flex items-center justify-center mb-5">
                    <Presentation className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-display text-2xl font-semibold tracking-tight">EXIMMAN Pitch Deck</p>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm leading-relaxed">
                    A guided tour of all twelve modules, built for Ethiopian importers and exporters.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-1.5 rounded-md border bg-background px-4 py-2 text-sm font-semibold">
                    <Maximize2 className="h-4 w-4 text-primary" /> Open Full Deck
                  </span>
                  <span className="mt-3 text-xs text-muted-foreground">Opens the PDF in a new tab</span>
                </div>
              </a>
            </Card>
            </Reveal>
          </div>
        </div>
      </section>
      {/* About EXIMMAN */}
      <section id="about" className="py-20 sm:py-24 border-b bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-start">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">About EXIMMAN</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-2" data-testid="text-about-title">
              Software built for the way Ethiopian businesses actually trade.
            </h2>
            <div className="mt-5 space-y-4 text-muted-foreground leading-relaxed text-justify">
              <p>
                EXIMMAN is a software company founded by <span className="text-foreground font-semibold">Abdulkerim MohammedB</span>, engaged in
                building web and mobile applications for companies and organizations active in import and export, manufacturing,
                restaurants, and beyond.
              </p>
              <p>
                Our software is tailored to the Ethiopian context — the way local banks issue Letters of Credit, the way customs
                duties and surtax are computed, the way ETB cash flows interact with foreign currency exposure — while staying
                fluent in international terminology such as Incoterms, UCP 600, HS classification and SWIFT messaging.
              </p>
              <p>
                The result is a precise, dependable toolset that gives Ethiopian companies more clarity and ease of doing business,
                both locally and internationally.
              </p>
            </div>

            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">Who we serve</p>
              <div className="flex flex-wrap gap-2">
                {audiences.map(a => (
                  <span key={a} className="inline-flex items-center rounded-md border bg-background px-2.5 py-1 text-xs">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display text-xl font-semibold">
                  AM
                </div>
                <div>
                  <p className="font-display font-semibold text-lg">Abdulkerim MohammedB.</p>
                  <p className="text-xs text-muted-foreground tracking-[0.14em] uppercase">Founder-CEO, EXIMMAN</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">"Ethiopian businesses deserve software's and digital technologies that speaks their language — integrated both with local habits and global trade standards. EXIMMAN is our commitment to that bridge."</p>
              <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Company</p>
                    <p className="text-muted-foreground">EXIMMAN Software</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Based in</p>
                    <p className="text-muted-foreground">Addis Ababa, Ethiopia</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </Reveal>
        </div>
      </section>
      {/* Request a Demo */}
      <section id="request-demo" className="py-20 sm:py-24 border-b bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center mb-10">
            <p className="text-base sm:text-lg uppercase tracking-[0.18em] font-bold" style={{ color: "#617557" }}>Request a Demo</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-2" data-testid="text-request-demo-title">
              See EXIMMAN in action.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Tell us about your business and our team will reach back to arrange a personalized demo in a short period of time.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <Card>
              <CardContent className="p-6 sm:p-8">
                <LandingDemoForm />
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>
      {/* CTA + Contact */}
      <section id="contact" className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Reveal className="text-center max-w-3xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              Ready to run your trade operations with confidence?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Sign in to your EXIMMAN dashboard and bring every LC, shipment and customs filing into one workspace.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" data-testid="button-request-demo-cta">
                <a href="#request-demo">Request a Demo <ArrowRight className="h-4 w-4 ml-1" /></a>
              </Button>
              <Button asChild size="lg" variant="outline" data-testid="button-signin-cta">
                <Link href="/signin">Sign In</Link>
              </Button>
              <Button asChild size="lg" variant="outline" data-testid="button-contact-email">
                <a href="mailto:merisamarketingsolutions@gmail.com"><Mail className="h-4 w-4 mr-1" /> Email Us</a>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={120}>
          <Card className="mt-12">
            <CardContent className="p-6 sm:p-8">
              <div className="text-center mb-6">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">Contact Us</p>
                <h3 className="font-display text-2xl font-semibold tracking-tight mt-2">Get in touch with EXIMMAN</h3>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-md border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-semibold">Phone</p>
                  </div>
                  <div className="space-y-2">
                    <a href="tel:+251912633329" className="block text-sm font-semibold tabular-nums hover:text-primary" data-testid="link-phone-1">
                      +251 912 633 329
                    </a>
                    <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <SiWhatsapp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> WhatsApp
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <SiTelegram className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" /> Telegram
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-semibold">Email</p>
                  </div>
                  <a
                    href="mailto:merisamarketingsolutions@gmail.com"
                    className="text-sm font-semibold whitespace-nowrap hover:text-primary"
                    data-testid="link-email"
                  >
                    merisamarketingsolutions@gmail.com
                  </a>
                  <p className="text-xs text-muted-foreground mt-2">We typically reply within 24 hours.</p>
                </div>

                <div className="rounded-md border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground font-semibold">Address</p>
                  </div>
                  <p className="text-sm font-semibold" data-testid="text-address">Addis Ababa, Ethiopia</p>
                  <p className="text-xs text-muted-foreground mt-2">EXIMMAN Software — by appointment.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          </Reveal>
        </div>
      </section>
      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} EXIMMAN Software — Founded by Abdulkerim Mohammed. All rights reserved.</p>
          <p>Addis Ababa, Ethiopia · merisamarketingsolutions@gmail.com</p>
        </div>
      </footer>
    </div>
  );
}
