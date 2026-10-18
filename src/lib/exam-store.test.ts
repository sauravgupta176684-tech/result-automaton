import assert from "node:assert/strict";
import { test } from "node:test";
import { examStore, EXAM_TYPES, SUBJECTS } from "./exam-store";

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