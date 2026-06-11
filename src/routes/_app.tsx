import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Pencil, FileBarChart, GraduationCap, LogOut, ClipboardList } from "lucide-react";
import { auth, useSession, isTeacherEmail } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, teacherOnly: false },
  { to: "/marks", label: "Marks Entry", icon: Pencil, teacherOnly: true },
  { to: "/results", label: "Results & Toppers", icon: FileBarChart, teacherOnly: false },
  { to: "/audit", label: "Audit Log", icon: ClipboardList, teacherOnly: true },
] as const;

function AppLayout() {
  const session = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isTeacher = isTeacherEmail(session?.email);
  const visibleNav = NAV.filter((n) => !n.teacherOnly || isTeacher);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (mounted && !session) navigate({ to: "/auth" });
  }, [mounted, session, navigate]);

  if (!mounted) return <div className="min-h-screen bg-muted/40" />;
  if (!session) return null;

  return (
    <div className="min-h-screen flex bg-muted/40">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-sidebar-border">
          <div className="size-9 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="size-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-sm">Smart Exam</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Result System</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {visibleNav.map((n) => {
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
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 mb-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              Signed in as
              <Badge variant={isTeacher ? "default" : "secondary"} className="text-[9px] px-1.5 py-0">
                {isTeacher ? "Teacher" : "Viewer"}
              </Badge>
            </div>
            <div className="text-sm font-medium truncate">{session.email}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => { auth.signOut(); navigate({ to: "/auth" }); }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
        <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
          <GraduationCap className="size-4 text-primary-foreground" />
        </div>
        <span className="font-display font-bold text-sm">Smart Exam</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { auth.signOut(); navigate({ to: "/auth" }); }}>
          <LogOut className="size-4" />
        </Button>
      </div>

      <main className="flex-1 min-w-0 md:pt-0 pt-14">
        {/* Mobile bottom nav */}
        <div
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar border-t border-sidebar-border grid"
          style={{ gridTemplateColumns: `repeat(${visibleNav.length}, minmax(0,1fr))` }}
        >
          {visibleNav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link key={n.to} to={n.to} className={cn(
                "flex flex-col items-center py-2 text-[10px] gap-1",
                active ? "text-primary" : "text-muted-foreground",
              )}>
                <n.icon className="size-4" />
                {n.label.split(" ")[0]}
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
