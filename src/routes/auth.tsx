import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, ArrowRight, KeyRound, Eye } from "lucide-react";
import { auth, useSession, getTeacherPin, setTeacherPin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Smart Exam System" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const session = useSession();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<"teacher" | "viewer">("viewer");
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
    if (mode === "teacher") {
      if (!pin.trim()) { setErr("Teacher PIN required"); return; }
      if (pin.trim() !== getTeacherPin()) {
        setErr("Galat PIN — viewer mode try karo ya sahi PIN daalo");
        return;
      }
      auth.signIn(v, pin);
      toast.success("Teacher mode — full edit access");
    } else {
      auth.signIn(v);
      toast.success("Viewer mode — read-only access");
    }
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
            <h2 className="font-display text-3xl font-bold">Welcome back</h2>
            <p className="text-muted-foreground text-sm">
              Teacher? PIN daal ke login karo. Sirf dekhna hai? Viewer mode chuno.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => { setMode("viewer"); setErr(""); }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition ${mode === "viewer" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              <Eye className="size-4" /> Viewer
            </button>
            <button
              type="button"
              onClick={() => { setMode("teacher"); setErr(""); }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition ${mode === "teacher" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
            >
              <KeyRound className="size-4" /> Teacher
            </button>
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
                autoFocus
              />
            </div>
            {mode === "teacher" && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <KeyRound className="size-3.5" /> Teacher PIN
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="Apna secret PIN"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setErr(""); }}
                  className="h-11 tracking-widest"
                />
                <p className="text-[11px] text-muted-foreground">
                  Default PIN: <span className="font-mono font-semibold">1234</span> — neeche se badal sakte ho.
                </p>
              </div>
            )}
            {err && <p className="text-xs text-destructive">{err}</p>}
            <Button type="submit" className="w-full h-11 gap-2">
              {mode === "teacher" ? "Sign in as Teacher" : "Continue as Viewer"} <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              How sharing works
            </div>
            <ul className="text-xs space-y-1 text-foreground/80">
              <li>• <b>Teacher</b> (aap, PIN ke saath) → marks edit, config change, import, reseed</li>
              <li>• <b>Viewer</b> (jisko app share karo) → sirf dashboard, results, exports dekh sakte hain</li>
              <li>• PIN sirf aapko pata hona chahiye — share mat karna</li>
            </ul>
            <ChangePinDialog />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangePinDialog() {
  const [open, setOpen] = useState(false);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");

  const save = () => {
    if (oldPin !== getTeacherPin()) {
      toast.error("Purana PIN galat hai");
      return;
    }
    if (newPin.trim().length < 4) {
      toast.error("Naya PIN kam se kam 4 digit ka ho");
      return;
    }
    setTeacherPin(newPin);
    toast.success("Teacher PIN updated");
    setOpen(false);
    setOldPin(""); setNewPin("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-xs text-primary hover:underline">
          Change teacher PIN →
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Teacher PIN</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Current PIN</label>
            <Input type="password" value={oldPin} onChange={(e) => setOldPin(e.target.value)} placeholder="Default 1234 if never changed" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">New PIN (min 4 chars)</label>
            <Input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            PIN sirf is device ke browser me save hota hai. Naya browser/phone use karoge to default <b>1234</b> use hoga.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={save}>Save new PIN</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
