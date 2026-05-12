# EMS Codebase Guide

## What This Is
A Next.js 15 + Firebase Employee Management System (EMS) for **Shree Samartha Krupa Consulting Services**.  
Stack: Next.js 15 (App Router), React 19, TypeScript, MUI v7, Firebase (Auth + Firestore + Storage), Tailwind CSS, Recharts, jsPDF, XLSX.

---

## Project Structure

```
/
├── src/
│   ├── app/                  # Next.js App Router pages
│   ├── components/           # Feature-based UI components
│   ├── contexts/             # React context providers
│   ├── lib/                  # Firebase config + utilities
│   └── types/                # TypeScript interfaces
├── EMS-Mobile/               # Separate React Native / Expo mobile app
├── .env                      # Firebase + R2 env vars (never commit)
└── package.json
```

---

## Routing Map (`src/app/`)

| Route | File | Access | Component Rendered |
|---|---|---|---|
| `/` | `page.tsx` | Public | Redirects → `/dashboard` or `/login` |
| `/login` | `login/page.tsx` | Public | `LoginPage` |
| `/register` | `register/page.tsx` | Public | `RegisterPage` |
| `/company-registration` | `company-registration/page.tsx` | Public | `CompanyRegistration` |
| `/onboarding` | `onboarding/page.tsx` | Public | `OnboardingWizard` |
| `/employee-setup` | `employee-setup/page.tsx` | Public | `EmployeePasswordSetup` |
| `/manager-setup` | `manager-setup/page.tsx` | Public | `ManagerPasswordSetup` |
| `/dashboard` | `dashboard/page.tsx` | All roles | `AdminDashboard` / `ManagerDashboard` / `EmployeeDashboard` |
| `/employees` | `employees/page.tsx` | admin, manager | `EmployeeTable` |
| `/managers` | `managers/page.tsx` | admin | `ManagerTable` |
| `/attendance` | `attendance/page.tsx` | All roles | `AttendanceManager` (admin/mgr) / `EmployeeAttendance` (emp) |
| `/leave-management` | `leave-management/page.tsx` | All roles | `LeaveManagement` |
| `/salary` | `salary/page.tsx` | admin | `SalaryStructures` |
| `/salary-slips` | `salary-slips/page.tsx` | All roles | `SalarySlips` |
| `/salary-structure` | `salary-structure/page.tsx` | admin | Placeholder (coming soon) |
| `/payroll` | `payroll/page.tsx` | admin | `PayrollProcessing` |
| `/reports` | `reports/page.tsx` | admin, manager | `Reports` |
| `/settings` | `settings/page.tsx` | All roles | `AdminCompanySettings` / `EmployeeSettings` / placeholder (mgr) |
| `/profile` | `profile/page.tsx` | employee | `EmployeeProfile` |
| `/api/uploads/r2` | `api/uploads/r2/route.ts` | Server | Cloudflare R2 file upload endpoint |

---

## Components (`src/components/`)

### `auth/`
| File | Purpose |
|---|---|
| `LoginPage.tsx` | Login form — accepts Employee ID / User ID + password |
| `RegisterPage.tsx` | Admin/Manager registration form |
| `CompanyRegistration.tsx` | Company onboarding registration |
| `EmployeePasswordSetup.tsx` | First-time password setup for employees |
| `ManagerPasswordSetup.tsx` | First-time password setup for managers |
| `RegistrationSuccessDialog.tsx` | Success dialog after registration |
| `RouteGuard.tsx` | Wraps pages — redirects if unauthenticated or wrong role |

### `layout/`
| File | Purpose |
|---|---|
| `Layout.tsx` | App shell — AppBar + Sidebar + main content area |
| `Sidebar.tsx` | Role-aware nav menu (different items per admin/manager/employee) |

### `dashboard/`
| File | Purpose |
|---|---|
| `AdminDashboard.tsx` | Admin home — stats, charts, overview |
| `ManagerDashboard.tsx` | Manager home — team stats |
| `EmployeeDashboard.tsx` | Employee home — personal info, attendance, leaves |

### `employees/`
| File | Purpose |
|---|---|
| `EmployeeTable.tsx` | List/search/filter employees, bulk actions, CRUD |
| `EmployeeForm.tsx` | Add/edit employee form |
| `EmployeeProfile.tsx` | Employee's own profile view |
| `EmployeeAccountSetup.tsx` | Account setup flow for new employees |

### `managers/`
| File | Purpose |
|---|---|
| `ManagerTable.tsx` | List/manage managers |
| `ManagerForm.tsx` | Add/edit manager form |

### `attendance/`
| File | Purpose |
|---|---|
| `AttendanceManager.tsx` | Admin/manager attendance tracking & editing |
| `EmployeeAttendance.tsx` | Employee's own attendance view |

### `leave/`
| File | Purpose |
|---|---|
| `LeaveManagement.tsx` | Leave applications, approvals, balances (role-aware) |

### `salary/`
| File | Purpose |
|---|---|
| `SalaryStructures.tsx` | Configure salary components (Basic, DA, HRA, PF, ESIC, etc.) |
| `SalarySlips.tsx` | Generate, view, download PDF salary slips |

### `payroll/`
| File | Purpose |
|---|---|
| `PayrollProcessing.tsx` | Run payroll, calculate net salaries, approve/pay |

### `reports/`
| File | Purpose |
|---|---|
| `Reports.tsx` | Generate reports — attendance, payroll, employee summaries |

### `settings/`
| File | Purpose |
|---|---|
| `AdminCompanySettings.tsx` | Company info, branding (logo/stamp/sign upload to R2), salary config |
| `EmployeeSettings.tsx` | Employee personal settings |

### `onboarding/`
| File | Purpose |
|---|---|
| `OnboardingWizard.tsx` | Multi-step wizard for new company/admin setup |

### `notifications/`
| File | Purpose |
|---|---|
| `NotificationCenter.tsx` | In-app notification bell + list (currently commented out in Sidebar) |

### `providers/`
| File | Purpose |
|---|---|
| `ThemeProvider.tsx` | MUI dark theme setup (wraps entire app) |
| `ClientOnly.tsx` | Prevents SSR hydration mismatches for client-only components |

---

## Core Logic (`src/lib/` & `src/contexts/`)

### `src/lib/firebase.ts`
Initializes Firebase app and exports:
- `auth` — Firebase Authentication
- `db` — Firestore database
- `storage` — Firebase Storage

### `src/lib/utils.ts`
Helper functions:
- `generateUserId(role)` — generates `ADMIN######`, `MGR######`, `EMP######`
- `copyToClipboard(text)`
- `formatCurrency(amount)` — INR format
- `formatDate(date)` — Indian locale
- `calculateAge(dob)`

### `src/contexts/AuthContext.tsx`
Global auth state. Provides:
- `currentUser` — full `User` object from Firestore (not just Firebase Auth)
- `loading` — boolean
- `login(userId, password)` — looks up user by `userId` or `employeeId` in Firestore, then signs in via Firebase Auth
- `register(userId, email, password, displayName, role)`
- `logout()`
- `updateUserProfile(data)`

---

## Data Models (`src/types/`)

### `index.ts` — Core models
| Interface | Firestore Collection | Key Fields |
|---|---|---|
| `User` | `users` | `uid`, `userId` (login ID), `role`, `companyId`, `employeeId` |
| `Company` | (stored in users as admin) | `companyName`, `adminName`, `address`, `managers[]` |
| `Manager` | `managers` | `managerId`, `companyId`, `payslipBranding` |
| `Employee` | `employees` | `employeeId`, `companyId`, `assignedManager`, `salary{}` |
| `Attendance` | `attendance` | `employeeId`, `date`, `status` |
| `SalarySlip` | `salarySlips` | `employeeId`, `month`, `year`, `slipData`, `branding` |
| `Payroll` | `payroll` | `employeeId`, `month`, `year`, `netSalary`, `status` |
| `SalaryConfiguration` | `salaryConfigurations` | `companyId`, percentages, PT slabs, skill categories |

### `leave.ts`
`LeaveType`, `LeaveBalance`, `LeaveApplication`, `Holiday`

### `notification.ts`
`Notification`, `NotificationPreference`, `EmailTemplate`

### `document.ts`
`Document`, `DocumentTemplate`, `DocumentField`, `DocumentRequest`

### `performance.ts`
`AnnualReview`, `DailyPerformance`, `PerformanceStats`, `Competency`, `FeedbackRequest`

---

## Salary Calculation Logic (in `Employee.salary`)

| Field | Formula |
|---|---|
| `hra` | `ROUND((basic + da) * hraPercentage%, 0)` — default 5% |
| `grossRatePM` | `basic + da + hra` |
| `otRatePerHour` | `(grossRatePM ÷ paidDays) ÷ 8` |
| `esicEmployee` | `totalGross * 0.75%` |
| `pfEmployee` | `pfBase * 12%` |
| `esicEmployer` | `totalGross * 3.25%` |
| `pfEmployer` | `pfBase * 13%` |
| `netSalary` | `totalGrossEarning - totalDeduction` |
| `ctcPerMonth` | `totalGross + employer contributions` |

All percentages are configurable via `SalaryConfiguration`.

---

## API Routes

### `POST /api/uploads/r2`
Uploads branding assets (logo, stamp, signature) to Cloudflare R2.
- Accepts: `multipart/form-data` with `file` + `assetField` (`logoUrl` | `stampUrl` | `signUrl`)
- Validates: file type (PNG/JPG/WEBP/SVG), max 5MB
- Returns: `{ key, url }`
- Env vars needed: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`

---

## Environment Variables (`.env`)

```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Cloudflare R2 (server-side only)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
```

---

## User Roles & Permissions

| Role | Can Access |
|---|---|
| `admin` | Everything — employees, managers, payroll, salary, reports, settings |
| `manager` | Dashboard, employees (their team), attendance, leaves, salary slips, reports |
| `employee` | Dashboard, own profile, own attendance, own leaves, own salary slips, settings |

Login uses `userId` (e.g. `ADMIN123456`) or `employeeId` — not email directly.

---

## Mobile App (`EMS-Mobile/`)
Separate Expo/React Native app. Has its own `package.json`, `App.tsx`, and `src/` folder. Connects to the same Firebase backend. Not part of the Next.js build.

---

## Key Files to Edit for Common Tasks

| Task | File(s) to Edit |
|---|---|
| Change theme colors | `src/components/providers/ThemeProvider.tsx` |
| Add a new nav menu item | `src/components/layout/Sidebar.tsx` → `menuItems` object |
| Add a new page/route | Create `src/app/<route>/page.tsx` + component in `src/components/` |
| Change salary calculation | `src/components/salary/SalaryStructures.tsx` + `src/types/index.ts` |
| Change login logic | `src/contexts/AuthContext.tsx` → `login()` |
| Add a new data field to Employee | `src/types/index.ts` → `Employee` interface |
| Change payslip PDF layout | `src/components/salary/SalarySlips.tsx` |
| Change company branding upload | `src/app/api/uploads/r2/route.ts` + `src/components/settings/AdminCompanySettings.tsx` |
| Add Firebase indexes | `FIREBASE_INDEXES.md` (already documented) |
| Change role-based access | `src/components/auth/RouteGuard.tsx` + `src/components/layout/Sidebar.tsx` |
