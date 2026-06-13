import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft, ArrowRight, Mail, User,
  Lock, CheckCircle2, Loader2, Send,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import eximmanLogo from "@assets/eximman_logo_trim.png";

const DEMO_EMAIL = "merisamarketingsolutions@gmail.com";

const CATEGORY_OPTIONS = [
  { value: "export", label: "Export" },
  { value: "import", label: "Import" },
  { value: "export_import", label: "Export and Import" },
  { value: "other", label: "Other (please describe)" },
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
      <div className="text-center py-6" data-testid="text-demo-success">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Request received</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Thank you. Our team has received your demo request and will reach back to you shortly.
        </p>
        <Button asChild className="mt-6 w-full" data-testid="button-go-signin">
          <Link href="/signin">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight" data-testid="text-demo-title">Request a demo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          EXIMMAN accounts are set up by our team. Fill in your details below and
          we'll reach back to arrange your demo in a short period of time.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="demo-name" className="text-xs">Full name</Label>
          <Input
            id="demo-name"
            placeholder="Your full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            data-testid="input-fullname"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="demo-company" className="text-xs">Company name</Label>
          <Input
            id="demo-company"
            placeholder="Your company name"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            data-testid="input-company-name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="demo-category" className="text-xs">Company category</Label>
          <Select value={companyCategory} onValueChange={setCompanyCategory}>
            <SelectTrigger id="demo-category" data-testid="select-company-category">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} data-testid={`option-category-${opt.value}`}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {companyCategory === "other" && (
          <div className="space-y-1.5">
            <Label htmlFor="demo-category-other" className="text-xs">Please describe</Label>
            <Textarea
              id="demo-category-other"
              placeholder="Describe your company category"
              value={categoryOther}
              onChange={e => setCategoryOther(e.target.value)}
              className="resize-none"
              rows={2}
              data-testid="input-category-other"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="demo-position" className="text-xs">Your position in the company</Label>
          <Input
            id="demo-position"
            placeholder="e.g. General Manager"
            value={position}
            onChange={e => setPosition(e.target.value)}
            data-testid="input-position"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="demo-phone" className="text-xs">Phone number</Label>
          <Input
            id="demo-phone"
            type="tel"
            placeholder="e.g. +251 ..."
            value={phone}
            onChange={e => setPhone(e.target.value)}
            data-testid="input-phone"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="demo-email" className="text-xs">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="demo-email"
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

        {error && (
          <p className="text-xs text-destructive" data-testid="text-demo-error">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={submitting} data-testid="button-request-demo">
          {submitting ? "Sending..." : <><Send className="h-4 w-4 mr-1.5" /> Send us your request</>}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center mt-4" data-testid="text-demo-email">
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
