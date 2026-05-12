# Implementation Plan

- [x] 1. Extend `attendanceDeductionUtils.ts` with updated types and helpers
  - Add `AttendancePeriodConfig` interface (companyId, startDate, endDate, month, year, deductionConfig)
  - Ensure `computeAttendanceDeduction` signature accepts `Record<string, string>` keyed by ISO date string
  - Export `DEFAULT_DEDUCTION_CONFIG` and all interfaces for use by dialog and salary slip
  - _Requirements: 6.1, 3.4_

- [x] 1.1 Write property test: deduction is non-negative and bounded
  - **Property 1: Deduction non-negative and bounded**
  - Use fast-check to generate arbitrary base salaries, working days, attendance maps, and configs
  - Assert `totalDeductionAmount >= 0` and `totalDeductionAmount <= baseSalary * (maxPct/100)`
  - **Validates: Requirements 3.1, 4.1**

- [x] 1.2 Write property test: base salary after attendance floored at zero
  - **Property 2: Base salary after attendance floored at zero**
  - Generate inputs where deduction can exceed base salary
  - Assert `baseSalaryAfterAttendance === Math.max(0, baseSalary - totalDeductionAmount)`
  - **Validates: Requirements 4.3**

- [x] 1.3 Write property test: zero config produces zero deduction
  - **Property 3: Zero config → zero deduction**
  - Generate arbitrary attendance maps and base salaries; set all config percentages to 0
  - Assert `totalDeductionAmount === 0` and `baseSalaryAfterAttendance === baseSalary`
  - **Validates: Requirements 3.4**

- [x] 1.4 Write property test: 100% absent config deducts exactly dailyRate × absentDays
  - **Property 4: 100% absent config → deduction = dailyRate × absentDays**
  - Generate attendance maps with only "absent" entries; set absent=100, others=0
  - Assert `totalDeductionAmount === dailyRate * absentDays`
  - **Validates: Requirements 3.1, 4.1**

- [x] 1.5 Write property test: Deduction Config JSON round-trip
  - **Property 5: Deduction Config JSON round-trip**
  - Generate arbitrary `AttendanceDeductionConfig` objects (values 0–200, step 10)
  - Assert `JSON.parse(JSON.stringify(config))` deeply equals original
  - **Validates: Requirements 6.4**

- [x] 2. Create `BulkAttendancePeriodDialog` component
  - Create `src/components/attendance/BulkAttendancePeriodDialog.tsx`
  - Implement date range pickers (start + end) with validation: start ≤ end, span ≤ 62 days
  - On valid range confirmation, fetch all attendance docs from Firestore for that range and all employees
  - Build initial `grid` state: `Record<employeeId, Record<dateKey, status>>`
  - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7_

- [x] 2.1 Implement `AttendanceGrid` sub-component
  - Render scrollable table: rows = employees, columns = days in period
  - Each cell is a `<Select>` bound to `grid[employeeId][dateKey]`
  - Column header click opens popover to bulk-fill that day for all employees (updates local state only)
  - Row header click opens popover to bulk-fill all days for that employee (updates local state only)
  - _Requirements: 1.4, 2.1, 2.2, 2.3_

- [x] 2.2 Write property test: bulk-fill sets all cells in target dimension
  - **Property 7: Bulk-fill sets all cells in target dimension**
  - Generate a random grid, a random day key, and a random status
  - Apply bulk-fill-column; assert every employee's status for that day equals the chosen status
  - Repeat for bulk-fill-row
  - **Validates: Requirements 2.1, 2.2**

- [x] 2.3 Implement `DeductionConfigPanel` and `SalaryImpactTable` sub-components
  - Render four sliders (0–200%, step 10) for present/absent/half-day/leave
  - On any slider change, update `deductionConfig` in local state
  - Render `SalaryImpactTable`: for each employee compute `computeAttendanceDeduction` using current grid + config
  - Show warning indicator when `baseSalaryAfterAttendance` is floored at zero
  - _Requirements: 3.1, 3.2, 3.5, 4.1, 4.2, 4.3_

- [x] 2.4 Implement Save logic in `BulkAttendancePeriodDialog`
  - On Save: build one attendance doc per employee-day cell from the grid
  - Use Firestore `writeBatch` to write all attendance docs atomically
  - Write one `attendancePeriodConfig` doc with ID `{companyId}_{startDate}_{endDate}`
  - Call `onSaved()` callback on success; show error alert on failure
  - _Requirements: 1.5, 3.3_

- [x] 2.5 Write property test: grid save produces N×D documents
  - **Property 6: Grid save produces N×D documents**
  - Generate a grid with N employees and D days
  - Mock Firestore batch; assert batch.set is called exactly N×D times
  - **Validates: Requirements 1.5**

- [x] 3. Wire `BulkAttendancePeriodDialog` into `AttendanceManager`
  - Add a "Bulk Edit Period" button to `AttendanceManager` toolbar
  - Pass `employees` list as prop to `BulkAttendancePeriodDialog`
  - Handle `onSaved` callback to refresh the single-day attendance view
  - _Requirements: 1.1_

- [x] 4. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update `SalarySlips` to include attendance deduction in slip model
  - In `getPayslipModel`, after resolving employee and payroll, query `attendancePeriodConfig` for the matching company + month + year
  - Fetch attendance docs for the employee for that month
  - Call `computeAttendanceDeduction` with the fetched records, employee base salary, working days, and saved deduction config
  - Inject `attendance_deduction` and `base_after_attendance` into the slip context
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5.1 Update fallback hardcoded slip path in `getPayslipModel`
  - In the fallback earnings array, add "BASE SALARY" row (original base)
  - Add "ATTENDANCE DEDUCTION" row (deduction amount, only if > 0)
  - Add "BASE AFTER ATTENDANCE" row
  - Ensure PF/ESIC/PT calculations use `base_after_attendance` as input
  - Maintain line item order: Base Salary → Attendance Deduction → Base After Attendance → Statutory Deductions → Net Salary
  - _Requirements: 5.5, 5.3_

- [x] 5.2 Update `buildTemplateSlipRows` to expose attendance deduction context keys
  - Add `attendance_deduction` and `base_after_attendance` to the template evaluation context
  - Ensure template formula columns can reference these keys
  - _Requirements: 5.2, 5.3_

- [x] 5.3 Write property test: slip includes attendance deduction line when deduction > 0
  - **Property 8: Slip includes attendance deduction line when deduction > 0**
  - Generate employees with non-zero attendance deductions
  - Assert the slip model's earnings or deductions array contains an "ATTENDANCE DEDUCTION" entry
  - **Validates: Requirements 5.2**

- [x] 5.4 Write property test: statutory deductions computed on base_after_attendance
  - **Property 9: Statutory deductions computed on base_after_attendance**
  - Generate employees with varying attendance deductions
  - Assert PF base, ESIC, and PT in the slip model are computed using `base_after_attendance`, not original `baseSalary`
  - **Validates: Requirements 5.3**

- [x] 6. Final Checkpoint — Ensure all tests pass, ask the user if questions arise.
