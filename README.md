# Employee Management and Payroll System

A comprehensive HR platform built with Next.js 15 (App Router), Material UI, Tailwind CSS, and Firebase. It provides role-based access control, employee management, attendance tracking, salary structures, payroll processing, and reporting.

---

## Key Features

- **Authentication & RBAC**: Firebase Authentication with Admin, Manager, and Employee roles
- **Employee Management**: CRUD, profiles, salary structures, bulk import/export (CSV/Excel)
- **Attendance**: Daily tracking, bulk marking, history, and basic leave support
- **Payroll**: Tax regime selection (old/new), salary breakdowns, monthly processing, slip generation (PDF)
- **Dashboards**: Role-specific analytics and quick actions
- **Reports**: Export to CSV/Excel/PDF, charts with Recharts

---

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Material UI (MUI), Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Libraries**: React Hook Form, Yup, date-fns, jsPDF (+ autotable), xlsx, Recharts

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm (or yarn)
- A Firebase project

### 1) Clone & Install
```bash
git clone <repository-url>
cd my-app
npm install
```

### 2) Environment Variables
Create `.env.local` at project root using `env.example` as reference:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3) Firebase Setup
- Create a project in the Firebase Console (`https://console.firebase.google.com`)
- Enable Authentication (Email/Password)
- Create a Firestore database (start in test mode for development)
- Optional: Create Storage bucket (used for assets/documents)

Firestore rules (development-friendly example):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /{document=**} {
      allow read, write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager');
    }
  }
}
```

For production, harden the rules further according to your org’s needs.

### 4) Run Dev Server
```bash
npm run dev
```
Open `http://localhost:3000`.

For detailed setup steps, see `SETUP.md`.

---

## Scripts

Defined in `package.json`:
- `npm run dev`: Start Next.js dev server (Turbopack)
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

---

## Project Structure

```text
src/
├─ app/                       # Next.js App Router
│  ├─ attendance/             # Attendance page
│  ├─ company-registration/   # Company registration flow
│  ├─ dashboard/              # Role-aware dashboard entry
│  ├─ employee-setup/         # Employee password/setup
│  ├─ employees/              # Employee management
│  ├─ history/                # Audit/history
│  ├─ login/                  # Login
│  ├─ onboarding/             # Onboarding wizard
│  ├─ payroll/                # Payroll processing
│  ├─ profile/                # User profile
│  ├─ register/               # Admin/Manager registration
│  ├─ reports/                # Reports
│  ├─ salary/                 # Salary editor
│  ├─ salary-slips/           # Salary slips (PDF)
│  └─ salary-structure/       # Salary structures
├─ components/
│  ├─ attendance/             # AttendanceManager
│  ├─ auth/                   # Login/Register/Setup/Guards
│  ├─ dashboard/              # Admin/Manager/Employee dashboards
│  ├─ employees/              # Employee form/table/profile
│  ├─ history/                # History component
│  ├─ layout/                 # Layout + Sidebar
│  ├─ onboarding/             # Onboarding wizard
│  ├─ payroll/                # PayrollProcessing
│  ├─ providers/              # ThemeProvider, ClientOnly
│  ├─ reports/                # Reports
│  ├─ salary/                 # Slips + Structures
│  └─ settings/               # EmployeeSettings
├─ contexts/
│  └─ AuthContext.tsx         # Auth state, login/register, profile update
├─ lib/
│  ├─ firebase.ts             # Firebase app, auth, db, storage
│  └─ utils.ts                # Helpers (IDs, currency, dates, age)
└─ types/
   └─ index.ts                # Core TypeScript types
```

Common routes are mapped 1:1 to directories under `src/app`.

---

## Authentication & Authorization

- Auth state is provided by `AuthProvider` in `src/contexts/AuthContext.tsx` and wrapped in `src/app/layout.tsx` alongside theming providers.
- Login flow accepts a user identifier (supports `userId` or `employeeId`) and password, finds the Firestore user, then signs in with Firebase Auth using the stored email.
- On sign-in, `lastLoginAt` is updated; on registration, a corresponding `users/{uid}` doc is created with role and metadata.
- Roles: `admin`, `manager`, `employee`. Guards for UI sections are implemented in components (e.g., `auth/RouteGuard.tsx`) and should be reflected in Firestore rules for server-side enforcement.

---

## Data Model Overview

Defined in `src/types/index.ts` (selected interfaces):
- **User**: `uid`, `userId`, `email`, `role`, optional `employeeId`/`companyId`, `displayName`, timestamps
- **Company**: Company profile, subscription plan, status, timestamps
- **Employee**: Core fields, nested `salary` structure, and dynamic custom fields
- **Attendance**: `employeeId`, `date`, `status`, optional check-in/out, timestamps
- **SalaryStructure**: Named template with components (base/HRA/TA/DA, bonuses, deductions, regimen)
- **Payroll**: Monthly aggregates per employee with status and processed timestamps
- **SalarySlip**: Link to payroll record with optional `pdfUrl`
- **AuditLog** and **BulkOperation**: Tracking and operational metadata

---

## Firebase Initialization

Implemented in `src/lib/firebase.ts`:
- Initializes app with env vars
- Exposes `auth`, `db` (Firestore), and `storage`

Environment variables must be present at build/runtime. See `.env.local` example above and `env.example`.

---

## Styling & UI

- **Material UI** for components and theming (`ThemeProvider` in `components/providers/ThemeProvider.tsx`)
- **Tailwind CSS v4** for utility classes (`src/app/globals.css` + `tailwindcss` in dev deps)

---

## Reports, Exports, and PDFs

- **PDF**: `jsPDF` + `jspdf-autotable` for salary slips
- **Excel/CSV**: `xlsx` for import/export
- **Charts**: `recharts`

---

## Indexes and Query Strategy

The app is optimized to run without composite indexes by simplifying queries and sorting/filtering on the client for typical datasets. For larger datasets, see `FIREBASE_INDEXES.md` for optional composite indexes to improve performance (attendance, payroll, audit logs).

---

## Development Conventions

- TypeScript everywhere; avoid `any`
- Meaningful names and early returns; handle errors with useful messages
- Keep server-side authorization enforced via Firestore rules even if UI hides features by role
- Format currency/dates using helpers in `src/lib/utils.ts`

---

## Troubleshooting

- Ensure env vars are set correctly and Firebase services are enabled
- Clear caches if build issues occur:
  - Delete `node_modules` and reinstall
  - Remove `.next` folder
  - Verify Node 18+
- Authentication errors often stem from incorrect email/password or disabled providers

See `SETUP.md` for more detailed steps and common fixes.

---

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import repo into Vercel
3. Configure env vars in Vercel Project Settings
4. Deploy

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

---

## Roadmap Ideas
- Mobile responsiveness refinements
- Email notifications
- Advanced reporting and analytics
- Multi-language support
- Accounting software integrations
- Offline support

---

## License
MIT
#   E M S _ u p d a t e d  
 #   E M S _ u p d a t e d  
 #   E M S _ u p d a t e d  
 