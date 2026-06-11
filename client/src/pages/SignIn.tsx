import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import eximmanLogo from "@assets/eximman_logo_trim.png";

const REMEMBER_EMAIL_KEY = "eximman_remember_email";

export default function SignIn() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(REMEMBER_EMAIL_KEY) || "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    try {
      localStorage.setItem(REMEMBER_EMAIL_KEY, value);
    } catch {
      /* ignore storage errors */
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const em = email.trim();
    if (!em || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { email: em, password });
      const user = await res.json();
      queryClient.setQueryData(["/api/auth/me"], user);
      await queryClient.invalidateQueries();
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message?.replace(/^\d+:\s*/, "") || "Invalid email or password. Please try again.");
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
              <div className="mb-6">
                <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h1>
                <p className="text-sm text-muted-foreground mt-1">Sign in to access your EXIMMAN workspace.</p>
              </div>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-xs">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      className="pl-9"
                      placeholder="you@company.com"
                      value={email}
                      onChange={e => handleEmailChange(e.target.value)}
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password" className="text-xs">Password</Label>
                    <a className="text-[0.7rem] text-muted-foreground hover:text-foreground" href="#" data-testid="link-forgot">Forgot?</a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="pl-9 pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      data-testid="input-password"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <button
                        type="button"
                        onClick={() => setShowPassword(s => !s)}
                        className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover-elevate active-elevate-2"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                {error && (
                  <p className="text-xs text-destructive" data-testid="text-signin-error">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={submitting} data-testid="button-submit-signin">
                  {submitting ? "Signing in..." : <>Sign In <ArrowRight className="h-4 w-4 ml-1" /></>}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-5">
                Don't have an account?{" "}
                <Link href="/signup" className="text-foreground hover:underline" data-testid="link-signup">Request a demo</Link>
              </p>
              <p className="text-[0.7rem] text-muted-foreground text-center mt-5">
                By signing in you agree to EXIMMAN's terms of service and privacy policy.
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
