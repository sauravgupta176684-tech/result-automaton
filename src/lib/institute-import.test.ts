import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStudentIndex, lookupStudent, parseInstituteSheet, parsePdfResultLines } from "./institute-import";

const PDF_LINES = [
  "Baderia Global Institute of Engineering & Managment, Jabalpur",
  "Sr. No. ROLL NO Name BT101 BT202 BT103 BT104 BT105 Total % Result",
  "B2-84 0246AL251176 Saurav Gupta 20 16 17 20 14 87 87 Pass",
  "B2-18 0246CD251027 Ashish Vishwakarma 12 5 15 A 11 43 43 Fail",
  "B2-13 0246CD251014 Anshul Sahu A A A A A 0 0 Fail",
];

test("pdf result lines parse into students, absent subjects get no mark", () => {
  const rows = parsePdfResultLines(PDF_LINES);
  assert.equal(rows.length, 3);
  const first = rows[0]!;
  assert.equal(first.roll, "B2-84");
  assert.equal(first.enrollment, "0246AL251176");
  assert.equal(first.name, "Saurav Gupta");
  assert.deepEqual(first.marks, { BT101: 20, BT202: 16, BT103: 17, BT104: 20, BT105: 14 });
  const absent = rows[1]!.marks;
  assert.equal(absent.BT205, undefined);
  assert.equal(absent.BT104, 15);
  assert.deepEqual(rows[2]!.marks, {});
});

test("institute excel sheet parses with title rows above the header", () => {
  const grid: unknown[][] = [
    ["Baderia Global Institute of Engineering & Management, Jabalpur"],
    ["I-Mid Term Examination May-2026 | B.Tech - 2nd Semester Result | Section: B2"],
    [""],
    ["Sr. No.", "Roll No.", "Name", "BT101", "BT202", "BT103", "BT104", "BT105", "Total", "%", "Result"],
    ["B2-84", "0246AL251176", "Saurav Gupta", 20, 16, 17, 20, 14, 87, 87, "Pass"],
    ["B2-13", "0246CD251014", "Anshul Sahu", "A", "A", "A", "A", "A", 0, 0, "Fail"],
  ];
  const rows = parseInstituteSheet(grid);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    roll: "B2-84",
    enrollment: "0246AL251176",
    name: "Saurav Gupta",
    marks: { BT101: 20, BT202: 16, BT103: 17, BT104: 20, BT105: 14 },
  });
  assert.deepEqual(rows[1]!.marks, {});
});

test("app template format still parses and roll matching survives leading zeros", () => {
  const template: unknown[][] = [
    ["Student Name", "Roll Number", "Enrollment Number", "Branch", "Section", "Semester"],
    ["Aarav Sharma", "B2-101", "0246AL2510101", "CSE", "B1", 2],
  ];
  const rows = parseInstituteSheet(template);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.roll, "B2-101");
  assert.equal(rows[0]!.enrollment, "0246AL2510101");
  assert.deepEqual(rows[0]!.marks, {});

  const index = buildStudentIndex([{ roll: "B2-084", enrollment: "0246AL251176" }]);
  assert.equal(lookupStudent(index, "B2-84", "")?.roll, "B2-084");
  assert.equal(lookupStudent(index, "", "0246AL251176")?.roll, "B2-084");
  assert.equal(lookupStudent(index, "B2-999", ""), undefined);
});
