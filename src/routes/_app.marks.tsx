import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Save, Download, Upload, AlertCircle, Search, Settings2, RotateCcw, Trash2, UserPlus, Eraser } from "lucide-react";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSession, useIsTeacher } from "@/lib/auth";
import {
  useExamStore, examStore, computeResults, EXAM_LABELS, SUBJECTS, SECTIONS,
  type ExamType, type Subject,
} from "@/lib/exam-store";

export const Route = createFileRoute("/_app/marks")({
  head: () => ({ meta: [
    { title: "Marks Entry — Smart Exam System" },
    { name: "description", content: "Enter and update Mid Sem and PUT marks with live result calculations." },
    { property: "og:title", content: "Marks Entry — Smart Exam System" },
    { property: "og:description", content: "Enter and update Mid Sem and PUT marks with live result calculations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MarksPage,
});

const EXAMS: ExamType[] = ["midsem", "put"];

function MarksPage() {
  const session = useSession();
  const navigate = useNavigate();
  const isTeacher = useIsTeacher();
  useEffect(() => {
    if (session && !isTeacher) {
      toast.error("Sirf teacher (PIN ke saath login) marks edit kar sakte hain");
      navigate({ to: "/results" });
    }
  }, [session, isTeacher, navigate]);
  const state = useExamStore((s) => s);
  const [exam, setExam] = useState<ExamType>("midsem");
  const [section, setSection] = useState<string>("all");
  const [search, setSearch] = useState("");
  const cfg = state.config[exam];

  const results = useMemo(() => computeResults(state, exam), [state, exam]);

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (section !== "all" && r.student.section !== section) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.student.name.toLowerCase().includes(q) && !r.student.roll.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [results, section, search]);

  const handleExport = () => {
    const rows = results.map((r) => {
      const row: Record<string, string | number> = {
        "Roll No": r.student.roll,
        "Enrollment": r.student.enrollment,
        "Name": r.student.name,
        "Section": r.student.section,
      };
      SUBJECTS.forEach((s) => { row[s] = r.marks[s] ?? ""; });
      row["Total"] = r.total;
      row["Max"] = r.maxTotal;
      row["Percentage"] = +r.pct.toFixed(2);
      row["Grade"] = r.grade;
      row["Status"] = r.pass ? "PASS" : "FAIL";
      row["Rank"] = r.rank;
      row["Section Rank"] = r.sectionRank;
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, EXAM_LABELS[exam]);
    XLSX.writeFile(wb, `results_${exam}.xlsx`);
    toast.success("Excel exported");
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
        let count = 0;
        rows.forEach((row) => {
          const roll = String(row["Roll No"] ?? row["roll"] ?? "").trim();
          const student = state.students.find((s) => s.roll === roll);
          if (!student) return;
          SUBJECTS.forEach((sub) => {
            const v = row[sub];
            if (v !== undefined && v !== "" && v !== null) {
              const n = Number(v);
              if (!Number.isNaN(n) && n >= 0 && n <= cfg.maxMarks) {
                examStore.setMark(exam, student.id, sub, n, session?.email ?? "import");
                count++;
              }
            }
          });
        });
        toast.success(`Imported ${count} marks`);
      } catch {
        toast.error("Could not parse Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Marks Entry</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Edit any cell · auto-saves · totals, grades and ranks update live
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConfigDialog exam={exam} />
          <AddStudentDialog />
          <label>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = "";
            }} />
            <Button variant="outline" size="sm" asChild>
              <span className="cursor-pointer"><Upload className="size-4 mr-1.5" /> Import</span>
            </Button>
          </label>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4 mr-1.5" /> Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(`Clear marks for all ${state.students.length} students in Mid Sem and PUT? Student details will remain.`)) {
                examStore.clearAllMarks();
                toast.success("All exam marks cleared; student list kept");
              }
            }}
          >
            <Eraser className="size-4 mr-1.5" /> Clear marks
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={state.students.length === 0}
            onClick={() => {
              if (confirm(`Remove all ${state.students.length} students and their marks from this saved list? This cannot be undone.`)) {
                examStore.deleteAllStudents();
                toast.success("Student list removed");
              }
            }}
          >
            <Trash2 className="size-4 mr-1.5" /> Remove student list
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <Tabs value={exam} onValueChange={(v) => setExam(v as ExamType)}>
            <TabsList>
              {EXAMS.map((e) => (
                <TabsTrigger key={e} value={e} className="text-xs">{EXAM_LABELS[e]}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="h-6 w-px bg-border hidden md:block" />
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="All sections" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sections</SelectItem>
              {SECTIONS.map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name or roll" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <Save className="size-3" /> Auto-save on
          </Badge>
          <Badge variant="outline">Max: {cfg.maxMarks} · Pass: {cfg.passPct}%</Badge>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground sticky top-0">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold w-16">Sr. No.</th>
                <th className="text-left px-3 py-2.5 font-semibold">Name</th>
                <th className="text-left px-3 py-2.5 font-semibold">Sec</th>
                {SUBJECTS.map((s) => (
                  <th key={s} className="text-center px-3 py-2.5 font-semibold w-20">{s}</th>
                ))}
                <th className="text-center px-3 py-2.5 font-semibold bg-primary/5">Total</th>
                <th className="text-center px-3 py-2.5 font-semibold bg-primary/5">%</th>
                <th className="text-center px-3 py-2.5 font-semibold bg-primary/5">Grade</th>
                <th className="text-center px-3 py-2.5 font-semibold bg-primary/5">Status</th>
                <th className="text-center px-3 py-2.5 font-semibold bg-primary/5">Rank</th>
                <th className="text-center px-3 py-2.5 font-semibold w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr key={r.student.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-1.5 text-muted-foreground tabular-nums font-medium">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <TextCell value={r.student.name} onCommit={(v) => examStore.updateStudent(r.student.id, { name: v })} className="font-medium w-40" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Select value={r.student.section} onValueChange={(v) => examStore.updateStudent(r.student.id, { section: v as typeof SECTIONS[number] })}>
                      <SelectTrigger className="h-7 w-16 text-xs px-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  {SUBJECTS.map((sub) => (
                    <MarkCell key={sub} examType={exam} studentId={r.student.id} subject={sub} value={r.marks[sub] ?? null} max={cfg.maxMarks} user={session?.email ?? "anon"} />
                  ))}
                  <td className="text-center font-bold tabular-nums bg-primary/5">{r.total}</td>
                  <td className="text-center tabular-nums bg-primary/5">{r.pct.toFixed(1)}%</td>
                  <td className="text-center bg-primary/5">
                    <Badge variant={r.grade === "F" ? "destructive" : "secondary"} className="text-[10px]">{r.grade}</Badge>
                  </td>
                  <td className="text-center bg-primary/5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${r.pass ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                      {r.pass ? "PASS" : "FAIL"}
                    </span>
                  </td>
                  <td className="text-center font-semibold tabular-nums bg-primary/5">#{r.rank}</td>
                  <td className="text-center">
                    <button
                      type="button"
                      title="Delete student"
                      onClick={() => {
                        if (confirm(`Delete ${r.student.name} (${r.student.roll})? Ye sab exams se hat jayega.`)) {
                          examStore.deleteStudent(r.student.id);
                          toast.success("Student deleted");
                        }
                      }}
                      className="p-1.5 rounded hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={SUBJECTS.length + 9} className="text-center py-10 text-muted-foreground">No students match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MarkCell({ examType, studentId, subject, value, max, user }: {
  examType: ExamType; studentId: string; subject: Subject; value: number | null; max: number; user: string;
}) {
  const [draft, setDraft] = useState<string>(value === null ? "" : String(value));
  const [error, setError] = useState(false);

  // Sync external changes
  useMemo(() => { setDraft(value === null ? "" : String(value)); }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      examStore.setMark(examType, studentId, subject, null, user);
      setError(false);
      return;
    }
    const n = Number(trimmed);
    if (Number.isNaN(n) || n < 0 || n > max) {
      setError(true);
      toast.error(`Marks must be 0–${max}`);
      setDraft(value === null ? "" : String(value));
      setTimeout(() => setError(false), 1200);
      return;
    }
    examStore.setMark(examType, studentId, subject, n, user);
    setError(false);
  };

  return (
    <td className="p-1 text-center">
      <input
        type="number"
        min={0}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.currentTarget.blur(); }
        }}
        className={`w-16 text-center px-1.5 py-1 rounded border bg-background tabular-nums text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition ${error ? "border-destructive ring-2 ring-destructive/30" : "border-transparent hover:border-border"}`}
      />
    </td>
  );
}

function ConfigDialog({ exam }: { exam: ExamType }) {
  const cfg = useExamStore((s) => s.config[exam]);
  const [maxMarks, setMaxMarks] = useState(cfg.maxMarks);
  const [passPct, setPassPct] = useState(cfg.passPct);
  const [open, setOpen] = useState(false);

  const save = () => {
    if (maxMarks <= 0 || passPct < 0 || passPct > 100) {
      toast.error("Invalid values");
      return;
    }
    examStore.setMaxMarks(exam, maxMarks);
    examStore.setPassPct(exam, passPct);
    toast.success("Settings updated · results recalculated");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { setMaxMarks(cfg.maxMarks); setPassPct(cfg.passPct); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Settings2 className="size-4 mr-1.5" /> Exam Config</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{EXAM_LABELS[exam]} Configuration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Max marks per subject</label>
            <Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Total max = {maxMarks * SUBJECTS.length} across {SUBJECTS.length} subjects</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Pass percentage</label>
            <Input type="number" value={passPct} onChange={(e) => setPassPct(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Students need ≥ {((passPct/100)*maxMarks).toFixed(1)} in every subject AND overall {passPct}%</p>
          </div>
          <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg text-xs">
            <AlertCircle className="size-4 text-warning-foreground shrink-0 mt-0.5" />
            <span>Changing config instantly recalculates every result, grade and rank.</span>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => { examStore.reseed(); toast.success("Reset 100 students with fresh data"); setOpen(false); }}>
            <RotateCcw className="size-4 mr-1.5" /> Reseed 100 random students
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={save}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TextCell({ value, onCommit, className }: { value: string; onCommit: (v: string) => void; className?: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => {
    const t = draft.trim();
    if (!t) { setDraft(value); return; }
    if (t !== value) onCommit(t);
  };
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setDraft(value); e.currentTarget.blur(); } }}
      className={`px-2 py-1 rounded border border-transparent hover:border-border focus:border-primary focus:ring-2 focus:ring-primary/20 bg-background focus:outline-none text-sm ${className ?? ""}`}
    />
  );
}

function AddStudentDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [enrollment, setEnrollment] = useState("");
  const [section, setSection] = useState<typeof SECTIONS[number]>("B1");
  const save = () => {
    if (!name.trim() || !roll.trim()) { toast.error("Name aur Roll No zaroori hai"); return; }
    const ok = examStore.addStudent({
      name: name.trim(), roll: roll.trim(),
      enrollment: enrollment.trim() || roll.trim(),
      semester: 2, section, branch: "CSE", course: "B.Tech CSE",
    });
    if (!ok) { toast.error("Roll No pehle se maujood hai"); return; }
    toast.success("Student add ho gaya");
    setName(""); setRoll(""); setEnrollment(""); setOpen(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><UserPlus className="size-4 mr-1.5" /> Add Student</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add new student</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5"><label className="text-sm font-medium">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Roll No</label><Input value={roll} onChange={(e) => setRoll(e.target.value)} placeholder="B2-101" /></div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Enrollment</label><Input value={enrollment} onChange={(e) => setEnrollment(e.target.value)} /></div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Section</label>
            <Select value={section} onValueChange={(v) => setSection(v as typeof SECTIONS[number])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Add</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
