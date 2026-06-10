import { useSyncExternalStore } from "react";

export type ExamType = "midsem" | "put" | "internal" | "endsem";
export const EXAM_LABELS: Record<ExamType, string> = {
  midsem: "Mid Sem",
  put: "PUT",
  internal: "Internal Assessment",
  endsem: "End Semester",
};

export const SUBJECTS = ["Math", "Physics", "Chemistry", "English", "CS"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SECTIONS = ["A1", "A2", "B1", "B2", "B3"] as const;
export type Section = (typeof SECTIONS)[number];

export interface Student {
  id: string;
  name: string;
  roll: string;
  enrollment: string;
  semester: number;
  section: Section;
  course: string;
}

export interface ExamConfig {
  maxMarks: number; // per subject
  passPct: number; // percentage
}

export interface AuditEntry {
  ts: number;
  user: string;
  studentRoll: string;
  subject: Subject;
  exam: ExamType;
  oldValue: number | null;
  newValue: number | null;
}

interface State {
  students: Student[];
  // marks[exam][studentId][subject] = number | null
  marks: Record<ExamType, Record<string, Partial<Record<Subject, number>>>>;
  config: Record<ExamType, ExamConfig>;
  audit: AuditEntry[];
}

const KEY = "exam-store-v1";

const FIRST = [
  "Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Krishna","Ishaan","Shaurya",
  "Atharv","Advait","Kabir","Ayaan","Dhruv","Rudra","Ansh","Pranav","Aryan","Veer",
  "Ananya","Aadhya","Anika","Diya","Saanvi","Myra","Ira","Aarohi","Anaya","Avni",
  "Pari","Riya","Siya","Tara","Kiara","Mira","Navya","Prisha","Sara","Zara",
  "Rohan","Neel","Karan","Vikram","Manav","Yash","Tanish","Dev","Om","Parth",
];
const LAST = [
  "Sharma","Verma","Patel","Gupta","Singh","Kumar","Mehta","Joshi","Shah","Rao",
  "Iyer","Reddy","Nair","Bose","Das","Roy","Khan","Malhotra","Kapoor","Bansal",
];

const randInt = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: readonly T[]) => arr[randInt(0, arr.length - 1)];

function seed(): State {
  const students: Student[] = Array.from({ length: 100 }).map((_, i) => {
    const section = SECTIONS[i % SECTIONS.length];
    const num = String(i + 1).padStart(3, "0");
    return {
      id: crypto.randomUUID(),
      name: `${pick(FIRST)} ${pick(LAST)}`,
      roll: `R${num}`,
      enrollment: `EN2024${num}`,
      semester: 3,
      section,
      course: "B.Tech CSE",
    };
  });

  const examTypes: ExamType[] = ["midsem", "put", "internal", "endsem"];
  const config = Object.fromEntries(
    examTypes.map((e) => [e, { maxMarks: 70, passPct: 35 }]),
  ) as Record<ExamType, ExamConfig>;

  const marks = Object.fromEntries(
    examTypes.map((e) => {
      const map: Record<string, Partial<Record<Subject, number>>> = {};
      for (const s of students) {
        map[s.id] = {};
        for (const sub of SUBJECTS) {
          // Realistic distribution, max 70
          const base = randInt(25, 68);
          map[s.id][sub] = base;
        }
      }
      return [e, map];
    }),
  ) as State["marks"];

  return { students, marks, config, audit: [] };
}

let state: State = load();
const listeners = new Set<() => void>();

function load(): State {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {}
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function setState(updater: (s: State) => State) {
  state = updater(state);
  persist();
}

export const examStore = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setMark(exam: ExamType, studentId: string, subject: Subject, value: number | null, user: string) {
    const student = state.students.find((s) => s.id === studentId);
    if (!student) return;
    const cfg = state.config[exam];
    const old = state.marks[exam][studentId]?.[subject] ?? null;
    if (value !== null) {
      if (Number.isNaN(value) || value < 0) return;
      if (value > cfg.maxMarks) return;
    }
    setState((s) => {
      const next = { ...s };
      next.marks = { ...s.marks };
      next.marks[exam] = { ...s.marks[exam] };
      const studentMarks = { ...(s.marks[exam][studentId] ?? {}) };
      if (value === null) delete studentMarks[subject];
      else studentMarks[subject] = value;
      next.marks[exam][studentId] = studentMarks;
      next.audit = [
        { ts: Date.now(), user, studentRoll: student.roll, subject, exam, oldValue: old, newValue: value },
        ...s.audit,
      ].slice(0, 500);
      return next;
    });
  },
  setMaxMarks(exam: ExamType, maxMarks: number) {
    if (maxMarks <= 0) return;
    setState((s) => ({ ...s, config: { ...s.config, [exam]: { ...s.config[exam], maxMarks } } }));
  },
  setPassPct(exam: ExamType, passPct: number) {
    setState((s) => ({ ...s, config: { ...s.config, [exam]: { ...s.config[exam], passPct } } }));
  },
  reseed() {
    state = seed();
    persist();
  },
  addStudent(student: Omit<Student, "id">) {
    if (state.students.some((s) => s.roll === student.roll)) return false;
    setState((s) => ({ ...s, students: [...s.students, { ...student, id: crypto.randomUUID() }] }));
    return true;
  },
};

export function useExamStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    examStore.subscribe,
    () => selector(examStore.get()),
    () => selector(examStore.get()),
  );
}

// ---------- Calculations ----------
export interface StudentResult {
  student: Student;
  marks: Partial<Record<Subject, number>>;
  total: number;
  maxTotal: number;
  pct: number;
  grade: string;
  pass: boolean;
  rank: number;
  sectionRank: number;
}

export function gradeFor(pct: number, passPct: number): { grade: string; pass: boolean } {
  if (pct >= 90) return { grade: "A+", pass: true };
  if (pct >= 80) return { grade: "A", pass: true };
  if (pct >= 70) return { grade: "B", pass: true };
  if (pct >= 60) return { grade: "C", pass: true };
  if (pct >= passPct) return { grade: "D", pass: true };
  return { grade: "F", pass: false };
}

export function computeResults(s: State, exam: ExamType): StudentResult[] {
  const cfg = s.config[exam];
  const maxTotal = cfg.maxMarks * SUBJECTS.length;
  const rows = s.students.map((stu) => {
    const marks = s.marks[exam][stu.id] ?? {};
    let total = 0;
    let any = false;
    for (const sub of SUBJECTS) {
      const v = marks[sub];
      if (typeof v === "number") { total += v; any = true; }
    }
    const pct = any ? (total / maxTotal) * 100 : 0;
    const { grade, pass } = gradeFor(pct, cfg.passPct);
    // Pass also requires each subject >= passPct of max
    const subjectMin = (cfg.passPct / 100) * cfg.maxMarks;
    const allSubPass = SUBJECTS.every((sub) => (marks[sub] ?? 0) >= subjectMin);
    return {
      student: stu,
      marks,
      total,
      maxTotal,
      pct,
      grade,
      pass: pass && allSubPass && any,
      rank: 0,
      sectionRank: 0,
    } as StudentResult;
  });
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  sorted.forEach((r, i) => (r.rank = i + 1));
  // section rank
  const bySection: Record<string, StudentResult[]> = {};
  rows.forEach((r) => {
    bySection[r.student.section] = bySection[r.student.section] || [];
    bySection[r.student.section].push(r);
  });
  Object.values(bySection).forEach((arr) => {
    arr.sort((a, b) => b.total - a.total);
    arr.forEach((r, i) => (r.sectionRank = i + 1));
  });
  return rows;
}
