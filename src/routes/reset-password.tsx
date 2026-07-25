import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — Smart Exam Result System" },
      { name: "description", content: "Set a new password for your Smart Exam Result Management System account." },
      { property: "og:title", content: "Reset password — Smart Exam Result System" },
      { property: "og:description", content: "Set a new password for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (password.length < 6) { setErr("Password kam se kam 6 characters ka hona chahiye"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    toast.success("Password update ho gaya");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-background p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="size-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold">Smart Exam</span>
        </div>
        <h1 className="font-display text-2xl font-bold">Set a new password</h1>
        <form onSubmit={submit} className="space-y-4">
          <Input type="password" placeholder="New password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} className="h-11" autoComplete="new-password" />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <Button type="submit" className="w-full h-11 gap-2" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
