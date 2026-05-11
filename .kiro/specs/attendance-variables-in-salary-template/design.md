# Design Document — Attendance Variables in Salary Template

## Overview

This feature promotes attendance metrics from a one-off slider panel in the attendance period dialog into first-class formula variables inside the Salary Template Builder. After the change:

- The seven attendance variables (`present_days`, `absent_days`, `half_days`, `leave_days`, `paid_leave_days`, `unmarked_days`, `total_days`) are available as clickable chips in the FormulaDialog, exactly like `basic` or `da`.
- The "Deduction % per Status" sliders and "Salary Impact Preview" table are removed from `BulkAttendancePeriodDialog`.
- At salary slip generation time, `TemplateSalaryView` (and any slip-generation path) queries Firestore attendance records for the pay period, computes the seven variables, and merges them into the formula evaluation context before calling `evaluateTemplateFormula`.

No new Firestore collections are needed. The existing `attendance` collection is queried by `employeeId` + date range.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  SalaryTemplateBuilder / FormulaDialog                          │
│  • ATTENDANCE_VARIABLES constant (7 keys + labels)              │
│  • Chips rendered alongside salary variable chips               │
│  • SAMPLE_CTX extended with representative attendance values    │
│  • Formula syntax reference table gets attendance examples      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ template saved to Firestore
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Firestore: salaryTemplates                                     │
│  Column formula: e.g. "absent_days * (basic / total_days)"      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ read at slip generation
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  computeAttendanceVariables(records, totalDays)                 │
│  Pure function — new utility in attendanceDeductionUtils.ts     │
│  Returns: AttendanceVariables { present_days, absent_days, … }  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ merged into ctx
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  buildEmployeeCtx(emp) + attendance variables                   │
│  → evaluateTemplateFormula(expression, mergedCtx)               │
│  Used in: TemplateSalaryView.getCellValue                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  BulkAttendancePeriodDialog                                     │
│  • DeductionConfigPanel REMOVED                                 │
│  • SalaryImpactTable REMOVED                                    │
│  • handleSave no longer writes deductionConfig to Firestore     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### 1. `ATTENDANCE_VARIABLES` constant (new, in `SalaryTemplateBuilder.tsx`)

```ts
export const ATTENDANCE_VARIABLES: { key: string; label: string }[] = [
  { key: "present_days",   label: "Present Days" },
  { key: "absent_days",    label: "Absent Days" },
  { key: "half_days",      label: "Half Days" },
  { key: "leave_days",     label: "Leave Days" },
  { key: "paid_leave_days",label: "Paid Leave Days" },
  { key: "unmarked_days",  label: "Unmarked Days" },
  { key: "total_days",     label: "Total Days" },
];
```

These keys are rendered as a separate chip group in `FormulaDialog`, labelled "Attendance variables".

### 2. `SAMPLE_CTX` extension (in `SalaryTemplateBuilder.tsx`)

Add to the existing `SAMPLE_CTX` object:

```ts
present_days: 24,
absent_days: 2,
half_days: 1,
leave_days: 1,
paid_leave_days: 0,
unmarked_days: 2,
total_days: 30,
```

### 3. `computeAttendanceVariables` (new pure function in `attendanceDeductionUtils.ts`)

```ts
export interface AttendanceVariables {
  present_days: number;
  absent_days: number;
  half_days: number;
  leave_days: number;
  paid_leave_days: number;
  unmarked_days: number;
  total_days: number;
}

/**
 * Given a flat array of attendance status strings for one employee
 * and the total calendar days in the period, compute the 7 attendance variables.
 *
 * total_days    = the totalDays parameter (calendar days in the pay period)
 * unmarked_days = totalDays - (present + absent + half + leave + paid_leave)
 */
export function computeAttendanceVariables(
  statuses: string[],   // e.g. ["present", "absent", "half-day", ...]
  totalDays: number,
): AttendanceVariables
```

This is a pure function with no Firestore dependency — easy to unit and property test.

### 4. `fetchAttendanceVariables` (new async helper in `attendanceDeductionUtils.ts` or a new `attendanceService.ts`)

```ts
export async function fetchAttendanceVariables(
  employeeId: string,
  month: number,   // 1-based
  year: number,
  totalDays: number,
): Promise<AttendanceVariables>
```

Queries `attendance` collection filtered by `employeeId`, `date >= startOfMonth`, `date <= endOfMonth`. Extracts status strings, calls `computeAttendanceVariables`.

### 5. `buildEmployeeCtx` update (in `TemplateSalaryView.tsx`)

The existing `buildEmployeeCtx` returns a `Record<string, unknown>`. The `getCellValue` function will be updated to:

1. Call `fetchAttendanceVariables` for the employee's current pay period.
2. Spread the result into the context before formula evaluation.

Because `getCellValue` is called per-cell, attendance data will be fetched once per employee per render cycle (memoized with `useRef` or `useMemo` keyed by `employeeId + month + year`).

### 6. `BulkAttendancePeriodDialog` changes

- Remove `deductionConfig` state, `DeductionConfigPanel`, and `SalaryImpactTable` components.
- Remove `deductionConfig` from the `batch.set` call for `attendancePeriodConfig`.
- Remove imports of `Settings`, `Info` icons and `computeAttendanceDeduction`.
- The `AttendanceDeductionConfig` type and `DEFAULT_DEDUCTION_CONFIG` remain in `attendanceDeductionUtils.ts` untouched.

---

## Data Models

### AttendanceVariables (new)

```ts
interface AttendanceVariables {
  present_days: number;
  absent_days: number;
  half_days: number;
  leave_days: number;
  paid_leave_days: number;
  unmarked_days: number;
  total_days: number;
}
```

### attendancePeriodConfig Firestore document (updated shape)

Before:
```json
{
  "companyId": "...",
  "startDate": "...",
  "endDate": "...",
  "month": 5,
  "year": 2026,
  "deductionConfig": { "present": 0, "absent": 100, "half-day": 50, "leave": 0, "paid-leave": 0 },
  "createdBy": "...",
  "createdAt": "..."
}
```

After (new saves):
```json
{
  "companyId": "...",
  "startDate": "...",
  "endDate": "...",
  "month": 5,
  "year": 2026,
  "createdBy": "...",
  "createdAt": "..."
}
```

Legacy documents with `deductionConfig` are silently ignored during formula evaluation.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Attendance variable computation correctness

*For any* list of attendance status strings and any positive total days value, `computeAttendanceVariables` must satisfy:
- `present_days` equals the count of `"present"` entries
- `absent_days` equals the count of `"absent"` entries
- `half_days` equals the count of `"half-day"` entries
- `leave_days` equals the count of `"leave"` entries
- `paid_leave_days` equals the count of `"paid-leave"` entries
- `unmarked_days` equals `totalDays - (present + absent + half + leave + paid_leave)`, clamped to ≥ 0
- `total_days` equals the `totalDays` parameter passed in

Edge cases (empty statuses → all counts zero, `total_days` always equals the passed-in value) are covered by the generator.

**Validates: Requirements 3.2, 3.3**

---

### Property 2: Context merge completeness

*For any* employee context object (from `buildEmployeeCtx`) and any `AttendanceVariables` object, merging them must produce a context that contains every key from both the salary context and the attendance variables, with attendance values taking precedence on key collision.

**Validates: Requirements 3.4**

---

### Property 3: Formula evaluation with attendance variables

*For any* formula expression that references one or more attendance variable keys, and any context that includes those keys with numeric values, `evaluateTemplateFormula` must return a finite number (not `"error"`, not `NaN`, not `Infinity`).

**Validates: Requirements 1.4**

---

### Property 4: Attendance period save omits deductionConfig

*For any* attendance period save operation, the object written to the `attendancePeriodConfig` Firestore document must not contain a `deductionConfig` key.

**Validates: Requirements 2.2, 5.3**

---

### Property 5: computeAttendanceDeduction backward compatibility

*For any* valid `AttendanceDeductionConfig` and any attendance grid row, `computeAttendanceDeduction` must return an `AttendanceDeductionResult` where `baseSalaryAfterAttendance` is a finite non-negative number and `totalDeductionAmount` is non-negative.

**Validates: Requirements 5.2**

---

## Error Handling

| Scenario | Handling |
|---|---|
| Firestore attendance query fails | `fetchAttendanceVariables` catches the error and returns all-zero `AttendanceVariables`; formula still evaluates (with zero attendance values) |
| Formula references an attendance variable not yet in context | `evaluateTemplateFormula` returns `0` (existing behavior for unknown variables) |
| `totalDays` is 0 | `computeAttendanceVariables` returns all zeros; `total_days` = 0 |
| Legacy `deductionConfig` present in Firestore doc | Ignored — never read into formula context |

---

## Testing Strategy

### Unit tests

- `computeAttendanceVariables` with known inputs (all present, all absent, mixed, empty).
- `buildEmployeeCtx` merged with a sample `AttendanceVariables` — verify all keys present.
- `BulkAttendancePeriodDialog` save payload — verify no `deductionConfig` key.

### Property-based testing

**Library:** `fast-check` (already available in the project's dev dependencies via vitest ecosystem; install if not present).

Each property-based test runs a minimum of 100 iterations.

Each test is tagged with the format: `**Feature: attendance-variables-in-salary-template, Property {N}: {property_text}**`

| Property | Test description |
|---|---|
| Property 1 | Generate random arrays of status strings + random totalDays; assert all 7 computed fields satisfy their formulas || Property 2 | Generate random salary ctx + random AttendanceVariables; assert merged ctx contains all keys |
| Property 3 | Generate random attendance variable values + formula strings referencing them; assert evaluateTemplateFormula returns a finite number |
| Property 4 | Simulate save payload construction; assert no `deductionConfig` key present |
| Property 5 | Generate random AttendanceDeductionConfig + random attendance grids; assert result fields are finite and non-negative |
