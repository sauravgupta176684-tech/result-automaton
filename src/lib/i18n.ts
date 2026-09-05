import { useSyncExternalStore } from "react";

export type Lang = "en" | "hi";
const KEY = "exam-lang";

const dict = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.marks": "Marks Entry",
    "nav.results": "Results & Toppers",
    "nav.audit": "Audit Log",
    "app.title": "Smart Exam",
    "app.subtitle": "Result System",
    "lang.label": "Language",
    "lang.en": "English",
    "lang.hi": "हिन्दी",
  },
  hi: {
    "nav.dashboard": "डैशबोर्ड",
    "nav.marks": "अंक प्रविष्टि",
    "nav.results": "परिणाम व टॉपर",
    "nav.audit": "ऑडिट लॉग",
    "app.title": "स्मार्ट परीक्षा",
    "app.subtitle": "परिणाम प्रणाली",
    "lang.label": "भाषा",
    "lang.en": "English",
    "lang.hi": "हिन्दी",
  },
} as const;

export type TKey = keyof (typeof dict)["en"];

let lang: Lang = "en";
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  const stored = localStorage.getItem(KEY) as Lang | null;
  if (stored === "en" || stored === "hi") lang = stored;
}

export const langStore = {
  get: () => lang,
  getServer: (): Lang => "en",
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  set(next: Lang) {
    lang = next;
    if (typeof window !== "undefined") localStorage.setItem(KEY, next);
    listeners.forEach((l) => l());
  },
  toggle() {
    langStore.set(lang === "en" ? "hi" : "en");
  },
};

export function useLang(): Lang {
  return useSyncExternalStore(langStore.subscribe, langStore.get, langStore.getServer);
}

export function useT() {
  const l = useLang();
  return (key: TKey) => dict[l][key] ?? dict.en[key];
}
