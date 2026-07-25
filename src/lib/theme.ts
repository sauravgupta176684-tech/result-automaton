import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
const KEY = "exam-theme";

let theme: Theme = "light";
const listeners = new Set<() => void>();

function apply(t: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", t === "dark");
}

if (typeof window !== "undefined") {
  const stored = localStorage.getItem(KEY) as Theme | null;
  theme = stored === "dark" || stored === "light" ? stored : "light";
  apply(theme);
}

export const themeStore = {
  get: () => theme,
  getServer: (): Theme => "light",
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  set(t: Theme) {
    theme = t;
    if (typeof window !== "undefined") localStorage.setItem(KEY, t);
    apply(t);
    listeners.forEach((l) => l());
  },
  toggle() {
    themeStore.set(theme === "dark" ? "light" : "dark");
  },
};

export function useTheme(): Theme {
  return useSyncExternalStore(themeStore.subscribe, themeStore.get, themeStore.getServer);
}
