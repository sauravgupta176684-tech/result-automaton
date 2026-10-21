import { useSyncExternalStore } from "react";

export type ExamType = "midsem" | "put";
export const EXAM_TYPES: ExamType[] = ["midsem", "put"];
export const EXAM_LABELS: Record<ExamType, string> = {
  midsem: "Mid Sem",
  put: "PUT",
};
export const EXAM_FULL: Record<ExamType, string> = {
  midsem: "Mid Semester Examination",
  put: "Pre University Test (PUT)",
};

export const SUBJECTS = ["BT102", "BT203", "BT204", "BT205", "BT103"] as const;
export type Subject = (typeof SUBJECTS)[number];

export const SUBJECT_NAMES: Record<Subject, string> = {
  BT102: "Engineering Mathematics",
  BT203: "Engineering Physics",
  BT204: "Basic Electrical Engg.",
  BT205: "Programming in C",
  BT103: "Engineering Graphics",
};

// Maps subject codes saved before the list was replaced to their new codes,
// so already-entered marks stay with the same table column.
const SUBJECT_REMAP: Record<string, Subject> = {
  BT101: "BT102",
  BT202: "BT203",
  BT103: "BT204",
  BT104: "BT205",
  BT105: "BT103",
};

export const SECTIONS = ["B1", "B2", "B3", "B4", "B5"] as const;
export type Section = (typeof SECTIONS)[number];

export const BRANCHES = ["CSE", "IT", "ECE", "ME", "CE"] as const;
export type Branch = (typeof BRANCHES)[number];

export interface Student {
  id: string;
  name: string;
  roll: string;
  enrollment: string;
  semester: number;
  section: Section;
  branch: Branch;
  course: string;
}

export interface ExamConfig {
  maxMarks: number;
  passPct: number;
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
  marks: Record<ExamType, Record<string, Partial<Record<Subject, number>>>>;
  updated: Record<ExamType, Record<string, number>>;
  config: Record<ExamType, ExamConfig>;
  audit: AuditEntry[];
}

const KEY = "exam-store-v5";

const FIRST = [
  "Aarav","Saurav","Gaurav","Sanskriti","Aashi","Vivaan","Aditya","Vihaan","Arjun","Sai",
  "Reyansh","Krishna","Ishaan","Shaurya","Atharv","Advait","Kabir","Ayaan","Dhruv","Rudra",
  "Ansh","Pranav","Aryan","Veer","Ananya","Aadhya","Anika","Diya","Saanvi","Myra",
  "Ira","Aarohi","Anaya","Avni","Pari","Riya","Siya","Tara","Kiara","Mira",
  "Navya","Prisha","Sara","Zara","Rohan","Neel","Karan","Vikram","Manav","Yash",
  "Tanish","Dev","Om","Parth","Meghna","Priyanka","Rishika","Amrita","Krati","Jasraj",
  "Chandni","Akhil","Neeraj","Nitin","Akrati","Bhanu","Vedant","Yuvraj","Saket","Palash",
  "Akshay","Ashish","Shubh","Nitesh","Bhomik","Satyam","Sreyansh","Shreyansh","Deepali","Poorvi",
  "Anshul","Ayush","Sanket","Neeyansha","Aditi","Khushi","Tanya","Sneha","Ravi","Mohit",
  "Sahil","Aman","Harsh","Rajat","Nikhil","Varun","Kunal","Abhay","Ritu","Simran",
];
const LAST = [
  "Sharma","Verma","Patel","Gupta","Singh","Kumar","Mehta","Joshi","Shah","Rao",
  "Iyer","Reddy","Nair","Bose","Das","Roy","Khan","Malhotra","Kapoor","Bansal",
  "Sahu","Namdeo","Pandey","Vishwakarma","Burman","Jain","Dubey","Soni","Agrawal","Choudhary",
];

// Deterministic seeded RNG so SSR and client initial render match
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seed(): State {
  const rnd = mulberry32(42);
  const ri = (a: number, b: number) => Math.floor(rnd() * (b - a + 1)) + a;
  const pk = <T,>(arr: readonly T[]) => arr[ri(0, arr.length - 1)];

  const students: Student[] = Array.from({ length: 100 }).map((_, i) => {
    const section = SECTIONS[i % SECTIONS.length];
    const branch = BRANCHES[i % BRANCHES.length];
    const num = String(i + 1).padStart(3, "0");
    return {
      id: `stu-${num}`,
      name: `${pk(FIRST)} ${pk(LAST)}`,
      roll: `B2-${num}`,
      enrollment: `0246AL2510${num.padStart(2, "0")}`,
      semester: 2,
      section,
      branch,
      course: `B.Tech ${branch}`,
    };
  });

  const defaults: Record<ExamType, ExamConfig> = {
    midsem: { maxMarks: 20, passPct: 35 },
    put: { maxMarks: 70, passPct: 33 },
  };

  const baseTs = Date.UTC(2026, 6, 20, 9, 30);
  const marks = {} as State["marks"];
  const updated = {} as State["updated"];
  for (const e of EXAM_TYPES) {
    const max = defaults[e].maxMarks;
    const map: Record<string, Partial<Record<Subject, number>>> = {};
    const upd: Record<string, number> = {};
    for (const s of students) {
      map[s.id] = {};
      for (const sub of SUBJECTS) {
        const low = Math.floor(max * 0.15);
        const high = Math.floor(max * 0.98);
        map[s.id][sub] = ri(low, high);
      }
      upd[s.id] = baseTs;
    }
    marks[e] = map;
    updated[e] = upd;
  }

  return { students, marks, updated, config: defaults, audit: [] };
}

// Stable initial state used during SSR AND on first client render.
const initialState: State = seed();
let state: State = initialState;
const listeners = new Set<() => void>();

function migrate(raw: State): State {
  if (!raw.updated) raw.updated = { midsem: {}, put: {} };
  raw.students = raw.students.map((s, i) => ({
    ...s,
    branch: s.branch ?? BRANCHES[i % BRANCHES.length],
  }));
  // Only remap when saved data still uses the old subject codes.
  const usesOldCodes = EXAM_TYPES.some((e) =>
    Object.values(raw.marks?.[e] ?? {}).some((m) =>
      Object.keys(m ?? {}).some((k) => k === "BT101" || k === "BT202" || k === "BT104" || k === "BT105"),
    ),
  );
  if (usesOldCodes) {
    EXAM_TYPES.forEach((e) => {
      const map = raw.marks[e] ?? {};
      Object.keys(map).forEach((sid) => {
        const row = map[sid] ?? {};
        const remapped: Partial<Record<Subject, number>> = {};
        Object.entries(row).forEach(([code, value]) => {
          remapped[SUBJECT_REMAP[code] ?? (code as Subject)] = value;
        });
        map[sid] = remapped;
      });
    });
  }
  return raw;
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw) as State);
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

if (typeof window !== "undefined") {
  queueMicrotask(() => {
    state = load();
    listeners.forEach((l) => l());
  });
}

export const examStore = {
  get: () => state,
  getServerSnapshot: () => initialState,
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
      // Only this student's row object is replaced — no cross-record mixing.
      const studentMarks = { ...(s.marks[exam][studentId] ?? {}) };
      if (value === null) delete studentMarks[subject];
      else studentMarks[subject] = value;
      next.marks[exam][studentId] = studentMarks;
      next.updated = { ...s.updated, [exam]: { ...s.updated[exam], [studentId]: Date.now() } };
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
  importStudents(records: Omit<Student, "id">[]) {
    const students = [...state.students];
    const indexByRoll = new Map(students.map((student, index) => [student.roll, index]));
    let added = 0;
    let updated = 0;

    for (const record of records) {
      const roll = record.roll.trim();
      const name = record.name.trim();
      if (!roll || !name) continue;

      const existingIndex = indexByRoll.get(roll);
      if (existingIndex !== undefined) {
        const existing = students[existingIndex];
        if (existing) students[existingIndex] = { ...existing, ...record, roll, name };
        updated++;
      } else {
        indexByRoll.set(roll, students.length);
        students.push({ ...record, roll, name, id: crypto.randomUUID() });
        added++;
      }
    }

    if (added || updated) setState((s) => ({ ...s, students }));
    return { added, updated };
  },
  updateStudent(id: string, patch: Partial<Omit<Student, "id">>) {
    setState((s) => ({
      ...s,
      students: s.students.map((stu) => (stu.id === id ? { ...stu, ...patch } : stu)),
    }));
  },
  deleteStudent(id: string) {
    setState((s) => {
      const nextMarks = { ...s.marks } as State["marks"];
      EXAM_TYPES.forEach((e) => {
        const copy = { ...nextMarks[e] };
        delete copy[id];
        nextMarks[e] = copy;
      });
      return { ...s, students: s.students.filter((stu) => stu.id !== id), marks: nextMarks };
    });
  },
  clearStudentMarks(id: string, exam?: ExamType) {
    setState((s) => {
      const nextMarks = { ...s.marks } as State["marks"];
      const exams: ExamType[] = exam ? [exam] : EXAM_TYPES;
      exams.forEach((e) => {
        const copy = { ...nextMarks[e] };
        delete copy[id];
        nextMarks[e] = copy;
      });
      return { ...s, marks: nextMarks };
    });
  },
  clearAllMarks() {
    setState((s) => ({
      ...s,
      marks: { midsem: {}, put: {} },
      updated: { midsem: {}, put: {} },
    }));
  },
  deleteAllStudents() {
    setState((s) => ({
      ...s,
      students: [],
      marks: { midsem: {}, put: {} },
      updated: { midsem: {}, put: {} },
    }));
  },
};

export function useExamStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    examStore.subscribe,
    () => selector(examStore.get()),
    () => selector(examStore.getServerSnapshot()),
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
  updatedAt: number;
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
    const subjectMin = Math.floor((cfg.passPct / 100) * cfg.maxMarks);
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
      updatedAt: s.updated?.[exam]?.[stu.id] ?? 0,
    } as StudentResult;
  });
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  sorted.forEach((r, i) => (r.rank = i + 1));
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

export function formatDate(ts: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
