import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, ArrowRight, Mail, Building2, Phone, User, Briefcase } from "lucide-react";
import eximmanLogo from "@assets/eximman_logo_trim.png";

const DEMO_EMAIL = "merisamarketingsolutions@gmail.com";

const DEMO_SUBJECT = "Demo request — EXIMMAN";
const DEMO_BODY = [
  "Hello EXIMMAN team,",
  "",
  "I would like to request a demo of EXIMMAN. My details are below:",
  "",
  "Full name: ",
  "Position in the company: ",
  "Company name: ",
  "Phone number: ",
  "",
  "Thank you.",
].join("\n");

const mailtoHref = `mailto:${DEMO_EMAIL}?subject=${encodeURIComponent(DEMO_SUBJECT)}&body=${encodeURIComponent(DEMO_BODY)}`;

const DETAILS = [
  { icon: User, label: "Your full name" },
  { icon: Briefcase, label: "Your position in the company" },
  { icon: Building2, label: "Your company name" },
  { icon: Phone, label: "Your phone number" },
];

export default function SignUp() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <Link href="/" className="flex items-center" data-testid="link-home">
            <img
              src={eximmanLogo}
              alt="EXIMMAN — My Export · Import Manager App"
              className="h-16 w-auto object-contain"
              data-testid="img-brand-logo"
            />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4" data-testid="link-back">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <Card>
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6">
                <h1 className="font-display text-2xl font-semibold tracking-tight" data-testid="text-demo-title">Request a demo</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  EXIMMAN accounts are set up by our team. Send us an email and we'll reach
                  back to arrange your demo in a short period of time.
                </p>
              </div>

              <div className="rounded-md border p-4 mb-5">
                <p className="text-xs font-semibold mb-3" data-testid="text-demo-instructions">
                  In your email, please include:
                </p>
                <ul className="space-y-2.5">
                  {DETAILS.map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center gap-2.5 text-sm" data-testid={`item-detail-${label}`}>
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button asChild className="w-full" data-testid="button-request-demo">
                <a href={mailtoHref}>
                  <Mail className="h-4 w-4 mr-1.5" /> Email us to request a demo
                  <ArrowRight className="h-4 w-4 ml-1" />
                </a>
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3" data-testid="text-demo-email">
                Or write to{" "}
                <a href={`mailto:${DEMO_EMAIL}`} className="text-foreground hover:underline">{DEMO_EMAIL}</a>
              </p>

              <p className="text-xs text-muted-foreground text-center mt-5">
                Already have an account?{" "}
                <Link href="/signin" className="text-foreground hover:underline" data-testid="link-signin">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-5">
        <p className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} EXIMMAN Software · Addis Ababa, Ethiopia</p>
      </footer>
    </div>
  );
}
