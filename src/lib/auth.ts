import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "teacher" | "viewer";

type AuthState = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
};

let state: AuthState = { session: null, user: null, role: null, loading: true };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function set(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  emit();
}

async function resolveRole(session: Session | null) {
  if (!session) {
    set({ role: null, loading: false });
    return;
  }
  // Server-side security definer fn: assigns teacher to the very first
  // account, viewer to everyone else. Cannot be spoofed from the client.
  const { data, error } = await supabase.rpc("ensure_my_role");
  set({ role: error ? "viewer" : ((data as AppRole) ?? "viewer"), loading: false });
}

let initialized = false;
function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    set({ session, user: session?.user ?? null, loading: true });
    void resolveRole(session);
  });

  void supabase.auth.getSession().then(({ data }) => {
    set({ session: data.session, user: data.session?.user ?? null, loading: true });
    void resolveRole(data.session);
  });
}

export const auth = {
  get: () => state,
  subscribe(l: () => void) {
    init();
    listeners.add(l);
    return () => listeners.delete(l);
  },
  signInWithPassword: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),
  signUp: (email: string, password: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    }),
  resetPassword: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    }),
  async signOut() {
    await supabase.auth.signOut();
    set({ session: null, user: null, role: null, loading: false });
  },
};

export function useAuth(): AuthState {
  const [snap, setSnap] = useState<AuthState>(state);
  useEffect(() => {
    const unsub = auth.subscribe(() => setSnap(auth.get()));
    setSnap(auth.get());
    return () => { unsub(); };
  }, []);
  return snap;
}

/** Returns the signed-in user (has `.email`), or null. */
export function useSession() {
  return useAuth().user;
}

/** Only the teacher account can edit. Everyone else is strictly read-only. */
export function useIsTeacher(): boolean {
  const { role } = useAuth();
  return role === "teacher";
}
