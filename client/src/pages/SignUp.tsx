import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft, ArrowRight, Mail, Building2, Phone, User, Briefcase,
  Lock, CheckCircle2, Loader2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
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

function PageShell({ children }: { children: React.ReactNode }) {
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

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-8" data-testid="link-logo-main">
          <img
            src={eximmanLogo}
            alt="EXIMMAN — My Export · Import Manager App"
            className="h-32 sm:h-40 w-auto object-contain"
            data-testid="img-brand-logo-large"
          />
        </Link>
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4" data-testid="link-back">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
          <Card>
            <CardContent className="p-6 sm:p-8">
              {children}
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

function RequestDemo() {
  return (
    <>
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
        <a href={mailtoHref} target="_blank" rel="noopener noreferrer">
          <Mail className="h-4 w-4 mr-1.5" /> Email us to request a demo
          <ArrowRight className="h-4 w-4 ml-1" />
        </a>
      </Button>
      <p className="text-xs text-muted-foreground text-center mt-3" data-testid="text-demo-email">
        Or write to{" "}
        <a href={`mailto:${DEMO_EMAIL}`} target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline">{DEMO_EMAIL}</a>
      </p>

      <p className="text-xs text-muted-foreground text-center mt-5">
        Already have an account?{" "}
        <Link href="/signin" className="text-foreground hover:underline" data-testid="link-signin">Sign in</Link>
      </p>
    </>
  );
}

function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (fullName.trim().length < 2) return setError("Please enter your full name.");
    if (!email.trim()) return setError("Please enter your email.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/auth/signup", {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message?.replace(/^\d+:\s*/, "") || "Could not create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-6" data-testid="text-signup-success">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Request submitted</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Your account has been created and is pending administrator approval. You'll be able to
          sign in once an administrator activates your access.
        </p>
        <Button asChild className="mt-6 w-full" data-testid="button-go-signin">
          <Link href="/signin">Go to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight" data-testid="text-signup-title">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-1">Register to request access to your EXIMMAN workspace.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="signup-name" className="text-xs">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="signup-name"
              className="pl-9"
              placeholder="Your full name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              data-testid="input-fullname"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-email" className="text-xs">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              className="pl-9"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              data-testid="input-email"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="signup-password" className="text-xs">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              className="pl-9"
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              data-testid="input-password"
            />
          </div>
        </div>
        {error && (
          <p className="text-xs text-destructive" data-testid="text-signup-error">{error}</p>
        )}
        <Button type="submit" className="w-full" disabled={submitting} data-testid="button-submit-signup">
          {submitting ? "Creating account..." : <>Create account <ArrowRight className="h-4 w-4 ml-1" /></>}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground text-center mt-5">
        Already have an account?{" "}
        <Link href="/signin" className="text-foreground hover:underline" data-testid="link-signin">Sign in</Link>
      </p>
    </>
  );
}

export default function SignUp() {
  const { data, isLoading } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/auth/signup-status"],
  });

  return (
    <PageShell>
      {isLoading ? (
        <div className="py-10 flex items-center justify-center text-muted-foreground" data-testid="loader-signup-status">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : data?.enabled ? (
        <SignUpForm />
      ) : (
        <RequestDemo />
      )}
    </PageShell>
  );
}
