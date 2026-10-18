import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, GraduationCap, BookOpen, TrendingUp, Award, Activity, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useExamStore, computeResults, EXAM_LABELS, SUBJECTS, type ExamType } from "@/lib/exam-store";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [
    { title: "Dashboard — Smart Exam System" },
    { name: "description", content: "Review Mid Sem and PUT performance, class averages, and student leaders." },
    { property: "og:title", content: "Dashboard — Smart Exam System" },
    { property: "og:description", content: "Review Mid Sem and PUT performance, class averages, and student leaders." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Dashboard,
});

const EXAMS: ExamType[] = ["midsem", "put"];

function Dashboard() {
  const state = useExamStore((s) => s);
  const [exam, setExam] = useState<ExamType>("midsem");
  const results = useMemo(() => computeResults(state, exam), [state, exam]);
  const cfg = state.config[exam];

  const totalStudents = state.students.length;
  const sections = new Set(state.students.map((s) => s.section)).size;
  const passed = results.filter((r) => r.pass).length;
  const failed = totalStudents - passed;
  const passPct = totalStudents ? (passed / totalStudents) * 100 : 0;
  const avgPct = totalStudents ? results.reduce((a, r) => a + r.pct, 0) / totalStudents : 0;
  const topPerformers = [...results].sort((a, b) => b.total - a.total).slice(0, 5);

  const subjectAvg = SUBJECTS.map((sub) => {
    const vals = results.map((r) => r.marks[sub]).filter((v): v is number => typeof v === "number");
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { subject: sub, avg: +avg.toFixed(1), max: cfg.maxMarks };
  });

  const sectionData = Array.from(new Set(state.students.map((s) => s.section))).map((sec) => {
    const rows = results.filter((r) => r.student.section === sec);
    const avg = rows.length ? rows.reduce((a, r) => a + r.pct, 0) / rows.length : 0;
    return { section: sec, avg: +avg.toFixed(1) };
  });

  const passData = [
    { name: "Pass", value: passed, color: "var(--color-success)" },
    { name: "Fail", value: failed, color: "var(--color-destructive)" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live overview · all results auto-calculated from entered marks
          </p>
        </div>
        <Tabs value={exam} onValueChange={(v) => setExam(v as ExamType)}>
          <TabsList className="bg-card border">
            {EXAMS.map((e) => (
              <TabsTrigger key={e} value={e} className="text-xs">{EXAM_LABELS[e]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Users} label="Total Students" value={totalStudents} tone="primary" />
        <KpiCard icon={GraduationCap} label="Sections" value={sections} sub={`Across ${state.students[0]?.course ?? "—"}`} tone="accent" />
        <KpiCard icon={BookOpen} label="Subjects" value={SUBJECTS.length} sub={`Max ${cfg.maxMarks} marks`} tone="accent" />
        <KpiCard icon={TrendingUp} label="Average %" value={`${avgPct.toFixed(1)}%`} tone="primary" />
        <KpiCard icon={Activity} label="Pass %" value={`${passPct.toFixed(1)}%`} sub={`${passed} students`} tone="success" />
        <KpiCard icon={Activity} label="Fail %" value={`${(100 - passPct).toFixed(1)}%`} sub={`${failed} students`} tone="destructive" />
        <KpiCard icon={Award} label="Highest" value={results.length ? Math.max(...results.map((r) => r.total)) : 0} sub={`/ ${cfg.maxMarks * SUBJECTS.length}`} tone="warning" />
        <KpiCard icon={Award} label="Lowest" value={results.length ? Math.min(...results.map((r) => r.total)) : 0} sub={`/ ${cfg.maxMarks * SUBJECTS.length}`} tone="muted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Subject Performance — Average Marks</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={subjectAvg}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="subject" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[0, cfg.maxMarks]} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="avg" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pass vs Fail</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={passData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {passData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Section Comparison — Average %</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="section" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Bar dataKey="avg" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Trophy className="size-4 text-warning" /> Top 5 Performers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topPerformers.map((r, i) => (
              <div key={r.student.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60">
                <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-warning text-warning-foreground" : i === 1 ? "bg-muted-foreground/20" : "bg-muted"}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate text-sm">{r.student.name}</div>
                  <div className="text-xs text-muted-foreground">{r.student.roll} · Section {r.student.section}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums">{r.total}<span className="text-muted-foreground font-normal">/{r.maxTotal}</span></div>
                  <Badge variant="secondary" className="text-[10px] mt-0.5">{r.grade} · {r.pct.toFixed(1)}%</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone: "primary" | "success" | "destructive" | "warning" | "accent" | "muted";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/20 text-warning-foreground",
    accent: "bg-accent text-accent-foreground",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-3">
        <div className={`size-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</div>
          <div className="text-2xl font-bold tabular-nums mt-0.5">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
