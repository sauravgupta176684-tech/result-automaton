import { useSyncExternalStore } from "react";
import { examStore, EXAM_LABELS, type AuditEntry } from "@/lib/exam-store";

export interface AppNotification {
  id: string;
  ts: number;
  title: string;
  body: string;
  kind: "result" | "system";
}

const READ_KEY = "exam-notifications-read";

let readIds: string[] = [];
if (typeof window !== "undefined") {
  try { readIds = JSON.parse(localStorage.getItem(READ_KEY) ?? "[]"); } catch { readIds = []; }
}

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

function idFor(a: AuditEntry) {
  return `${a.ts}-${a.studentRoll}-${a.subject}`;
}

function build(): AppNotification[] {
  const audit = examStore.get().audit.slice(0, 40);
  const items: AppNotification[] = audit.map((a) => ({
    id: idFor(a),
    ts: a.ts,
    kind: "result" as const,
    title: `${EXAM_LABELS[a.exam]} marks updated`,
    body: `${a.studentRoll} · ${a.subject}: ${a.oldValue ?? "—"} → ${a.newValue ?? "cleared"} (by ${a.user})`,
  }));
  if (!items.length) {
    items.push({
      id: "welcome",
      ts: Date.UTC(2026, 6, 20, 9, 30),
      kind: "system",
      title: "Examination portal is live",
      body: "Mid Sem and PUT modules are open. Results recalculate the moment marks change.",
    });
  }
  return items;
}

let cache: AppNotification[] = build();
let cacheKey = "";

function snapshot(): AppNotification[] {
  const audit = examStore.get().audit;
  const key = `${audit.length}:${audit[0]?.ts ?? 0}`;
  if (key !== cacheKey) {
    cacheKey = key;
    cache = build();
  }
  return cache;
}

const serverSnapshot = build();

export const notifications = {
  subscribe(l: () => void) {
    const un = examStore.subscribe(l);
    listeners.add(l);
    return () => { un(); listeners.delete(l); };
  },
  isRead: (id: string) => readIds.includes(id),
  markAllRead() {
    readIds = Array.from(new Set([...readIds, ...snapshot().map((n) => n.id)])).slice(-500);
    if (typeof window !== "undefined") localStorage.setItem(READ_KEY, JSON.stringify(readIds));
    emit();
  },
  readIds: () => readIds,
};

export function useNotifications() {
  return useSyncExternalStore(notifications.subscribe, snapshot, () => serverSnapshot);
}

export function useUnreadCount() {
  const items = useNotifications();
  return items.filter((n) => !readIds.includes(n.id)).length;
}
