import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trophy, Download, FileText, Medal, Presentation } from "lucide-react";
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
import { toast } from "sonner";
import { useExamStore, examStore, computeResults, EXAM_LABELS, SUBJECTS, type ExamType, type StudentResult, type Subject } from "@/lib/exam-store";
import { useSession, useIsTeacher } from "@/lib/auth";

export const Route = createFileRoute("/_app/results")({
  head: () => ({ meta: [{ title: "Results & Toppers — Smart Exam System" }] }),
  component: ResultsPage,
});

const EXAMS: ExamType[] = ["midsem", "put", "internal", "endsem"];

function ResultsPage() {
  const state = useExamStore((s) => s);
  const session = useSession();
  const isTeacher = useIsTeacher();
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
      for (const r of results) {
        const v = r.marks[sub];
        if (typeof v === "number" && v > bestMark) { bestMark = v; best = r; }
      }
      return { subject: sub, topper: best as StudentResult | null, mark: bestMark };
    });
  }, [results]);

  const exportMerit = () => {
    const rows = sorted.map((r) => {
      const row: Record<string, string | number> = {
        "Sr. No.": r.student.roll,
        "ROLL NO": r.student.enrollment,
        "Name": r.student.name,
      };
      SUBJECTS.forEach((s) => { row[s] = r.marks[s] ?? "A"; });
      row["Total"] = r.total;
      row["%"] = +((r.total / r.maxTotal) * 100).toFixed(2);
      row["Result"] = r.pass ? "Pass" : "Fail";
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Merit List");
    XLSX.writeFile(wb, `merit_${exam}.xlsx`);
    toast.success("Excel exported");
  };

  const exportPPT = async () => {
    toast.info("Generating PPT…");
    const { default: PptxGenJS } = await import("pptxgenjs");
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.title = `${EXAM_LABELS[exam]} Result Report`;

    const NAVY = "1E2761";
    const ACCENT = "E94560";
    const LIGHT = "F4F6FB";
    const passCount = sorted.filter((r) => r.pass).length;
    const failCount = sorted.length - passCount;
    const avgPct = sorted.length ? sorted.reduce((a, r) => a + r.pct, 0) / sorted.length : 0;

    // Slide 1 - Cover
    const s1 = pptx.addSlide();
    s1.background = { color: NAVY };
    s1.addShape("rect", { x: 0, y: 4.5, w: 13.33, h: 0.08, fill: { color: ACCENT } });
    s1.addText("Smart Exam Result Management System", {
      x: 0.6, y: 1.8, w: 12, h: 0.7, fontSize: 32, bold: true, color: "FFFFFF", fontFace: "Calibri",
    });
    s1.addText(`${EXAM_LABELS[exam]} — Result Report`, {
      x: 0.6, y: 2.6, w: 12, h: 0.6, fontSize: 24, color: "CADCFC", fontFace: "Calibri",
    });
    s1.addText(`B.Tech 2nd Sem · ${sorted.length} Students · ${SUBJECTS.length} Subjects`, {
      x: 0.6, y: 3.3, w: 12, h: 0.4, fontSize: 16, color: "FFFFFF", italic: true,
    });
    s1.addText(`Generated ${new Date().toLocaleDateString()}`, {
      x: 0.6, y: 4.8, w: 12, h: 0.3, fontSize: 12, color: "CADCFC",
    });

    // Slide 2 - Summary stats
    const s2 = pptx.addSlide();
    s2.background = { color: "FFFFFF" };
    s2.addText("Class Summary", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 28, bold: true, color: NAVY });
    const stats = [
      { label: "Total Students", val: String(sorted.length), c: NAVY },
      { label: "Pass", val: String(passCount), c: "2C5F2D" },
      { label: "Fail", val: String(failCount), c: ACCENT },
      { label: "Avg %", val: avgPct.toFixed(1) + "%", c: "065A82" },
    ];
    stats.forEach((st, i) => {
      const x = 0.5 + i * 3.15;
      s2.addShape("roundRect", { x, y: 1.3, w: 2.9, h: 2, fill: { color: LIGHT }, line: { color: st.c, width: 2 }, rectRadius: 0.15 });
      s2.addText(st.val, { x, y: 1.5, w: 2.9, h: 1.1, fontSize: 56, bold: true, color: st.c, align: "center", fontFace: "Calibri" });
      s2.addText(st.label, { x, y: 2.7, w: 2.9, h: 0.5, fontSize: 14, color: "555555", align: "center", bold: true });
    });
    s2.addText("Pass / Fail Distribution", { x: 0.5, y: 3.6, w: 12, h: 0.4, fontSize: 18, bold: true, color: NAVY });
    s2.addChart(pptx.ChartType.bar, [
      { name: "Students", labels: ["Pass", "Fail"], values: [passCount, failCount] },
    ], { x: 0.5, y: 4.1, w: 6, h: 2.8, chartColors: ["2C5F2D", "E94560"], showLegend: false });

    // Subject averages chart
    const subjectAvg = SUBJECTS.map((sub) => {
      const vals = sorted.map((r) => r.marks[sub]).filter((v): v is number => typeof v === "number");
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    s2.addChart(pptx.ChartType.bar, [
      { name: "Average", labels: [...SUBJECTS], values: subjectAvg.map((v) => +v.toFixed(1)) },
    ], { x: 6.8, y: 4.1, w: 6, h: 2.8, chartColors: ["1E2761"], showLegend: false, barDir: "col" });

    // Slide 3 - Top 10
    const s3 = pptx.addSlide();
    s3.background = { color: "FFFFFF" };
    s3.addText("Top 10 Merit", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 28, bold: true, color: NAVY });
    const top10Rows: import("pptxgenjs").default.TableRow[] = [
      [
        { text: "Rank", options: { bold: true, color: "FFFFFF", fill: { color: NAVY } } },
        { text: "Roll", options: { bold: true, color: "FFFFFF", fill: { color: NAVY } } },
        { text: "Name", options: { bold: true, color: "FFFFFF", fill: { color: NAVY } } },
        { text: "Section", options: { bold: true, color: "FFFFFF", fill: { color: NAVY } } },
        { text: "Total", options: { bold: true, color: "FFFFFF", fill: { color: NAVY } } },
        { text: "%", options: { bold: true, color: "FFFFFF", fill: { color: NAVY } } },
        { text: "Grade", options: { bold: true, color: "FFFFFF", fill: { color: NAVY } } },
      ],
      ...top10.map((r) => [
        { text: `#${r.rank}`, options: { bold: true, color: r.rank === 1 ? ACCENT : NAVY } },
        { text: r.student.roll },
        { text: r.student.name, options: { bold: true } },
        { text: r.student.section },
        { text: `${r.total}/${r.maxTotal}` },
        { text: `${r.pct.toFixed(1)}%` },
        { text: r.grade },
      ]),
    ];
    s3.addTable(top10Rows, { x: 0.5, y: 1.1, w: 12.3, fontSize: 14, fontFace: "Calibri", border: { type: "solid", color: "DDDDDD", pt: 0.5 }, rowH: 0.45 });

    // Slide 4 - Subject Toppers
    const s4 = pptx.addSlide();
    s4.background = { color: "FFFFFF" };
    s4.addText("Subject Toppers", { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 28, bold: true, color: NAVY });
    subjectToppers.forEach((st, i) => {
      const y = 1.2 + i * 1.05;
      s4.addShape("roundRect", { x: 0.5, y, w: 12.3, h: 0.9, fill: { color: LIGHT }, line: { color: "DDDDDD", width: 0.5 }, rectRadius: 0.1 });
      s4.addShape("roundRect", { x: 0.7, y: y + 0.18, w: 1.2, h: 0.55, fill: { color: NAVY }, rectRadius: 0.08 });
      s4.addText(st.subject, { x: 0.7, y: y + 0.18, w: 1.2, h: 0.55, fontSize: 16, bold: true, color: "FFFFFF", align: "center" });
      if (st.topper) {
        s4.addText(st.topper.student.name, { x: 2.1, y: y + 0.1, w: 7, h: 0.4, fontSize: 18, bold: true, color: NAVY });
        s4.addText(`${st.topper.student.roll} · Section ${st.topper.student.section}`, { x: 2.1, y: y + 0.5, w: 7, h: 0.35, fontSize: 12, color: "666666" });
        s4.addText(`${st.mark}/${cfg.maxMarks}`, { x: 9.5, y: y + 0.18, w: 3, h: 0.55, fontSize: 24, bold: true, color: ACCENT, align: "right" });
      }
    });

    // Slide 5+ - Full merit list (chunked, PDF-style)
    const CHUNK = 18;
    for (let i = 0; i < sorted.length; i += CHUNK) {
      const chunk = sorted.slice(i, i + CHUNK);
      const s = pptx.addSlide();
      s.background = { color: "FFFFFF" };
      s.addText(`Full Result · ${EXAM_LABELS[exam]} (${i + 1}–${Math.min(i + CHUNK, sorted.length)})`, {
        x: 0.5, y: 0.25, w: 12, h: 0.5, fontSize: 20, bold: true, color: NAVY,
      });
      const header = [
        "Sr. No.", "ROLL NO", "Name", ...SUBJECTS, "Total", "%", "Result",
      ].map((t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: NAVY }, align: "center" as const } }));
      const body = chunk.map((r) => [
        { text: r.student.roll, options: { align: "center" as const } },
        { text: r.student.enrollment, options: { align: "center" as const, fontSize: 9 } },
        { text: r.student.name },
        ...SUBJECTS.map((sub) => ({ text: String(r.marks[sub] ?? "A"), options: { align: "center" as const } })),
        { text: String(r.total), options: { bold: true, align: "center" as const } },
        { text: r.pct.toFixed(0), options: { align: "center" as const } },
        { text: r.pass ? "Pass" : "Fail", options: { color: r.pass ? "2C5F2D" : "E94560", bold: true, align: "center" as const } },
      ]);
      s.addTable([header, ...body], {
        x: 0.3, y: 0.9, w: 12.7, fontSize: 10, fontFace: "Calibri",
        border: { type: "solid", color: "BBBBBB", pt: 0.5 }, rowH: 0.32,
        colW: [0.8, 1.5, 2.6, 0.9, 0.9, 0.9, 0.9, 0.9, 0.8, 0.7, 0.9],
      });
    }

    await pptx.writeFile({ fileName: `result_${exam}_${new Date().toISOString().slice(0,10)}.pptx` });
    toast.success("PPT downloaded");
  };

  const exportAllPdf = () => {
    toast.info("Building combined PDF…");
    const doc = new jsPDF();
    sorted.forEach((result, idx) => {
      if (idx > 0) doc.addPage();
      doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text("Smart Exam Result Management System", 105, 16, { align: "center" });
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(EXAM_LABELS[exam] + " — Result Card", 105, 22, { align: "center" });
      doc.setDrawColor(200); doc.line(15, 26, 195, 26);

      doc.setFontSize(9);
      const info = [
        ["Name", result.student.name, "Roll No", result.student.roll],
        ["Enrollment", result.student.enrollment, "Course", result.student.course],
        ["Semester", String(result.student.semester), "Section", result.student.section],
      ];
      let y = 34;
      info.forEach((row) => {
        doc.setFont("helvetica", "bold"); doc.text(row[0] + ":", 18, y);
        doc.setFont("helvetica", "normal"); doc.text(row[1], 50, y);
        doc.setFont("helvetica", "bold"); doc.text(row[2] + ":", 115, y);
        doc.setFont("helvetica", "normal"); doc.text(row[3], 145, y);
        y += 6;
      });

      const subMin = Math.floor((cfg.passPct / 100) * cfg.maxMarks);
      autoTable(doc, {
        startY: y + 3,
        head: [["Subject", "Max", "Marks", "Status"]],
        body: SUBJECTS.map((s) => {
          const v = result.marks[s] ?? 0;
          return [s, cfg.maxMarks, v, v >= subMin ? "Pass" : "Fail"];
        }),
        theme: "grid",
        headStyles: { fillColor: [30, 39, 97], textColor: 255 },
        styles: { fontSize: 10 },
      });

      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
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

      doc.setFontSize(8); doc.setTextColor(120);
      doc.text(`Page ${idx + 1} of ${sorted.length}`, 105, 290, { align: "center" });
      doc.setTextColor(0);
    });
    doc.save(`all_result_cards_${exam}.pdf`);
    toast.success(`PDF with ${sorted.length} result cards downloaded`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Results & Toppers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Auto-generated merit lists, subject toppers, printable result cards & PPT reports
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tabs value={exam} onValueChange={(v) => setExam(v as ExamType)}>
            <TabsList>
              {EXAMS.map((e) => (
                <TabsTrigger key={e} value={e} className="text-xs">{EXAM_LABELS[e]}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={exportMerit}>
            <Download className="size-4 mr-1.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportAllPdf}>
            <FileText className="size-4 mr-1.5" /> All PDFs
          </Button>
          <Button size="sm" onClick={exportPPT} className="bg-gradient-to-r from-primary to-primary/80">
            <Presentation className="size-4 mr-1.5" /> Download PPT
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Full Merit List — {EXAM_LABELS[exam]}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">B.Tech 2nd Semester · {sorted.length} students · Max {cfg.maxMarks}/subject</p>
          </div>
          <Badge variant="outline">Pass {sorted.filter(r=>r.pass).length} · Fail {sorted.filter(r=>!r.pass).length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-primary text-primary-foreground sticky top-0">
                <tr>
                  <th className="px-2 py-2 font-semibold border border-primary/30">Sr. No.</th>
                  <th className="px-2 py-2 font-semibold border border-primary/30">ROLL NO</th>
                  <th className="px-2 py-2 font-semibold border border-primary/30 text-left">Name</th>
                  {SUBJECTS.map((s) => (
                    <th key={s} className="px-2 py-2 font-semibold border border-primary/30">{s}</th>
                  ))}
                  <th className="px-2 py-2 font-semibold border border-primary/30">Total</th>
                  <th className="px-2 py-2 font-semibold border border-primary/30">%</th>
                  <th className="px-2 py-2 font-semibold border border-primary/30">Result</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.student.id} className="hover:bg-muted/40">
                    <td className="px-2 py-1.5 border text-center font-mono">{r.student.roll}</td>
                    <td className="px-2 py-1.5 border text-center font-mono text-[10px]">{r.student.enrollment}</td>
                    <td className="px-2 py-1.5 border font-medium">{r.student.name}</td>
                    {SUBJECTS.map((sub) => (
                      <EditableMark
                        key={sub}
                        exam={exam}
                        studentId={r.student.id}
                        subject={sub}
                        value={r.marks[sub] ?? null}
                        max={cfg.maxMarks}
                        passPct={cfg.passPct}
                        user={session?.email ?? "anon"}
                        canEdit={isTeacher}
                      />
                    ))}
                    <td className="px-2 py-1.5 border text-center font-bold tabular-nums">{r.total}</td>
                    <td className="px-2 py-1.5 border text-center tabular-nums">{r.pct.toFixed(0)}</td>
                    <td className={`px-2 py-1.5 border text-center font-semibold ${r.pass ? "text-success" : "text-destructive"}`}>
                      {r.pass ? "Pass" : "Fail"}
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

function EditableMark({ exam, studentId, subject, value, max, passPct, user, canEdit }: {
  exam: ExamType; studentId: string; subject: Subject; value: number | null; max: number; passPct: number; user: string; canEdit: boolean;
}) {
  const [draft, setDraft] = useState<string>(value === null ? "" : String(value));
  const [editing, setEditing] = useState(false);
  useMemo(() => { setDraft(value === null ? "" : String(value)); }, [value]);

  const subMin = (passPct / 100) * max;
  const fail = typeof value === "number" && value < subMin;

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === "") {
      examStore.setMark(exam, studentId, subject, null, user);
      return;
    }
    const n = Number(trimmed);
    if (Number.isNaN(n) || n < 0 || n > max) {
      toast.error(`Marks 0–${max} ke beech hone chahiye`);
      setDraft(value === null ? "" : String(value));
      return;
    }
    examStore.setMark(exam, studentId, subject, n, user);
    toast.success(`${subject} updated`);
  };

  if (!canEdit) {
    return (
      <td className={`px-2 py-1.5 border text-center tabular-nums ${fail ? "text-destructive font-semibold" : ""}`}>
        {value === null ? "A" : value}
      </td>
    );
  }

  return (
    <td className={`p-0.5 border text-center tabular-nums ${fail ? "text-destructive font-semibold" : ""}`}>
      <input
        type="number"
        min={0}
        max={max}
        value={draft}
        onFocus={() => setEditing(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        className={`w-14 text-center px-1 py-1 rounded bg-transparent text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-background ${editing ? "border border-primary" : "border border-transparent hover:border-border"}`}
      />
    </td>
  );
}

