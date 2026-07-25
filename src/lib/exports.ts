import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  SUBJECTS, SUBJECT_NAMES, EXAM_LABELS, EXAM_FULL, formatDate,
  type ExamType, type StudentResult,
} from "@/lib/exam-store";

const UNIVERSITY = "Smart Technological University";
const CELL = "Office of the Controller of Examinations";

/** One row per student — every field in its own dedicated column. */
export function wideRow(r: StudentResult, exam: ExamType) {
  const row: Record<string, string | number> = {
    "Student Name": r.student.name,
    "Roll Number": r.student.roll,
    "Enrollment Number": r.student.enrollment,
    "Branch": r.student.branch,
    "Section": r.student.section,
    "Semester": r.student.semester,
    "Exam": EXAM_LABELS[exam],
  };
  SUBJECTS.forEach((s) => {
    row[`${s} Marks`] = r.marks[s] ?? "";
  });
  row["Total"] = r.total;
  row["Max Total"] = r.maxTotal;
  row["Percentage"] = +r.pct.toFixed(2);
  row["Grade"] = r.grade;
  row["Rank"] = r.rank;
  row["Section Rank"] = r.sectionRank;
  row["Date"] = formatDate(r.updatedAt);
  row["Status"] = r.pass ? "PASS" : "FAIL";
  return row;
}

/** One row per student per subject — long format, never merged across students. */
export function longRows(r: StudentResult, exam: ExamType, maxMarks: number, passPct: number) {
  const min = Math.floor((passPct / 100) * maxMarks);
  return SUBJECTS.map((s) => ({
    "Student Name": r.student.name,
    "Roll Number": r.student.roll,
    "Enrollment Number": r.student.enrollment,
    "Branch": r.student.branch,
    "Section": r.student.section,
    "Semester": r.student.semester,
    "Exam": EXAM_LABELS[exam],
    "Subject": s,
    "Subject Name": SUBJECT_NAMES[s],
    "Marks": r.marks[s] ?? "",
    "Max Marks": maxMarks,
    "Total": r.total,
    "Percentage": +r.pct.toFixed(2),
    "Grade": r.grade,
    "Rank": r.rank,
    "Date": formatDate(r.updatedAt),
    "Status": (r.marks[s] ?? 0) >= min ? "PASS" : "FAIL",
  }));
}

function autoWidth(rows: Record<string, unknown>[]) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).map((k) => ({
    wch: Math.min(28, Math.max(k.length + 2, ...rows.map((r) => String(r[k] ?? "").length + 2))),
  }));
}

function sheet(wb: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = autoWidth(rows);
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

export function exportResultsWorkbook(
  results: StudentResult[],
  exam: ExamType,
  cfg: { maxMarks: number; passPct: number },
  filename = `${EXAM_LABELS[exam].replace(/\s/g, "_")}_Results.xlsx`,
) {
  const sorted = [...results].sort((a, b) => a.rank - b.rank);
  const wb = XLSX.utils.book_new();
  sheet(wb, `${EXAM_LABELS[exam]} Results`, sorted.map((r) => wideRow(r, exam)));
  sheet(wb, "Subject Wise", sorted.flatMap((r) => longRows(r, exam, cfg.maxMarks, cfg.passPct)));
  sheet(wb, "Exam Config", [{
    "Exam": EXAM_FULL[exam],
    "Max Marks Per Subject": cfg.maxMarks,
    "Subjects": SUBJECTS.length,
    "Max Total": cfg.maxMarks * SUBJECTS.length,
    "Pass Percentage": cfg.passPct,
    "Generated On": new Date().toLocaleString("en-IN"),
  }]);
  XLSX.writeFile(wb, filename);
}

export function exportStudentWorkbook(r: StudentResult, exam: ExamType, cfg: { maxMarks: number; passPct: number }) {
  const wb = XLSX.utils.book_new();
  sheet(wb, "Result Card", [wideRow(r, exam)]);
  sheet(wb, "Subject Wise", longRows(r, exam, cfg.maxMarks, cfg.passPct));
  XLSX.writeFile(wb, `${r.student.roll}_${EXAM_LABELS[exam].replace(/\s/g, "_")}_Result.xlsx`);
}

export function resultCardPdf(r: StudentResult, exam: ExamType, cfg: { maxMarks: number; passPct: number }) {
  const doc = new jsPDF();
  drawCard(doc, r, exam, cfg);
  doc.save(`${r.student.roll}_${EXAM_LABELS[exam].replace(/\s/g, "_")}_ResultCard.pdf`);
}

export function allResultCardsPdf(results: StudentResult[], exam: ExamType, cfg: { maxMarks: number; passPct: number }) {
  const doc = new jsPDF();
  const sorted = [...results].sort((a, b) => a.rank - b.rank);
  sorted.forEach((r, i) => {
    if (i > 0) doc.addPage();
    drawCard(doc, r, exam, cfg);
  });
  doc.save(`${EXAM_LABELS[exam].replace(/\s/g, "_")}_All_Result_Cards.pdf`);
}

function drawCard(doc: jsPDF, r: StudentResult, exam: ExamType, cfg: { maxMarks: number; passPct: number }) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(23, 55, 132);
  doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text(UNIVERSITY, W / 2, 12, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(CELL, W / 2, 19, { align: "center" });

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(`STATEMENT OF MARKS — ${EXAM_FULL[exam].toUpperCase()}`, W / 2, 36, { align: "center" });

  autoTable(doc, {
    startY: 42,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    body: [
      ["Student Name", r.student.name, "Roll Number", r.student.roll],
      ["Enrollment No.", r.student.enrollment, "Branch", r.student.branch],
      ["Semester", String(r.student.semester), "Section", r.student.section],
      ["Course", r.student.course, "Date", formatDate(r.updatedAt)],
    ],
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [240, 244, 252], cellWidth: 34 },
      2: { fontStyle: "bold", fillColor: [240, 244, 252], cellWidth: 34 },
    },
  });

  const min = Math.floor((cfg.passPct / 100) * cfg.maxMarks);
  autoTable(doc, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY: (doc as any).lastAutoTable.finalY + 6,
    theme: "grid",
    headStyles: { fillColor: [23, 55, 132], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2 },
    head: [["Code", "Subject", "Max", "Marks", "Status"]],
    body: SUBJECTS.map((s) => [
      s,
      SUBJECT_NAMES[s],
      String(cfg.maxMarks),
      String(r.marks[s] ?? "-"),
      (r.marks[s] ?? 0) >= min ? "PASS" : "FAIL",
    ]),
    foot: [["", "TOTAL", String(r.maxTotal), String(r.total), r.pass ? "PASS" : "FAIL"]],
    footStyles: { fillColor: [240, 244, 252], textColor: [20, 20, 20], fontStyle: "bold" },
  });

  autoTable(doc, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY: (doc as any).lastAutoTable.finalY + 6,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, halign: "center" },
    head: [["Total", "Percentage", "Grade", "Class Rank", "Section Rank", "Result"]],
    headStyles: { fillColor: [23, 55, 132], fontSize: 9, halign: "center" },
    body: [[
      `${r.total} / ${r.maxTotal}`,
      `${r.pct.toFixed(2)}%`,
      r.grade,
      `#${r.rank}`,
      `#${r.sectionRank}`,
      r.pass ? "PASS" : "FAIL",
    ]],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y = (doc as any).lastAutoTable.finalY + 18;
  doc.setFontSize(8).setTextColor(110, 110, 110);
  doc.text("This is a computer generated statement of marks and does not require a signature.", 14, y);
  doc.text(`Generated on ${new Date().toLocaleString("en-IN")}`, 14, y + 5);
  doc.text("Controller of Examinations", W - 14, y, { align: "right" });
}

export function printResultCard(r: StudentResult, exam: ExamType, cfg: { maxMarks: number; passPct: number }) {
  const min = Math.floor((cfg.passPct / 100) * cfg.maxMarks);
  const rows = SUBJECTS.map((s) => `
    <tr><td>${s}</td><td>${SUBJECT_NAMES[s]}</td><td class="c">${cfg.maxMarks}</td>
    <td class="c">${r.marks[s] ?? "-"}</td><td class="c">${(r.marks[s] ?? 0) >= min ? "PASS" : "FAIL"}</td></tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${r.student.roll} Result Card</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px}
    .hd{background:#173784;color:#fff;padding:16px;text-align:center;border-radius:6px}
    .hd h1{margin:0;font-size:18px}.hd p{margin:4px 0 0;font-size:12px;opacity:.85}
    h2{font-size:13px;text-align:center;margin:18px 0}
    table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12px}
    td,th{border:1px solid #c9d2e6;padding:6px 8px}
    th{background:#173784;color:#fff;text-align:left}
    .k{background:#eef2fb;font-weight:bold;width:22%}
    .c{text-align:center}
    .foot{font-size:11px;color:#666;margin-top:24px;display:flex;justify-content:space-between}
    @media print{body{margin:12px}}
  </style></head><body>
  <div class="hd"><h1>${UNIVERSITY}</h1><p>${CELL}</p></div>
  <h2>STATEMENT OF MARKS — ${EXAM_FULL[exam].toUpperCase()}</h2>
  <table>
    <tr><td class="k">Student Name</td><td>${r.student.name}</td><td class="k">Roll Number</td><td>${r.student.roll}</td></tr>
    <tr><td class="k">Enrollment No.</td><td>${r.student.enrollment}</td><td class="k">Branch</td><td>${r.student.branch}</td></tr>
    <tr><td class="k">Semester</td><td>${r.student.semester}</td><td class="k">Section</td><td>${r.student.section}</td></tr>
    <tr><td class="k">Course</td><td>${r.student.course}</td><td class="k">Date</td><td>${formatDate(r.updatedAt)}</td></tr>
  </table>
  <table><thead><tr><th>Code</th><th>Subject</th><th class="c">Max</th><th class="c">Marks</th><th class="c">Status</th></tr></thead>
  <tbody>${rows}<tr><td></td><td><b>TOTAL</b></td><td class="c"><b>${r.maxTotal}</b></td><td class="c"><b>${r.total}</b></td><td class="c"><b>${r.pass ? "PASS" : "FAIL"}</b></td></tr></tbody></table>
  <table><thead><tr><th class="c">Total</th><th class="c">Percentage</th><th class="c">Grade</th><th class="c">Class Rank</th><th class="c">Section Rank</th><th class="c">Result</th></tr></thead>
  <tbody><tr><td class="c">${r.total} / ${r.maxTotal}</td><td class="c">${r.pct.toFixed(2)}%</td><td class="c">${r.grade}</td><td class="c">#${r.rank}</td><td class="c">#${r.sectionRank}</td><td class="c">${r.pass ? "PASS" : "FAIL"}</td></tr></tbody></table>
  <div class="foot"><span>Computer generated — no signature required.</span><span>Controller of Examinations</span></div>
  <script>window.onload=function(){window.print()}</script>
  </body></html>`;
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}

/** Import marks from an .xlsx file. Matches strictly on Roll Number so no record can bleed into another. */
export function parseMarksWorkbook(data: ArrayBuffer) {
  const wb = XLSX.read(new Uint8Array(data), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  return rows.map((row) => {
    const roll = String(row["Roll Number"] ?? row["Roll No"] ?? row["roll"] ?? "").trim();
    const enrollment = String(row["Enrollment Number"] ?? row["Enrollment"] ?? "").trim();
    const marks: Partial<Record<(typeof SUBJECTS)[number], number>> = {};
    SUBJECTS.forEach((s) => {
      const raw = row[`${s} Marks`] ?? row[s];
      if (raw === "" || raw === undefined || raw === null) return;
      const n = Number(raw);
      if (!Number.isNaN(n)) marks[s] = n;
    });
    return { roll, enrollment, marks };
  });
}
