import { useSyncExternalStore } from "react";

const KEY = "exam-auth-v1";
type Session = { email: string } | null;

let session: Session = load();
const listeners = new Set<() => void>();

function load(): Session {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persist() {
  if (typeof window !== "undefined") {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  }
  listeners.forEach((l) => l());
}

export const auth = {
  get: () => session,
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
  signIn(email: string) { session = { email }; persist(); },
  signOut() { session = null; persist(); },
};

export function useSession() {
  return useSyncExternalStore(auth.subscribe, () => auth.get(), () => auth.get());
}
