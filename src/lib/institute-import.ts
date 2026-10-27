import { SUBJECTS, type Subject } from "./exam-store";

export interface InstituteRow {
  roll: string;
  enrollment: string;
  name: string;
  marks: Partial<Record<Subject, number>>;
  result?: string;
}

// Roll numbers can appear as "B2-084" or "B2-84"; enrollment ids match exactly.
// Returns every comparable form of an id so lookups survive formatting differences.
export function idVariants(value: string): string[] {
  const t = String(value ?? "").trim().toUpperCase();
  if (!t) return [];
  const out = new Set<string>([t, t.replace(/[^A-Z0-9]/g, "")]);
  const m = t.match(/^([A-Z]+\d*)[-\s]?0*(\d+)$/);
  if (m) {
    const digits = String(parseInt(m[2], 10));
    out.add(`${m[1]}${digits}`);
    out.add(`${m[1]}-${digits}`);
  }
  return [...out];
}

export interface StudentIdLike {
  roll: string;
  enrollment: string;
}

export function buildStudentIndex<T extends StudentIdLike>(students: T[]): Map<string, T> {
  const index = new Map<string, T>();
  for (const student of students) {
    for (const key of [...idVariants(student.roll), ...idVariants(student.enrollment)]) {
      if (!index.has(key)) index.set(key, student);
    }
  }
  return index;
}

export function lookupStudent<T extends StudentIdLike>(
  index: Map<string, T>,
  roll: string,
  enrollment: string,
): T | undefined {
  for (const key of [...idVariants(roll), ...idVariants(enrollment)]) {
    const hit = index.get(key);
    if (hit) return hit;
  }
  return undefined;
}

const normHeader = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const isSubjectCode = (value: unknown) => /^bt\d{3}$/.test(normHeader(value));

// Accepts the institute result sheet ("Sr. No. | Roll No. | Name | BT101 | ... | Total | % | Result",
// title rows above the header included) and the app's own template
// ("Student Name | Roll Number | Enrollment Number | Branch | Section | Semester").
export function parseInstituteSheet(rows: unknown[][]): InstituteRow[] {
  const headerIdx = rows.findIndex(
    (row) =>
      row.some((cell) => ["name", "studentname"].includes(normHeader(cell))) &&
      row.some((cell) => ["rollno", "rollnumber", "roll", "rollnumberid"].includes(normHeader(cell))),
  );
  if (headerIdx === -1) return [];

  const header = rows[headerIdx] ?? [];
  const colOf = (names: string[]) =>
    header.findIndex((cell) => names.includes(normHeader(cell)));
  const nameCol = colOf(["name", "studentname"]);
  const rollCol = colOf(["rollno", "rollnumber", "roll", "rollnumberid"]);
  const enrollCol = colOf(["enrollmentnumber", "enrollment", "enrollmentno"]);
  const srCol = colOf(["srno", "srnumber", "srno.", "serialno", "serialnumber"]);
  const subjectCols: Array<{ col: number; code: Subject }> = [];
  header.forEach((cell, col) => {
    if (isSubjectCode(cell)) {
      const code = normHeader(cell).toUpperCase() as Subject;
      if ((SUBJECTS as readonly string[]).includes(code)) subjectCols.push({ col, code });
    }
  });
  if (nameCol === -1 || rollCol === -1) return [];

  const parsed: InstituteRow[] = [];
  for (const row of rows.slice(headerIdx + 1)) {
    if (!Array.isArray(row)) continue;
    const cell = (col: number) => String(row[col] ?? "").trim();
    const name = nameCol >= 0 ? cell(nameCol) : "";
    const rollCell = cell(rollCol);
    const enrollCell = enrollCol >= 0 ? cell(enrollCol) : "";
    const srCell = srCol >= 0 ? cell(srCol) : "";
    // Institute sheets keep the true roll (B2-84) in the "Sr. No." column and the
    // enrollment number under "Roll No." — pick whichever looks like a roll.
    const roll = /^B\d/i.test(srCell) ? srCell : rollCell;
    const enrollment = enrollCell || (rollCell !== roll ? rollCell : "");
    if (!name && !roll) continue;
    if (!name || !roll) continue;

    const marks: Partial<Record<Subject, number>> = {};
    for (const { col, code } of subjectCols) {
      const raw = cell(col);
      if (!raw || /^a$/i.test(raw)) continue;
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) marks[code] = n;
    }
    parsed.push({ roll, enrollment, name, marks });
  }
  return parsed;
}

// Parses one result row per text line, as produced by the institute result PDF:
// "B2-84 0246AL251176 Saurav Gupta 20 16 17 20 14 87 87 Pass"
// Absent subjects are written as "A" and simply get no mark.
export function parsePdfResultLines(lines: string[]): InstituteRow[] {
  const parsed: InstituteRow[] = [];
  for (const raw of lines) {
    const line = String(raw ?? "").replace(/\s+/g, " ").trim();
    if (!line) continue;
    const tokens = line.split(" ");
    const resultIdx = tokens.findIndex((token, i) => i > 0 && /^(pass|fail)$/i.test(token));
    if (resultIdx < 3) continue;
    const roll = tokens[0] ?? "";
    const enrollment = tokens[1] ?? "";
    if (!/^b\d/i.test(roll) || !enrollment) continue;
    const tail = tokens.slice(resultIdx - 7, resultIdx); // 5 subject marks + total + %
    if (tail.length < 7) continue;
    const markTokens = tail.slice(0, 5);
    if (!markTokens.every((t) => /^a$/i.test(t) || /^-?\d+(\.\d+)?$/.test(t))) continue;
    const name = tokens.slice(2, resultIdx - 7).join(" ").trim();
    if (!name) continue;

    const marks: Partial<Record<Subject, number>> = {};
    SUBJECTS.forEach((code, i) => {
      const token = markTokens[i] ?? "";
      if (!token || /^a$/i.test(token)) return;
      const n = Number(token);
      if (Number.isFinite(n) && n >= 0) marks[code] = n;
    });
    parsed.push({ roll, enrollment, name, marks, result: tokens[resultIdx] });
  }
  return parsed;
}
