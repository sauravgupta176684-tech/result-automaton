import { useSyncExternalStore } from "react";

const KEY = "exam-auth-v1";
const PIN_KEY = "exam-teacher-pin-v1";

type Session = { email: string; isTeacher: boolean } | null;

// Default PIN. Aap ise apne PIN se badal sakte ho:
// Auth page par "Change teacher PIN" link se, ya yahan directly.
// Jis bhi user ke paas PIN hoga sirf wahi edit kar sakta hai.
// Bina PIN ke login karne wala automatically VIEWER (read-only) hota hai.
export const DEFAULT_TEACHER_PIN = "1234";

export function getTeacherPin(): string {
  if (typeof window === "undefined") return DEFAULT_TEACHER_PIN;
  return localStorage.getItem(PIN_KEY) || DEFAULT_TEACHER_PIN;
}

export function setTeacherPin(pin: string) {
  if (typeof window === "undefined") return;
  if (pin.trim()) localStorage.setItem(PIN_KEY, pin.trim());
}

let session: Session = load();
const listeners = new Set<() => void>();

function load(): Session {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // backward compat: agar purana session bina isTeacher ke hai to viewer maan lo
    if (typeof parsed?.isTeacher !== "boolean") {
      return { email: parsed.email, isTeacher: false };
    }
    return parsed;
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
  signIn(email: string, pin?: string) {
    const isTeacher = !!pin && pin.trim() === getTeacherPin();
    session = { email, isTeacher };
    persist();
    return isTeacher;
  },
  signOut() { session = null; persist(); },
};

export function useSession() {
  return useSyncExternalStore(auth.subscribe, () => auth.get(), () => auth.get());
}

export function useIsTeacher(): boolean {
  const s = useSession();
  return !!s?.isTeacher;
}
