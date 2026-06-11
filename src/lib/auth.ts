import { useSyncExternalStore } from "react";

const KEY = "exam-auth-v1";
type Session = { email: string } | null;

// Sirf in emails ke users hi marks edit / config change kar sakte hain.
// Baki sab "viewer" honge — read-only access (Dashboard + Results dekh sakte hain,
// PDF / Excel / PPT export kar sakte hain par koi value change nahi kar sakte).
export const TEACHER_EMAILS: string[] = [
  "teacher@college.edu",
  "admin@college.edu",
  "faculty@college.edu",
];

export function isTeacherEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return TEACHER_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}

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

export function useIsTeacher(): boolean {
  const s = useSession();
  return isTeacherEmail(s?.email);
}
