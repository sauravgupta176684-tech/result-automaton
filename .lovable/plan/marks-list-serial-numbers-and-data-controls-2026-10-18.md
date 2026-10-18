# Marks list serial numbers and data controls

## What will change
- Replace the marks table's separate row number and roll-number display with one serial-number column (1, 2, 3…). Keep actual roll numbers in each saved student record and in search/import/export behavior.
- Add teacher-facing controls to clear all marks while keeping the student list, and to delete the full student list. Ask for confirmation before either destructive action.
- Preserve the existing sample-data reseed option and current exam settings.

## Technical details
- Implement bulk operations in the existing exam store and expose them from the marks-entry screen using the existing UI components.
- Verify the result with the project build diagnostics and the marks-entry page.
