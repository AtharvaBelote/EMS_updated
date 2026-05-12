# Requirements Document

## Introduction

Currently, the attendance period dialog contains a "Deduction % per Status" panel with sliders that let admins configure how much salary to deduct per attendance status (present, absent, half-day, leave). This is disconnected from the salary template system and requires manual configuration every time a period is saved.

This feature moves attendance-based deduction logic entirely into the Salary Template Builder. Attendance metrics — present days, absent days, half days, leave days, unmarked days, days paid, and paid leave days — become first-class formula variables inside the template, just like `basic` or `da`. The deduction sliders in the attendance period dialog are removed. At month-end, when a salary slip is generated, the template formulas automatically compute deductions using the actual attendance data for that employee.

## Glossary

- **Salary Template**: A configurable structure of sections and columns that defines how salary is computed for a group of employees. Stored in Firestore as `salaryTemplates`.
- **Template Column**: A single column in a salary template section. It has a label, a key (snake_case), and an optional formula expression.
- **Formula Variable**: A named value available inside a column's formula expression (e.g. `basic`, `paid_days`).
- **Attendance Variable**: A formula variable derived from an employee's attendance records for a given pay period (e.g. `present_days`, `absent_days`).
- **Attendance Period**: A date range for which attendance has been recorded, stored in Firestore as `attendancePeriodConfig`.
- **AttendanceGrid**: An in-memory map of `{ employeeId → { dateKey → status } }` used during bulk attendance entry.
- **Pay Period**: The month/year combination for which a salary slip is being generated.
- **Deduction % per Status**: The legacy slider-based panel in the attendance period dialog that is being removed.
- **SAMPLE_CTX**: The sample data object used in the formula preview inside the template builder.
- **FormulaDialog**: The dialog inside the Salary Template Builder where a column's formula expression is authored.
- **SalaryTemplateService**: The service layer (`salaryTemplateService.ts`) that persists and retrieves salary templates.
- **evaluateTemplateFormula**: The shared formula evaluator used when computing column values for a salary slip.
- **AttendanceDeductionConfig**: The legacy config type (`{ present, absent, half-day, leave, paid-leave }`) that will be deprecated.

## Requirements

### Requirement 1

**User Story:** As an admin, I want attendance metrics to be available as formula variables in the Salary Template Builder, so that I can write deduction formulas directly in the template instead of configuring sliders in the attendance dialog.

#### Acceptance Criteria

1. WHEN a user opens the FormulaDialog in the Salary Template Builder, THE System SHALL display the following attendance variables as clickable chips alongside existing salary variables: `present_days`, `absent_days`, `half_days`, `leave_days`, `unmarked_days`, `total_days`, `paid_leave_days`.
2. WHEN a user clicks an attendance variable chip in the FormulaDialog, THE System SHALL insert that variable key at the cursor position in the active formula input field.
3. WHEN the FormulaDialog renders a formula preview using SAMPLE_CTX, THE System SHALL include representative numeric values for all seven attendance variables so the preview produces a meaningful result.
4. WHEN a template column formula references an attendance variable (e.g. `absent_days * daily_rate`), THE System SHALL evaluate that formula correctly during salary slip generation using the employee's actual attendance data for the pay period.

---

### Requirement 2

**User Story:** As an admin, I want the attendance period save flow to store only attendance records without any deduction configuration, so that deduction logic lives exclusively in the salary template.

#### Acceptance Criteria

1. WHEN a user opens the Bulk Attendance Period dialog, THE System SHALL display the attendance grid and date range controls without the "Deduction % per Status" slider panel.
2. WHEN a user saves an attendance period, THE System SHALL write attendance records to Firestore without persisting a `deductionConfig` field on the `attendancePeriodConfig` document.
3. WHEN the attendance period is saved, THE System SHALL remove the "Salary Impact Preview" table from the dialog, as deduction preview is now handled in the template builder.
4. IF the `attendancePeriodConfig` Firestore document already contains a legacy `deductionConfig` field, THEN THE System SHALL ignore that field during salary computation and use the template formula instead.

---

### Requirement 3

**User Story:** As an admin, I want the salary slip generation to automatically resolve attendance variables from Firestore attendance records, so that end-of-month salary deductions are computed without manual input.

#### Acceptance Criteria

1. WHEN a salary slip is generated for an employee for a given month and year, THE System SHALL query Firestore for all attendance records for that employee within that pay period.
2. WHEN attendance records are retrieved, THE System SHALL compute the following values and inject them into the formula evaluation context: `present_days` (count of "present" records), `absent_days` (count of "absent" records), `half_days` (count of "half-day" records), `leave_days` (count of "leave" records), `paid_leave_days` (count of "paid-leave" records), `unmarked_days` (total_days minus all marked days), `total_days` (total calendar days in the pay period).
3. WHEN no attendance records exist for an employee in the pay period, THE System SHALL default all attendance variables to zero and `total_days` to the actual calendar days in the pay period.
4. WHEN the formula evaluation context is built for a template column, THE System SHALL merge attendance variables with existing salary variables so all are available in a single context object passed to `evaluateTemplateFormula`.

---

### Requirement 4

**User Story:** As an admin, I want the formula syntax reference in the FormulaDialog to include attendance-based deduction examples, so that I can quickly understand how to write attendance-driven formulas.

#### Acceptance Criteria

1. WHEN a user expands the "Formula syntax reference" accordion in the FormulaDialog, THE System SHALL display at least two example rows that use attendance variables (e.g. `absent_days * (basic / total_days)`, `if(absent_days > 3, absent_days * daily_rate, 0)`).
2. WHEN the formula syntax reference table is rendered, THE System SHALL group attendance examples visually separately from the existing arithmetic and conditional examples.

---

### Requirement 5

**User Story:** As an admin, I want the `AttendanceDeductionConfig` type and its related utilities to be preserved for backward compatibility but no longer used in new UI flows, so that existing saved data is not broken.

#### Acceptance Criteria

1. WHEN the codebase is updated, THE System SHALL retain the `AttendanceDeductionConfig` interface and `DEFAULT_DEDUCTION_CONFIG` constant in `attendanceDeductionUtils.ts` without modification.
2. WHEN the `computeAttendanceDeduction` function is called from legacy code paths, THE System SHALL continue to return a valid `AttendanceDeductionResult` without errors.
3. WHEN the `BulkAttendancePeriodDialog` saves a period, THE System SHALL omit the `deductionConfig` field from the Firestore write rather than writing a null or empty value.
