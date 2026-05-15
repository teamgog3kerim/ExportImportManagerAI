import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Ship, FileText, Calculator, BrainCircuit, Wallet, Package,
  Globe2, ShieldCheck, Sparkles, ArrowRight, Building2, MapPin, Mail,
} from "lucide-react";

const features = [
  { icon: FileText, title: "Letter of Credit Management", desc: "Issue, track and settle LCs with Ethiopian bank workflows and international UCP terminology built in." },
  { icon: Ship, title: "Shipment Tracking", desc: "Monitor import and export shipments end-to-end — from PI to port clearance and delivery." },
  { icon: Calculator, title: "Customs & Tax Engine", desc: "Calculate Ethiopian customs duties, VAT, surtax and withholding on every HS-coded line item." },
  { icon: Wallet, title: "Finance & FX", desc: "Track ETB exposure with live exchange rate scenarios and cost breakdowns across CIF, FOB and CFR." },
  { icon: Package, title: "Inventory Control", desc: "Reconcile landed cost per unit against goods-in-warehouse to know your true margins." },
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
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center shrink-0 shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary-foreground">
                <circle cx="12" cy="12" r="8.5" opacity="0.35" />
                <path d="M3.5 12h17" opacity="0.35" />
                <path d="M5 9 L9 9 L9 6.5" />
                <path d="M9 9 L4.5 13.5" />
                <path d="M19 15 L15 15 L15 17.5" />
                <path d="M15 15 L19.5 10.5" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold tracking-tight text-[19px] leading-none" data-testid="text-brand">EXIMER</p>
              <p className="text-[0.6rem] tracking-[0.18em] uppercase text-muted-foreground leading-tight mt-0.5">My Import & Export Manager</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground" data-testid="link-features">Features</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground" data-testid="link-about">About</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground" data-testid="link-contact">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
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
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 backdrop-blur px-3 py-1 text-xs text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Built for Ethiopian trade, fluent in international terms
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]" data-testid="text-hero-title">
              My Export / Import <span className="text-primary">Manager App</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed" data-testid="text-hero-subtitle">
              A complete operating system for Ethiopian importers and exporters — Letters of Credit, customs duties, shipment tracking, inventory and FX, all in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" data-testid="button-signin-hero">
                <Link href="/signin">Sign In to Dashboard <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" data-testid="button-learn-more">
                <a href="#features">Learn More</a>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> NBE-aligned workflows</div>
              <div className="flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5 text-primary" /> UCP 600 & Incoterms ready</div>
              <div className="flex items-center gap-1.5"><BrainCircuit className="h-3.5 w-3.5 text-primary" /> AI-assisted insights</div>
            </div>
          </div>

          {/* Hero illustration card */}
          <div className="relative">
            <Card className="shadow-xl">
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
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">What's Inside</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-2">Everything trade operations need, under one roof.</h2>
            <p className="mt-3 text-muted-foreground">From the moment a Proforma Invoice arrives to the day goods leave the warehouse — EXIMER handles the paperwork, the math, and the follow-ups.</p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(f => (
              <Card key={f.title} className="hover-elevate">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-base">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About EXIMER */}
      <section id="about" className="py-20 sm:py-24 border-b bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold">About EXIMER</p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-2" data-testid="text-about-title">
              Software built for the way Ethiopian businesses actually trade.
            </h2>
            <div className="mt-5 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                EXIMER is a software company founded by <span className="text-foreground font-semibold">Abdulkerim Mohammed</span>, engaged in
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
          </div>

          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display text-xl font-semibold">
                  AM
                </div>
                <div>
                  <p className="font-display font-semibold text-lg">Abdulkerim Mohammed</p>
                  <p className="text-xs text-muted-foreground tracking-[0.14em] uppercase">Founder, EXIMER</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "Ethiopian businesses deserve software that speaks their language — both Amharic accounting habits and global
                trade standards. EXIMER is our commitment to that bridge."
              </p>
              <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Company</p>
                    <p className="text-muted-foreground">EXIMER Software</p>
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
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="py-20 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            Ready to run your trade operations with confidence?
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Sign in to your EXIMER dashboard and bring every LC, shipment and customs filing into one workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" data-testid="button-signin-cta">
              <Link href="/signin">Sign In <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" data-testid="button-contact">
              <a href="mailto:hello@eximer.et"><Mail className="h-4 w-4 mr-1" /> Contact Us</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} EXIMER Software — Founded by Abdulkerim Mohammed. All rights reserved.</p>
          <p>Addis Ababa, Ethiopia · hello@eximer.et</p>
        </div>
      </footer>
    </div>
  );
}
