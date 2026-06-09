import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import eximmanLogo from "@assets/eximman_logo_trim.png";

export default function SignUp() {
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
              {done ? (
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
              ) : (
                <>
                  <div className="mb-6">
                    <h1 className="font-display text-2xl font-semibold tracking-tight">Create your account</h1>
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
              )}
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
