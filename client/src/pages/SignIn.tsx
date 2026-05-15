import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, ArrowRight, Lock, Mail } from "lucide-react";

export default function SignIn() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    try {
      localStorage.setItem("eximman_session", JSON.stringify({ email, signedInAt: Date.now() }));
    } catch {}
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <Link href="/" className="flex items-center gap-2.5" data-testid="link-home">
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
            <div>
              <p className="font-display font-semibold tracking-tight text-[19px] leading-none">EXIMMAN</p>
              <p className="text-[0.6rem] tracking-[0.18em] uppercase text-muted-foreground leading-tight mt-0.5">My Import & Export Manager</p>
            </div>
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
                      onChange={e => setEmail(e.target.value)}
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
                      type="password"
                      autoComplete="current-password"
                      className="pl-9"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      data-testid="input-password"
                    />
                  </div>
                </div>
                {error && (
                  <p className="text-xs text-destructive" data-testid="text-signin-error">{error}</p>
                )}
                <Button type="submit" className="w-full" data-testid="button-submit-signin">
                  Sign In <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </form>
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
