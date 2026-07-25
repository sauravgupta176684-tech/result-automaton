import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, NotebookPen, FileSpreadsheet, Trophy, User, Bell,
  ShieldCheck, LifeBuoy, Settings, Menu, LogOut, Moon, Sun,
} from "lucide-react";
import crest from "@/assets/university-crest.png";
import { auth, useAuth, useIsTeacher } from "@/lib/auth";
import { useUnreadCount } from "@/lib/notifications";
import { themeStore, useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/midsem", label: "Mid Sem", icon: NotebookPen },
  { to: "/put", label: "PUT", icon: FileSpreadsheet },
  { to: "/results", label: "Results", icon: Trophy },
  { to: "/profile", label: "Student Profile", icon: User },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/admin", label: "Admin Panel", icon: ShieldCheck },
  { to: "/help", label: "Help & Support", icon: LifeBuoy },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = useIsTeacher();
  const unread = useUnreadCount();
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const signOut = () => { void auth.signOut(); navigate({ to: "/auth" }); };

  return (
    <header className="sticky top-0 z-40">
      {/* Utility bar */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-1.5 text-[11px] sm:text-xs">
          <span className="truncate font-medium">Office of the Controller of Examinations</span>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className="hidden px-1.5 py-0 text-[10px] sm:inline-flex">
              {isTeacher ? "Teacher" : "Read-only"}
            </Badge>
            <button
              onClick={() => themeStore.toggle()}
              aria-label="Toggle dark mode"
              className="rounded p-1 transition-colors hover:bg-primary-foreground/15"
            >
              {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </button>
            <button onClick={signOut} className="rounded p-1 transition-colors hover:bg-primary-foreground/15" aria-label="Sign out">
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Identity bar */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <img src={crest} alt="University crest" width={48} height={48} className="size-10 shrink-0 sm:size-12" />
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-sm font-bold text-primary sm:text-lg">
                Smart Technological University
              </div>
              <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">
                Student Examination Portal
              </div>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link to="/notifications" className="relative hidden rounded-md p-2 hover:bg-muted sm:block" aria-label="Notifications">
              <Bell className="size-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <div className="hidden text-right lg:block">
              <div className="max-w-[180px] truncate text-xs font-medium">{user?.email}</div>
              <div className="text-[10px] text-muted-foreground">{isTeacher ? "Edit access" : "View only"}</div>
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetHeader className="border-b border-border bg-primary px-4 py-3">
                  <SheetTitle className="text-left text-sm text-primary-foreground">Main Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col p-2">
                  {NAV.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        pathname === n.to ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      <n.icon className="size-4 shrink-0" />
                      <span className="truncate">{n.label}</span>
                      {n.to === "/notifications" && unread > 0 && (
                        <Badge className="ml-auto h-5 px-1.5 text-[10px]">{unread}</Badge>
                      )}
                    </Link>
                  ))}
                </nav>
                <div className="border-t border-border p-3">
                  <div className="truncate px-1 pb-2 text-xs text-muted-foreground">{user?.email}</div>
                  <Button variant="outline" size="sm" className="w-full gap-2" onClick={signOut}>
                    <LogOut className="size-4" /> Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Desktop navigation */}
      <nav className="hidden border-b border-primary/20 bg-primary/95 lg:block">
        <div className="mx-auto flex max-w-[1400px] items-stretch gap-0.5 px-3">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-primary-foreground/85 transition-colors hover:bg-primary-foreground/15 hover:text-primary-foreground",
                pathname === n.to && "bg-card text-primary hover:bg-card hover:text-primary",
              )}
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)] gap-3 sm:flex sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate font-display text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
