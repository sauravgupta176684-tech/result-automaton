import assert from "node:assert/strict";
import { test } from "node:test";
import { examStore, EXAM_TYPES, SUBJECTS, migrate } from "./exam-store";

test("saved marks in previous subject codes move to the new institute codes", () => {
  const raw = {
    students: [{ id: "s1", name: "Test Student", roll: "B2-001", enrollment: "ENR-1", semester: 2, section: "B2", branch: "CSE", course: "B.Tech CSE" }],
    marks: { midsem: { s1: { BT102: 11, BT203: 22, BT204: 33, BT205: 44, BT103: 55 } }, put: {} },
    updated: { midsem: {}, put: {} },
    config: { midsem: { maxMarks: 20, passPct: 35 }, put: { maxMarks: 70, passPct: 33 } },
    audit: [],
  } as unknown as Parameters<typeof migrate>[0];

  const out = migrate(raw);
  assert.deepEqual(out.marks.midsem.s1, { BT101: 11, BT202: 22, BT103: 33, BT104: 44, BT105: 55 });
});

test("clearing all marks keeps students and removes scores from both exams", () => {
  examStore.reseed();
  const startingState = examStore.get();
  const firstStudent = startingState.students[0];
  assert.ok(firstStudent);

  examStore.setMark("midsem", firstStudent.id, SUBJECTS[0], 12, "test");
  examStore.setMark("put", firstStudent.id, SUBJECTS[0], 55, "test");
  examStore.clearAllMarks();

  const state = examStore.get();
  assert.equal(state.students.length, 100);
  for (const exam of EXAM_TYPES) {
    assert.equal(state.marks[exam][firstStudent.id], undefined);
  }
});

test("removing the student list also removes all associated marks", () => {
  examStore.reseed();
  const firstStudent = examStore.get().students[0];
  assert.ok(firstStudent);
  examStore.setMark("put", firstStudent.id, SUBJECTS[0], 55, "test");

  examStore.deleteAllStudents();

  const state = examStore.get();
  assert.equal(state.students.length, 0);
  assert.deepEqual(state.marks, { midsem: {}, put: {} });
  assert.deepEqual(state.updated, { midsem: {}, put: {} });
});

test("import adds students and updates a matching roll without replacing its marks", () => {
  examStore.reseed();
  const existingStudent = examStore.get().students[0];
  assert.ok(existingStudent);
  examStore.setMark("midsem", existingStudent.id, SUBJECTS[0], 17, "test");

  const counts = examStore.importStudents([
    { name: "Updated Student", roll: existingStudent.roll, enrollment: "ENR-1", semester: 2, section: "B1", branch: "CSE", course: "B.Tech CSE" },
    { name: "New Student", roll: "NEW-001", enrollment: "ENR-2", semester: 2, section: "B2", branch: "IT", course: "B.Tech IT" },
  ]);

  const state = examStore.get();
  assert.deepEqual(counts, { added: 1, updated: 1 });
  assert.equal(state.students.length, 101);
  assert.equal(state.students.find((student) => student.roll === existingStudent.roll)?.name, "Updated Student");
  assert.equal(state.marks.midsem[existingStudent.id]?.[SUBJECTS[0]], 17);
  assert.equal(state.students.filter((student) => student.roll === existingStudent.roll).length, 1);
});