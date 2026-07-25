import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { auth, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Smart Exam Result System" },
      { name: "description", content: "Secure teacher sign-in for the Smart Exam Result Management System. Viewers get read-only access." },
      { property: "og:title", content: "Sign in — Smart Exam Result System" },
      { property: "og:description", content: "Secure teacher sign-in. Only the teacher account can edit marks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setErr("Please enter a valid email address");
      return;
    }
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await auth.resetPassword(v);
        if (error) throw error;
        toast.success("Password reset link bhej diya — email check karo");
        setMode("signin");
        return;
      }
      if (password.length < 6) {
        setErr("Password kam se kam 6 characters ka hona chahiye");
        return;
      }
      if (mode === "signup") {
        const { error } = await auth.signUp(v, password);
        if (error) throw error;
        toast.success("Account ban gaya — ab sign in karo");
        setMode("signin");
        return;
      }
      const { error } = await auth.signInWithPassword(v, password);
      if (error) throw error;
      toast.success("Signed in");
      navigate({ to: "/dashboard" });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
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
        </div>
        <div className="relative text-sm text-primary-foreground/60">
          Mid Sem · PUT · Internal · End Semester
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2">
            <div className="size-9 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="size-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">Smart Exam</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-3xl font-bold">
              {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create account" : "Reset password"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {mode === "forgot"
                ? "Apna email daalo, reset link bhej denge."
                : "Teacher account hi marks edit kar sakta hai. Baaki sab read-only viewer honge."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <Input
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                className="h-11"
                autoComplete="email"
                autoFocus
              />
            </div>
            {mode !== "forgot" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Password</label>
                  {mode === "signin" && (
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => { setMode("forgot"); setErr(""); }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErr(""); }}
                  className="h-11"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
            )}
            {err && <p className="text-xs text-destructive">{err}</p>}
            <Button type="submit" className="w-full h-11 gap-2" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
              {!busy && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <div className="text-sm text-muted-foreground text-center">
            {mode === "signin" ? (
              <>New here?{" "}
                <button className="text-primary hover:underline" onClick={() => { setMode("signup"); setErr(""); }}>Create an account</button>
              </>
            ) : (
              <button className="text-primary hover:underline" onClick={() => { setMode("signin"); setErr(""); }}>Back to sign in</button>
            )}
          </div>

          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> How access works
            </div>
            <ul className="text-xs space-y-1 text-foreground/80">
              <li>• <b>Teacher</b> — pehla account jo sign up karega, wahi teacher banega. Sirf usko edit access milega.</li>
              <li>• <b>Viewer</b> — baaki sabhi accounts/devices sirf dashboard, results aur exports dekh sakte hain.</li>
              <li>• Role server par store hota hai — kisi device/browser se badla nahi ja sakta.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
