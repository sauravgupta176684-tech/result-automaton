import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trophy, Download, FileText, Medal } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useExamStore, computeResults, EXAM_LABELS, SUBJECTS, type ExamType, type StudentResult } from "@/lib/exam-store";

export const Route = createFileRoute("/_app/results")({
  head: () => ({ meta: [{ title: "Results & Toppers — Smart Exam System" }] }),
  component: ResultsPage,
});

const EXAMS: ExamType[] = ["midsem", "put", "internal", "endsem"];

function ResultsPage() {
  const state = useExamStore((s) => s);
  const [exam, setExam] = useState<ExamType>("midsem");
  const results = useMemo(() => computeResults(state, exam), [state, exam]);
  const cfg = state.config[exam];

  const sorted = useMemo(() => [...results].sort((a, b) => a.rank - b.rank), [results]);
  const top10 = sorted.slice(0, 10);
  const classTopper = sorted[0];

  const sectionToppers = useMemo(() => {
    const map: Record<string, StudentResult> = {};
    results.forEach((r) => {
      if (!map[r.student.section] || r.total > map[r.student.section].total) map[r.student.section] = r;
    });
    return Object.values(map).sort((a, b) => a.student.section.localeCompare(b.student.section));
  }, [results]);

  const subjectToppers = useMemo(() => {
    return SUBJECTS.map((sub) => {
      let best: StudentResult | null = null;
      let bestMark = -1;
      results.forEach((r) => {
        const v = r.marks[sub];
        if (typeof v === "number" && v > bestMark) { bestMark = v; best = r; }
      });
      return { subject: sub, topper: best, mark: bestMark };
    });
  }, [results]);

  const exportMerit = () => {
    const rows = sorted.map((r) => ({
      Rank: r.rank,
      Roll: r.student.roll,
      Name: r.student.name,
      Section: r.student.section,
      Total: r.total,
      Max: r.maxTotal,
      Percentage: +r.pct.toFixed(2),
      Grade: r.grade,
      Status: r.pass ? "PASS" : "FAIL",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Merit List");
    XLSX.writeFile(wb, `merit_${exam}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Results & Toppers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Auto-generated merit lists, subject toppers and printable result cards
          </p>
        </div>
        <div className="flex gap-2">
          <Tabs value={exam} onValueChange={(v) => setExam(v as ExamType)}>
            <TabsList>
              {EXAMS.map((e) => (
                <TabsTrigger key={e} value={e} className="text-xs">{EXAM_LABELS[e]}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={exportMerit}>
            <Download className="size-4 mr-1.5" /> Export Merit
          </Button>
        </div>
      </header>

      {classTopper && (
        <Card className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground border-0">
          <CardContent className="p-6 flex items-center gap-5">
            <div className="size-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Trophy className="size-8" />
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-primary-foreground/70 font-semibold">Class Topper · Semester {classTopper.student.semester}</div>
              <div className="text-2xl font-display font-bold mt-1">{classTopper.student.name}</div>
              <div className="text-sm text-primary-foreground/80 mt-0.5">{classTopper.student.roll} · Section {classTopper.student.section} · {classTopper.student.course}</div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold tabular-nums">{classTopper.pct.toFixed(1)}%</div>
              <div className="text-sm text-primary-foreground/80">{classTopper.total}/{classTopper.maxTotal} · Grade {classTopper.grade}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Medal className="size-4 text-warning" /> Subject Toppers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {subjectToppers.map((s) => (
              <div key={s.subject} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
                <Badge variant="outline" className="font-mono">{s.subject}</Badge>
                {s.topper ? (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{s.topper.student.name}</div>
                      <div className="text-xs text-muted-foreground">{s.topper.student.roll} · Sec {s.topper.student.section}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold tabular-nums">{s.mark}<span className="text-muted-foreground font-normal text-xs">/{cfg.maxMarks}</span></div>
                    </div>
                  </>
                ) : <div className="text-sm text-muted-foreground">No marks yet</div>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="size-4 text-warning" /> Section Toppers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sectionToppers.map((r) => (
              <div key={r.student.section} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
                <Badge className="bg-primary text-primary-foreground">{r.student.section}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{r.student.name}</div>
                  <div className="text-xs text-muted-foreground">{r.student.roll}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold tabular-nums">{r.pct.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">{r.total}/{r.maxTotal}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Top 10 Merit List</CardTitle>
          <Badge variant="secondary">{EXAM_LABELS[exam]}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Rank</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Roll</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Name</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Section</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Total</th>
                  <th className="text-right px-4 py-2.5 font-semibold">%</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Grade</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Card</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((r) => (
                  <tr key={r.student.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex size-7 rounded-full items-center justify-center text-xs font-bold ${r.rank === 1 ? "bg-warning text-warning-foreground" : r.rank <= 3 ? "bg-primary/15 text-primary" : "bg-muted"}`}>
                        {r.rank}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.student.roll}</td>
                    <td className="px-4 py-2.5 font-medium">{r.student.name}</td>
                    <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px]">{r.student.section}</Badge></td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">{r.total}<span className="text-muted-foreground font-normal">/{r.maxTotal}</span></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.pct.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-center"><Badge variant="secondary">{r.grade}</Badge></td>
                    <td className="px-4 py-2.5 text-center">
                      <ResultCardDialog result={r} exam={exam} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultCardDialog({ result, exam }: { result: StudentResult; exam: ExamType }) {
  const cfg = useExamStore((s) => s.config[exam]);

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text("Smart Exam Result Management System", 105, 18, { align: "center" });
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text(EXAM_LABELS[exam] + " — Result Card", 105, 25, { align: "center" });

    doc.setDrawColor(200); doc.line(15, 30, 195, 30);

    doc.setFontSize(10);
    const info = [
      ["Name", result.student.name, "Roll No", result.student.roll],
      ["Enrollment", result.student.enrollment, "Course", result.student.course],
      ["Semester", String(result.student.semester), "Section", result.student.section],
    ];
    let y = 38;
    info.forEach((row) => {
      doc.setFont("helvetica", "bold"); doc.text(row[0] + ":", 18, y);
      doc.setFont("helvetica", "normal"); doc.text(row[1], 50, y);
      doc.setFont("helvetica", "bold"); doc.text(row[2] + ":", 115, y);
      doc.setFont("helvetica", "normal"); doc.text(row[3], 145, y);
      y += 7;
    });

    autoTable(doc, {
      startY: y + 4,
      head: [["Subject", "Max", "Marks", "Status"]],
      body: SUBJECTS.map((s) => {
        const v = result.marks[s] ?? 0;
        const subMin = (cfg.passPct / 100) * cfg.maxMarks;
        return [s, cfg.maxMarks, v, v >= subMin ? "Pass" : "Fail"];
      }),
      theme: "grid",
      headStyles: { fillColor: [60, 100, 220], textColor: 255 },
      styles: { fontSize: 10 },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    autoTable(doc, {
      startY: finalY,
      body: [
        ["Total", `${result.total} / ${result.maxTotal}`, "Percentage", `${result.pct.toFixed(2)}%`],
        ["Grade", result.grade, "Status", result.pass ? "PASS" : "FAIL"],
        ["Class Rank", `#${result.rank}`, "Section Rank", `#${result.sectionRank}`],
      ],
      theme: "grid",
      styles: { fontSize: 10, fontStyle: "bold" },
      columnStyles: { 0: { fillColor: [240, 244, 255] }, 2: { fillColor: [240, 244, 255] } },
    });

    doc.save(`result_${result.student.roll}_${exam}.pdf`);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2"><FileText className="size-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Result Card · {result.student.name}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-4 rounded-lg">
            <Field label="Roll No" value={result.student.roll} />
            <Field label="Enrollment" value={result.student.enrollment} />
            <Field label="Section" value={result.student.section} />
            <Field label="Semester" value={String(result.student.semester)} />
            <Field label="Course" value={result.student.course} />
            <Field label="Exam" value={EXAM_LABELS[exam]} />
          </div>
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead className="bg-muted text-xs uppercase">
              <tr><th className="text-left px-3 py-2">Subject</th><th className="text-right px-3 py-2">Marks</th><th className="text-right px-3 py-2">Max</th></tr>
            </thead>
            <tbody>
              {SUBJECTS.map((s) => (
                <tr key={s} className="border-t"><td className="px-3 py-1.5">{s}</td><td className="px-3 py-1.5 text-right font-medium tabular-nums">{result.marks[s] ?? "—"}</td><td className="px-3 py-1.5 text-right text-muted-foreground tabular-nums">{cfg.maxMarks}</td></tr>
              ))}
              <tr className="border-t bg-primary/5 font-bold">
                <td className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{result.total}</td>
                <td className="px-3 py-2 text-right tabular-nums">{result.maxTotal}</td>
              </tr>
            </tbody>
          </table>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="%" value={`${result.pct.toFixed(1)}%`} />
            <Stat label="Grade" value={result.grade} />
            <Stat label="Rank" value={`#${result.rank}`} />
          </div>
          <Button className="w-full" onClick={downloadPdf}><Download className="size-4 mr-2" /> Download PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-primary/10 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
      <div className="font-bold text-lg">{value}</div>
    </div>
  );
}
