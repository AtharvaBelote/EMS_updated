# Design Document — Bulk Attendance Period Edit

## Overview

This feature extends the EMS attendance system to support editing attendance for multiple employees across multiple days in a single dialog. It also introduces a configurable deduction percentage per attendance status that flows through to the salary slip as a distinct "Attendance Deduction" line item, ensuring statutory deductions (PF, ESIC, PT) are computed on the post-deduction base salary.

The existing `BulkAttendanceEditDialog` component is replaced/extended with a new period-aware version. The existing `computeAttendanceDeduction` utility in `src/lib/attendanceDeductionUtils.ts` is the single source of truth for all deduction math.

---

## Architecture

```
AttendanceManager (page)
  └── BulkAttendancePeriodDialog (new/extended)
        ├── DateRangePicker (start + end)
        ├── AttendanceGrid (employees × days table)
        │     ├── ColumnHeader (day) → bulk-fill column
        │     └── RowHeader (employee) → bulk-fill row
        └── DeductionConfigPanel (sliders + live preview)
              └── SalaryImpactTable (per-employee preview)

SalarySlips (existing)
  └── getPayslipModel / buildTemplateSlipRows
        └── computeAttendanceDeduction (shared util)

src/lib/attendanceDeductionUtils.ts  ← shared computation
```

Data flow:
1. User picks date range → EMS fetches all attendance docs for that range + all employees.
2. User edits grid cells and sliders → local state only, live preview recomputes via `computeAttendanceDeduction`.
3. User saves → batched Firestore write of attendance docs + one `attendancePeriodConfig` doc storing the Deduction Config for that period.
4. Salary slip generation reads the `attendancePeriodConfig` for the relevant month, calls `computeAttendanceDeduction`, and injects the result into the slip model.

---

## Components and Interfaces

### `BulkAttendancePeriodDialog`

**Location:** `src/components/attendance/BulkAttendancePeriodDialog.tsx`

**Props:**
```ts
interface BulkAttendancePeriodDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  employees: Employee[];          // pre-loaded by parent
}
```

**Internal state:**
```ts
startDate: Date | null
endDate: Date | null
// grid[employeeId][dateKey] = status
grid: Record<string, Record<string, string>>
deductionConfig: AttendanceDeductionConfig
saving: boolean
error: string
```

**Key behaviours:**
- Validates date range (start ≤ end, span ≤ 62 days).
- Fetches existing attendance from Firestore on date range confirmation.
- Renders `AttendanceGrid` and `DeductionConfigPanel` side by side.
- On save: batched Firestore write + saves `attendancePeriodConfig` doc.

---

### `AttendanceGrid`

**Location:** inline sub-component inside `BulkAttendancePeriodDialog`

Renders a scrollable `<Table>` where:
- Rows = employees (sorted by `fullName`).
- Columns = each day in the period (formatted `DD MMM`).
- Each cell = `<Select>` with the four statuses.
- Column header click → opens a small popover to bulk-fill that day for all employees.
- Row header click → opens a small popover to bulk-fill all days for that employee.

---

### `DeductionConfigPanel`

**Location:** inline sub-component inside `BulkAttendancePeriodDialog`

Renders four `<Slider>` controls (0–200%, step 10) for `present`, `absent`, `half-day`, `leave`. Below the sliders, renders `SalaryImpactTable`.

---

### `SalaryImpactTable`

Renders a compact table with columns: Employee | Daily Rate | Present | Absent | Half-Day | Leave | Deduction ₹ | Base After Attendance. Recomputes on every grid or slider change by calling `computeAttendanceDeduction`.

---

### Updated `SalarySlips` — `getPayslipModel`

Adds a step before building earnings/deductions rows:
1. Fetch `attendancePeriodConfig` for the employee's company + month/year.
2. Call `computeAttendanceDeduction` with the employee's attendance records for that month, their base salary, working days, and the saved Deduction Config.
3. Inject `baseSalaryAfterAttendance` into the slip context so template formulas and the fallback hardcoded path both use it.

---

## Data Models

### Firestore: `attendance` collection (existing, unchanged)
```
{
  employeeId: string,
  date: Timestamp,
  status: "present" | "absent" | "half-day" | "leave",
  markedBy: string,
  markedAt: Timestamp,
  reasonCode?: number   // only for absent
}
```

### Firestore: `attendancePeriodConfig` collection (new)
```
{
  companyId: string,
  startDate: Timestamp,
  endDate: Timestamp,
  month: number,          // for quick lookup by salary slip
  year: number,
  deductionConfig: {
    present: number,      // 0–200
    absent: number,
    "half-day": number,
    leave: number
  },
  createdBy: string,
  createdAt: Timestamp
}
```

Document ID: `{companyId}_{YYYY-MM-DD}_{YYYY-MM-DD}` (start_end).

### Updated `AttendanceDeductionResult` (existing util, no breaking change)
```ts
export interface AttendanceDeductionResult {
  baseSalary: number;
  dailyRate: number;
  totalDeductionAmount: number;
  baseSalaryAfterAttendance: number;
  summary: AttendanceSummary;
  deductionConfig: AttendanceDeductionConfig;
  workingDaysInPeriod: number;
}
```

### Salary slip context additions
The `buildTemplateSlipRows` context object gains two new keys:
```ts
attendance_deduction: number   // = result.totalDeductionAmount
base_after_attendance: number  // = result.baseSalaryAfterAttendance
```
These are available as formula variables in salary templates and are injected into the fallback hardcoded slip path.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Attendance deduction is non-negative and bounded
*For any* base salary, working days count, attendance record map, and Deduction Config, the `totalDeductionAmount` returned by `computeAttendanceDeduction` SHALL be ≥ 0 and SHALL NOT exceed `baseSalary × (maxConfigPct / 100) × (markedDays / workingDays)`.
**Validates: Requirements 3.1, 4.1**

Property 2: Base salary after attendance is floored at zero
*For any* inputs to `computeAttendanceDeduction`, `baseSalaryAfterAttendance` SHALL equal `max(0, baseSalary − totalDeductionAmount)`.
**Validates: Requirements 4.3**

Property 3: Zero deduction config produces no deduction
*For any* attendance record map and base salary, when all Deduction Config percentages are 0, `computeAttendanceDeduction` SHALL return `totalDeductionAmount = 0` and `baseSalaryAfterAttendance = baseSalary`.
**Validates: Requirements 3.4**

Property 4: 100% absent config deducts exactly one daily rate per absent day
*For any* base salary and working days count, when `absent = 100` and all other statuses are 0, `computeAttendanceDeduction` SHALL return `totalDeductionAmount = dailyRate × absentDays`.
**Validates: Requirements 3.1, 4.1**

Property 5: Deduction Config serialization round-trip
*For any* valid `AttendanceDeductionConfig` object, serializing it to JSON and deserializing it SHALL produce an object that is deeply equal to the original.
**Validates: Requirements 6.4**

Property 6: Grid save produces one Firestore doc per employee-day cell
*For any* Attendance Grid state with N employees and D days, saving SHALL produce exactly N × D attendance documents in Firestore (one per employee-day combination), overwriting any pre-existing records.
**Validates: Requirements 1.5**

Property 7: Salary slip deduction order invariant
*For any* generated salary slip, the line items SHALL appear in the order: Base Salary → Attendance Deduction → Base Salary After Attendance → Statutory Deductions → Net Salary.
**Validates: Requirements 5.5**

---

## Error Handling

| Scenario | Handling |
|---|---|
| Start > End | Inline validation error, grid not rendered |
| Period > 62 days | Inline validation error, grid not rendered |
| Firestore fetch fails | Alert shown, dialog remains open |
| Batched write fails | Alert shown, no partial save (batch is atomic) |
| Employee has no base salary | Daily rate = 0, deduction = 0, warning shown |
| Deduction exceeds base salary | `baseSalaryAfterAttendance` floored at 0, warning indicator in preview table |

---

## Testing Strategy

### Property-Based Testing

Library: **fast-check** (already available in the JS/TS ecosystem; install as `fast-check` dev dependency).

Each property-based test runs a minimum of 100 iterations. Every test is annotated with the format:
`// **Feature: bulk-attendance-period-edit, Property N: <property text>**`

Tests live in `src/lib/attendanceDeductionUtils.test.ts`.

**Properties to implement as PBTs:**
- Property 1: Deduction is non-negative and bounded
- Property 2: Base salary after attendance floored at zero
- Property 3: Zero config → zero deduction
- Property 4: 100% absent → deduction = dailyRate × absentDays
- Property 5: Deduction Config JSON round-trip

### Unit Tests

Tests live alongside their source files (`.test.ts` / `.test.tsx` suffix).

- `computeAttendanceDeduction` with specific known inputs (e.g., 2 absent days at ₹500/day → ₹1000 deduction).
- Grid date range validation (start > end, span > 62 days).
- Salary slip line item ordering (Property 7 — example-based since it tests rendering order).
- Firestore batch write produces correct document count (Property 6 — integration test with Firestore emulator or mock).

### Integration Points

- `BulkAttendancePeriodDialog` calls `computeAttendanceDeduction` for live preview — verified by unit test on the utility.
- `SalarySlips.getPayslipModel` calls `computeAttendanceDeduction` — verified by unit test that mocks Firestore and checks slip model output.
