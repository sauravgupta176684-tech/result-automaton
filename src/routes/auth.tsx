import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, ArrowRight } from "lucide-react";
import { auth, useSession, TEACHER_EMAILS } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Smart Exam System" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");

  if (session) {
    navigate({ to: "/dashboard" });
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setErr("Please enter a valid email address");
      return;
    }
    auth.signIn(v);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 70%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px, 60px 60px",
        }} />
        <div className="relative flex items-center gap-3">
          <div className="size-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <GraduationCap className="size-6" />
          </div>
          <span className="font-display font-bold text-lg">Smart Exam System</span>
        </div>
        <div className="relative space-y-6">
          <h1 className="font-display text-5xl font-bold leading-tight">
            Goodbye Excel.<br />Hello instant results.
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            Enter marks once. Totals, percentages, grades, ranks and toppers update in real time.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md pt-4">
            {[
              { v: "100+", l: "Students" },
              { v: "4", l: "Exam types" },
              { v: "0", l: "Manual calc" },
            ].map((s) => (
              <div key={s.l} className="bg-white/10 backdrop-blur rounded-lg p-4">
                <div className="text-2xl font-bold">{s.v}</div>
                <div className="text-xs text-primary-foreground/70 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-sm text-primary-foreground/60">
          Mid Sem · PUT · Internal · End Semester
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2">
            <div className="size-9 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="size-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">Smart Exam</span>
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-3xl font-bold">Welcome back</h2>
            <p className="text-muted-foreground text-sm">
              Sign in with your email to access the dashboard.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <Input
                type="email"
                placeholder="teacher@college.edu"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                className="h-11"
                autoFocus
              />
              {err && <p className="text-xs text-destructive">{err}</p>}
            </div>
            <Button type="submit" className="w-full h-11 gap-2">
              Continue <ArrowRight className="size-4" />
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Demo mode · No password required
            </p>
            <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Teacher emails (edit access)
              </div>
              <ul className="text-xs font-mono space-y-0.5">
                {TEACHER_EMAILS.map((e) => (
                  <li key={e} className="text-foreground/80">• {e}</li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground pt-1">
                In emails se login karne par marks edit kar sakte ho. Kisi bhi
                doosre email se login karoge to <span className="font-semibold">viewer</span> (read-only)
                ban jaoge.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
