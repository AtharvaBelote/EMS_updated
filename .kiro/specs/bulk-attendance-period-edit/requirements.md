# Requirements Document

## Introduction

This feature extends the existing attendance management system to support bulk editing of attendance records across multiple employees and multiple days simultaneously. Currently, the system only supports marking attendance for a single day at a time. The new feature allows an admin or manager to select a date range (e.g., May 22 to June 15), view a grid of all employees × all days in that range, and edit attendance statuses in bulk. It also introduces a configurable deduction percentage per attendance status that directly affects base salary computation. The resulting attendance deduction is reflected in the salary slip as a distinct line item — "Base Salary After Attendance Deduction" — before statutory deductions (PF, ESIC, PT) are applied.

## Glossary

- **Attendance Period**: A contiguous date range defined by a start date and an end date, inclusive.
- **Attendance Grid**: A two-dimensional table where rows represent employees and columns represent individual days within the Attendance Period.
- **Attendance Status**: One of four values — `present`, `absent`, `half-day`, or `leave` — assigned to an employee for a specific day.
- **Deduction Config**: A mapping from each Attendance Status to a percentage (0–200%) of the daily salary rate to deduct.
- **Daily Rate**: The per-day salary computed as `Base Salary ÷ Working Days in Period`.
- **Attendance Deduction Amount**: The total monetary deduction computed from the Deduction Config applied across all days in the Attendance Period.
- **Base Salary After Attendance**: `Base Salary − Attendance Deduction Amount`, floored at zero.
- **Salary Slip**: A generated payroll document showing earnings, attendance impact, and statutory deductions for an employee for a given month.
- **Working Days in Period**: The total number of calendar days in the selected Attendance Period (used as the denominator for Daily Rate).
- **Bulk Attendance Edit Dialog**: The UI component that renders the Attendance Grid and Deduction Config panel for a selected Attendance Period.
- **EMS**: Employee Management System — the application being extended.
- **Admin**: A user with the `admin` role who has full access to all employees and managers.
- **Manager**: A user with the `manager` role who has access only to employees assigned to that manager.

---

## Requirements

### Requirement 1

**User Story:** As an admin or manager, I want to select a date range and edit attendance for multiple employees across multiple days in a single view, so that I can efficiently manage attendance for an entire period without opening each day individually.

#### Acceptance Criteria

1. WHEN an admin or manager opens the Bulk Attendance Edit Dialog, THE EMS SHALL display two date pickers — Start Date and End Date — to define the Attendance Period.
2. WHEN the user confirms a valid Attendance Period (Start Date ≤ End Date), THE EMS SHALL render an Attendance Grid with one row per employee and one column per calendar day in the Attendance Period.
3. WHEN the Attendance Grid is rendered, THE EMS SHALL pre-populate each cell with the existing Attendance Status fetched from Firestore for that employee and day, or display "Not Marked" if no record exists.
4. WHEN the user changes an Attendance Status in any cell of the Attendance Grid, THE EMS SHALL update that cell's value immediately in local state without persisting to Firestore.
5. WHEN the user clicks Save, THE EMS SHALL persist all modified Attendance Grid cells to Firestore using a batched write, overwriting any existing records for those employee-day combinations.
6. IF the selected Attendance Period spans more than 62 days, THEN THE EMS SHALL display a validation error and prevent the Attendance Grid from rendering.
7. IF Start Date is after End Date, THEN THE EMS SHALL display a validation error and prevent the Attendance Grid from rendering.

---

### Requirement 2

**User Story:** As an admin or manager, I want to apply a single attendance status to all employees for a specific day or to all days for a specific employee, so that I can fill the grid quickly without editing each cell individually.

#### Acceptance Criteria

1. WHEN the user clicks a column header (a specific day) in the Attendance Grid, THE EMS SHALL provide an option to set all employees' status for that day to a chosen Attendance Status.
2. WHEN the user clicks a row header (an employee name) in the Attendance Grid, THE EMS SHALL provide an option to set all days' status for that employee to a chosen Attendance Status.
3. WHEN a bulk-fill action is applied to a column or row, THE EMS SHALL update all affected cells in local state immediately without persisting to Firestore.

---

### Requirement 3

**User Story:** As an admin or manager, I want to configure the deduction percentage for each attendance status, so that I can control how much of the daily salary is deducted for each type of attendance.

#### Acceptance Criteria

1. WHEN the Bulk Attendance Edit Dialog is open, THE EMS SHALL display a Deduction Config panel with a slider (0–200%, step 10) for each Attendance Status: `present`, `absent`, `half-day`, and `leave`.
2. WHEN the user adjusts a slider in the Deduction Config panel, THE EMS SHALL immediately update the displayed deduction preview without persisting to Firestore.
3. WHEN the user saves the Attendance Period, THE EMS SHALL persist the Deduction Config alongside the attendance records so that salary calculations use the saved config for that period.
4. THE EMS SHALL use the following default Deduction Config values: `present` = 0%, `absent` = 100%, `half-day` = 50%, `leave` = 0%.
5. WHEN the Deduction Config panel is rendered, THE EMS SHALL display a live preview showing the computed Attendance Deduction Amount for each employee based on the current grid state and current Deduction Config.

---

### Requirement 4

**User Story:** As an admin or manager, I want to see how the attendance deduction affects each employee's base salary, so that I can verify the financial impact before saving.

#### Acceptance Criteria

1. WHEN the Deduction Config panel is rendered, THE EMS SHALL compute and display for each employee: Daily Rate, total deduction days by status, Attendance Deduction Amount, and Base Salary After Attendance.
2. WHEN the user changes any Attendance Status cell or any Deduction Config slider, THE EMS SHALL recompute and refresh the salary impact preview within the same dialog.
3. WHEN the Attendance Deduction Amount exceeds the employee's Base Salary, THE EMS SHALL floor the Base Salary After Attendance at zero and display a warning indicator for that employee.

---

### Requirement 5

**User Story:** As an admin or manager, I want the salary slip to reflect the attendance deduction as a distinct line item, so that employees can see exactly how their attendance affected their pay.

#### Acceptance Criteria

1. WHEN a salary slip is generated for an employee, THE EMS SHALL include a line item "Base Salary" showing the original base salary before attendance deduction.
2. WHEN a salary slip is generated for an employee who has an Attendance Deduction Amount greater than zero for the relevant period, THE EMS SHALL include a line item "Attendance Deduction" showing the deduction amount.
3. WHEN a salary slip is generated, THE EMS SHALL compute all statutory deductions (PF, ESIC, PT) using the Base Salary After Attendance as the input, not the original Base Salary.
4. WHEN a salary slip is generated for an employee with no attendance records for the period, THE EMS SHALL treat the Attendance Deduction Amount as zero and use the original Base Salary for statutory deduction calculations.
5. WHEN a salary slip is generated, THE EMS SHALL display the line items in the following order: Base Salary → Attendance Deduction → Base Salary After Attendance → Statutory Deductions → Net Salary.

---

### Requirement 6

**User Story:** As an admin or manager, I want the attendance deduction computation to be consistent and reusable across the attendance editor and salary slip generator, so that the same logic is never duplicated.

#### Acceptance Criteria

1. THE EMS SHALL expose a single `computeAttendanceDeduction` function in `src/lib/attendanceDeductionUtils.ts` that accepts attendance records, base salary, working days in period, and a Deduction Config, and returns Daily Rate, Attendance Deduction Amount, and Base Salary After Attendance.
2. WHEN the Bulk Attendance Edit Dialog computes the salary impact preview, THE EMS SHALL call `computeAttendanceDeduction` from `src/lib/attendanceDeductionUtils.ts`.
3. WHEN the salary slip generator computes net salary, THE EMS SHALL call `computeAttendanceDeduction` from `src/lib/attendanceDeductionUtils.ts` to obtain Base Salary After Attendance before applying statutory deductions.
4. THE EMS SHALL serialize and deserialize the Deduction Config to and from Firestore using JSON, and the round-trip SHALL produce an equivalent Deduction Config object.
