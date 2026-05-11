# Implementation Plan

- [x] 1. Add `computeAttendanceVariables` pure function to `attendanceDeductionUtils.ts`
  - Define the `AttendanceVariables` interface with all 7 fields
  - Implement `computeAttendanceVariables(statuses: string[], totalDays: number): AttendanceVariables`
  - `days_paid = present_days + paid_leave_days + leave_days + half_days * 0.5`
  - `unmarked_days = Math.max(0, totalDays - (present + absent + half + leave + paid_leave))`
  - _Requirements: 3.2, 3.3_

- [x] 1.1 Write property test for `computeAttendanceVariables` (Property 1)
  - **Feature: attendance-variables-in-salary-template, Property 1: Attendance variable computation correctness**
  - Use `fast-check` to generate random status arrays and totalDays values
  - Assert all 7 fields satisfy their formulas including edge case of empty statuses
  - **Validates: Requirements 3.2, 3.3**

- [x] 2. Add `fetchAttendanceVariables` async helper
  - Add `fetchAttendanceVariables(employeeId, month, year, totalDays)` to `attendanceDeductionUtils.ts`
  - Query Firestore `attendance` collection filtered by `employeeId` and date range for the given month/year
  - Extract status strings and call `computeAttendanceVariables`
  - On Firestore error, catch and return all-zero `AttendanceVariables`
  - _Requirements: 3.1, 3.3_

- [x] 3. Update `TemplateSalaryView` to inject attendance variables into formula context
  - In `getCellValue`, call `fetchAttendanceVariables` for the employee's pay period (derive month/year from current date or a prop)
  - Merge the returned `AttendanceVariables` into the context built by `buildEmployeeCtx` before calling `evaluateTemplateFormula`
  - Memoize attendance fetch results per `employeeId + month + year` using a `useRef` cache to avoid redundant Firestore queries
  - _Requirements: 3.2, 3.4_

- [x] 3.1 Write property test for context merge completeness (Property 2)
  - **Feature: attendance-variables-in-salary-template, Property 2: Context merge completeness**
  - Use `fast-check` to generate random salary context objects and random `AttendanceVariables`
  - Assert merged context contains every key from both objects
  - **Validates: Requirements 3.4**

- [x] 3.2 Write property test for formula evaluation with attendance variables (Property 3)
  - **Feature: attendance-variables-in-salary-template, Property 3: Formula evaluation with attendance variables**
  - Use `fast-check` to generate random numeric values for attendance variable keys and simple formula expressions referencing them
  - Assert `evaluateTemplateFormula` returns a finite number (not "error", NaN, or Infinity)
  - **Validates: Requirements 1.4**

- [x] 4. Extend `SAMPLE_CTX` and `ATTENDANCE_VARIABLES` in `SalaryTemplateBuilder.tsx`
  - Define `ATTENDANCE_VARIABLES` constant array with all 7 `{ key, label }` entries
  - Add representative numeric values to `SAMPLE_CTX`: `present_days: 24`, `absent_days: 2`, `half_days: 1`, `leave_days: 1`, `paid_leave_days: 0`, `unmarked_days: 2`, `days_paid: 25.5`
  - _Requirements: 1.1, 1.3_

- [x] 5. Update `FormulaDialog` to render attendance variable chips
  - Render a separate chip group labelled "Attendance variables" using the `ATTENDANCE_VARIABLES` constant
  - Chips use the same `insertKey` handler as existing salary variable chips
  - Add at least two attendance-based deduction example rows to the formula syntax reference accordion table, grouped under a separate "Attendance deduction examples" section header row
  - Example rows: `absent_days * (basic / total_days)` and `if(absent_days > 3, absent_days * (basic / total_days), 0)`
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [x] 6. Remove deduction UI from `BulkAttendancePeriodDialog`
  - Delete the `DeductionConfigPanel` component and its `deductionConfig` state
  - Delete the `SalaryImpactTable` component
  - Remove `deductionConfig` from the `batch.set` call for `attendancePeriodConfig`
  - Remove unused imports (`Settings`, `Info`, `computeAttendanceDeduction`, `DEFAULT_DEDUCTION_CONFIG`)
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 6.1 Write property test for attendance period save payload (Property 4)
  - **Feature: attendance-variables-in-salary-template, Property 4: Attendance period save omits deductionConfig**
  - Test the payload construction logic: assert the object does not contain a `deductionConfig` key for any valid save input
  - **Validates: Requirements 2.2, 5.3**

- [x] 6.2 Write property test for `computeAttendanceDeduction` backward compatibility (Property 5)
  - **Feature: attendance-variables-in-salary-template, Property 5: computeAttendanceDeduction backward compatibility**
  - Use `fast-check` to generate random `AttendanceDeductionConfig` objects and attendance grids
  - Assert `baseSalaryAfterAttendance` is finite and ≥ 0, and `totalDeductionAmount` is ≥ 0
  - **Validates: Requirements 5.2**

- [x] 7. Checkpoint — Ensure all tests pass, ask the user if questions arise.
