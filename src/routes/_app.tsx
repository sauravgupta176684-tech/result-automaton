import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Pencil, FileBarChart, GraduationCap, ClipboardList, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, useLang, langStore, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const NAV = [
  { to: "/dashboard", key: "nav.dashboard" as TKey, icon: LayoutDashboard },
  { to: "/marks", key: "nav.marks" as TKey, icon: Pencil },
  { to: "/results", key: "nav.results" as TKey, icon: FileBarChart },
  { to: "/audit", key: "nav.audit" as TKey, icon: ClipboardList },
] as const;

function LangSwitch({ className }: { className?: string }) {
  const lang = useLang();
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-md border border-border p-0.5", className)}>
      <Languages className="mx-1 size-3.5 text-muted-foreground" />
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => langStore.set(l)}
          className={cn(
            "rounded px-2 py-1 text-[11px] font-medium transition-colors",
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {l === "en" ? "English" : "हिन्दी"}
        </button>
      ))}
    </div>
  );
}

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="min-h-screen bg-muted/40" />;

  return (
    <div className="min-h-screen flex bg-muted/40">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-sidebar-border">
          <div className="size-9 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="size-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-sm">{t("app.title")}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("app.subtitle")}</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <n.icon className="size-4" />
                {t(n.key)}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-1 text-[10px] uppercase tracking-wider text-muted-foreground">{t("lang.label")}</div>
          <LangSwitch className="w-full justify-start" />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
        <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
          <GraduationCap className="size-4 text-primary-foreground" />
        </div>
        <span className="font-display font-bold text-sm">{t("app.title")}</span>
        <LangSwitch className="ml-auto" />
      </div>

      <main className="flex-1 min-w-0 md:pt-0 pt-14">
        {/* Mobile bottom nav */}
        <div
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar border-t border-sidebar-border grid"
          style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0,1fr))` }}
        >
          {NAV.map((n) => {
            const active = pathname === n.to;
            return (
              <Link key={n.to} to={n.to} className={cn(
                "flex flex-col items-center py-2 text-[10px] gap-1",
                active ? "text-primary" : "text-muted-foreground",
              )}>
                <n.icon className="size-4" />
                {t(n.key).split(" ")[0]}
              </Link>
            );
          })}
        </div>
        <div className="md:p-8 p-4 md:pb-8 pb-20 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
