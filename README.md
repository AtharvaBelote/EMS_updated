# 🏢 Employee Management System (EMS)

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Material-UI](https://img.shields.io/badge/Material--UI-0081CB?style=for-the-badge&logo=material-ui)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)

</div>

A comprehensive, multi-tenant HR platform built with Next.js 15 (App Router), Material UI, Tailwind CSS, and Firebase. Features complete **data isolation between companies**, **hierarchical role-based access control**, advanced salary management with **skill-based calculations**, and comprehensive payroll processing.

---

## 🏗️ **System Architecture & Hierarchy**

```
🏢 COMPANY (Admin)
├── 👨‍💼 MANAGERS (Multiple)
│   ├── 👨‍💻 EMPLOYEES (Multiple)
│   ├── 👩‍💻 EMPLOYEES (Multiple)
│   └── �l‍💻 EMPLOYEES (Multiple)
└── 👨‍💼 MANAGERS (Multiple)
    ├── 👨‍💻 EMPLOYEES (Multiple)
    └── 👩‍💻 EMPLOYEES (Multiple)
```

### 🔒 **Multi-Tenant Data Isolation**
- **Complete Company Separation**: Admin A cannot see Admin B's data
- **Manager-Level Isolation**: Managers only see their assigned employees
- **Employee Privacy**: Employees only access their personal data
- **Secure by Design**: All queries filtered by `companyId` and role permissions

---

## ✨ **Key Features**

### 🔐 **Advanced Security & Access Control**
- **3-Tier Role-Based Access Control (RBAC)**: Admin, Manager, Employee
- **Multi-Tenant Architecture** with complete data isolation
- **Firebase Authentication** with secure login/logout
- **Route Protection** and component-level access control
- **Hierarchical Data Access** with proper filtering

### 👥 **Comprehensive Employee Management**
- **Complete CRUD Operations** for employee data
- **Manager Assignment System** (Admin assigns employees to managers)
- **Employee Profiles** with detailed information and custom fields
- **Bulk Import/Export** support for Excel files with smart parsing
- **Employee Registration Flow** with secure password setup

### 💰 **Advanced Salary Management**
- **Skill-Based Salary Calculation** with custom categories and amounts
- **Flexible Salary Components**: Basic, DA, HRA, Custom Allowances, Bonuses, Deductions
- **Configurable Calculation Parameters**: Adjustable percentages for HRA, ESIC, PF
- **Bulk Salary Operations** for mass updates
- **Excel Integration** with comprehensive sample templates
- **Advance Management** with automatic deductions

### ⏰ **Attendance & Leave Management**
- **Daily Attendance** tracking with check-in/check-out
- **Bulk Attendance** marking for managers
- **Attendance History** with detailed records
- **Leave Management** system (Admin and Employee access only)
- **Overtime Calculation** with single and double OT rates

### 💼 **Payroll & Financial Management**
- **Comprehensive Payroll Processing** with automatic calculations
- **Professional Tax Slabs** with automatic calculation
- **ESIC & PF Calculations** with configurable percentages
- **CTC Calculation** including employer contributions
- **PDF Salary Slip Generation** with detailed breakdowns
- **Tax Regime Support** (Old vs New tax structure)

### 📊 **Analytics & Reporting**
- **Role-Specific Dashboards** with relevant analytics
- **Company-Wide Statistics** for admins
- **Team Performance Metrics** for managers
- **Personal Analytics** for employees
- **Export Capabilities** (CSV/Excel/PDF)
- **Interactive Charts** powered by Recharts

---

## 🛠️ Tech Stack

<table>
<tr>
<td><strong>Frontend</strong></td>
<td>
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript" alt="TypeScript" />
</td>
</tr>
<tr>
<td><strong>UI Framework</strong></td>
<td>
  <img src="https://img.shields.io/badge/Material--UI-0081CB?style=flat-square&logo=material-ui" alt="Material-UI" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
</td>
</tr>
<tr>
<td><strong>Backend</strong></td>
<td>
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/Firestore-FFCA28?style=flat-square&logo=firebase&logoColor=black" alt="Firestore" />
</td>
</tr>
<tr>
<td><strong>Libraries</strong></td>
<td>React Hook Form • Yup • date-fns • jsPDF • xlsx • Recharts</td>
</tr>
</table>

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ 
- **npm** (or yarn)
- **Firebase Project** (free tier available)

### 1️⃣ Clone & Install
```bash
git clone https://github.com/AtharvaBelote/EMS_updated.git
cd EMS_updated
npm install
```

### 2️⃣ Environment Variables
Create `.env.local` at project root using `env.example` as reference:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3️⃣ Firebase Setup
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

### 4️⃣ Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> 💡 **Tip**: For detailed setup steps, see `SETUP.md`.

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | 🚀 Start Next.js dev server (with Turbopack) |
| `npm run build` | 🏗️ Build for production |
| `npm run start` | ▶️ Start production server |
| `npm run lint` | 🔍 Run ESLint |

---

## 📁 **Project Structure**

```text
src/
├─ app/                          # Next.js App Router (Route-based pages)
│  ├─ attendance/                # 👥 Attendance management (Admin/Manager)
│  ├─ company-registration/      # 🏢 Company registration flow
│  ├─ dashboard/                 # 📊 Role-aware dashboard entry point
│  ├─ documents/                 # 📄 Document management
│  ├─ employee-setup/            # 🔐 Employee password setup flow
│  ├─ employees/                 # 👨‍💻 Employee management (Admin/Manager)
│  ├─ history/                   # 📜 Audit trail and history
│  ├─ leave-management/          # 🏖️ Leave management (Admin/Employee only)
│  ├─ login/                     # 🔑 Authentication login
│  ├─ managers/                  # 👨‍💼 Manager management (Admin only)
│  ├─ onboarding/                # 🚀 Company onboarding wizard
│  ├─ payroll/                   # 💰 Payroll processing (Admin only)
│  ├─ performance/               # 📈 Performance management
│  ├─ profile/                   # 👤 User profile management
│  ├─ register/                  # 📝 Admin/Manager registration
│  ├─ reports/                   # 📊 Analytics and reports
│  ├─ salary/                    # 💵 Salary structure editor (Admin only)
│  ├─ salary-slips/              # 📄 Salary slip generation (Admin only)
│  ├─ salary-structure/          # 🏗️ Salary structure templates (Admin only)
│  └─ settings/                  # ⚙️ System settings
│
├─ components/                   # Reusable React Components
│  ├─ attendance/                # AttendanceManager, AttendanceTable
│  ├─ auth/                      # Login, Register, RouteGuard, EmployeeSetup
│  ├─ dashboard/                 # AdminDashboard, ManagerDashboard, EmployeeDashboard
│  ├─ employees/                 # EmployeeTable, EmployeeForm, EmployeeProfile
│  ├─ history/                   # AuditLog, HistoryViewer
│  ├─ layout/                    # Layout, Sidebar (with role-based navigation)
│  ├─ leave/                     # LeaveManagement, LeaveRequests
│  ├─ managers/                  # ManagerTable, ManagerForm
│  ├─ onboarding/                # OnboardingWizard, CompanySetup
│  ├─ payroll/                   # PayrollProcessing, PayrollTable
│  ├─ performance/               # PerformanceReviews, PerformanceMetrics
│  ├─ providers/                 # ThemeProvider, ClientOnly
│  ├─ reports/                   # ReportGenerator, Charts
│  ├─ salary/                    # SalaryStructures, SalarySlips
│  └─ settings/                  # EmployeeSettings, CompanySettings
│
├─ contexts/                     # React Context Providers
│  └─ AuthContext.tsx            # Authentication state and methods
│
├─ lib/                          # Utility Libraries
│  ├─ firebase.ts                # Firebase configuration (auth, db, storage)
│  └─ utils.ts                   # Helper functions (currency, dates, IDs)
│
└─ types/                        # TypeScript Type Definitions
   └─ index.ts                   # Core interfaces and types
```

### **🔐 Route Access Control**
```typescript
// Admin Only Routes
/salary, /payroll, /salary-slips, /salary-structure, /managers

// Admin + Manager Routes  
/employees, /attendance, /performance, /documents, /reports, /history

// Admin + Employee Routes
/leave-management

// All Roles
/dashboard, /profile, /settings

// Personal Routes (Employee)
/profile (own data only)
```

---

## 🔐 **Role-Based Access Control (RBAC)**

### **🔴 ADMIN (Company Owner)**
```typescript
Access Level: FULL COMPANY ACCESS
Data Scope: All data within their company (companyId = admin.uid)
```

**✅ Full Access:**
- Dashboard (Company-wide statistics)
- Employees (All company employees - CRUD operations)
- Managers (All company managers - CRUD operations)
- Attendance (All company attendance data)
- Performance (All company performance data)
- Documents (All company documents)
- **Salary Structures** (Complete salary management)
- **Payroll** (Payroll processing and approval)
- **Salary Slips** (All company salary slips)
- Reports (Company-wide reports)
- History (Complete audit trail)
- Settings (Company configuration)

### **🟡 MANAGER**
```typescript
Access Level: LIMITED COMPANY ACCESS
Data Scope: Only assigned employees + company-level read access
```

**✅ Limited Access:**
- Dashboard (Team statistics only)
- Employees (View all, manage assigned employees only)
- Attendance (Company attendance - read only)
- Performance (Assigned employees only)
- Documents (Company documents - read only)
- Reports (Limited team reports)
- History (Limited team history)

**❌ Restricted Access:**
- ~~Salary Structures~~ (Admin only)
- ~~Payroll~~ (Admin only)
- ~~Salary Slips~~ (Admin only)
- ~~Leave Management~~ (Admin/Employee only)
- ~~Manager Management~~ (Admin only)

### **🟢 EMPLOYEE**
```typescript
Access Level: PERSONAL DATA ONLY
Data Scope: Only their own data
```

**✅ Personal Access:**
- Dashboard (Personal statistics)
- Profile (Own profile management)
- My Leaves (Own leave requests)
- My Performance (Own performance data)
- My Documents (Own documents)
- Settings (Personal settings)

**❌ Restricted Access:**
- ~~Employees~~ (Cannot see other employees)
- ~~Managers~~ (Cannot see managers)
- ~~Attendance~~ (Cannot see others' attendance)
- ~~Salary/Payroll~~ (Cannot see salary data)
- ~~Reports~~ (Cannot see company reports)

---

## 🔄 **Registration & Assignment Flow**

### **1. Company Registration**
```typescript
Admin Self-Registration → Creates Company → Gets companyId = admin.uid
```

### **2. Manager Registration**
```typescript
Admin Only → Register Manager → Manager.companyId = admin.uid
```

### **3. Employee Registration**
```typescript
Admin Only → Register Employee → Employee.companyId = admin.uid
Admin → Assign to Manager → Employee.assignedManagers = [managerId]
```

### **4. Data Isolation Implementation**
```typescript
// Admin queries (full company access)
query(collection(db, 'employees'), where('companyId', '==', currentUser.uid))

// Manager queries (assigned employees only)
query(collection(db, 'employees'), where('assignedManagers', 'array-contains', managerId))

// Employee queries (personal data only)
query(collection(db, 'leaves'), where('employeeId', '==', currentUser.employeeId))
```

---

## 🛡️ **Security Features**

### ✅ **Multi-Tenant Data Isolation**
- **Company-Level Separation**: Complete data isolation between companies
- **Manager-Level Filtering**: Managers only see assigned employees
- **Employee-Level Privacy**: Personal data access only

### ✅ **Authentication & Authorization**
- Auth state provided by `AuthProvider` in `src/contexts/AuthContext.tsx`
- Login supports both `userId` and `employeeId` for flexible access
- Automatic `lastLoginAt` tracking and user metadata management
- Route-level protection with `RouteGuard` component
- Component-level conditional rendering based on roles

### ✅ **Database Security**
- All queries filtered by `companyId` and role permissions
- Firestore security rules enforce server-side access control
- Audit trail with user context and company isolation
- Secure password setup flow for new employees

---

## 🗄️ **Data Model Overview**

### **Core Entities** (Defined in `src/types/index.ts`)

#### **User Management**
```typescript
User: {
  uid: string;                    // Firebase Auth UID
  userId: string;                 // Login ID (Employee/Manager/Admin ID)
  email: string;
  role: 'admin' | 'manager' | 'employee';
  companyId?: string;             // Links to company (admin's uid)
  employeeId?: string;            // For employee role
  displayName?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  lastLoginAt: Date;
}
```

#### **Company Structure**
```typescript
Company: {
  companyName: string;
  email: string;                  // Admin email
  userId: string;                 // Auto-generated admin ID
  managers: string[];             // Array of manager IDs
  address: CompanyAddress;
  adminName: string;
  adminMobile: string;
  uid: string;                    // Firebase UID (companyId)
  industryType: string;
  createdAt: Date;
}

Manager: {
  id: string;
  managerId: string;              // Manager identification
  fullName: string;
  email: string;
  companyId: string;              // Links to company
  createdAt: Date;
  [key: string]: any;             // Dynamic custom fields
}
```

#### **Employee Management**
```typescript
Employee: {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  mobile: number;
  companyId: string;              // Company isolation
  assignedManagers: string[];     // Manager assignment
  esicNo?: string;
  uan?: string;
  
  salary: {
    // Basic Components
    basic: number;
    da: number;                   // Dearness Allowance
    hra?: number;                 // Auto-calculated (5% of Basic+DA)
    
    // Skill-Based Salary
    isSkillBased?: boolean;
    skillCategory?: string;       // 'skilled', 'semi-skilled', 'unskilled'
    skillAmount?: number;         // Fixed amount for skill category
    
    // Custom Components
    customAllowances?: Array<{label: string, amount: number}>;
    customBonuses?: Array<{label: string, amount: number}>;
    customDeductions?: Array<{label: string, amount: number}>;
    
    // Calculations
    totalGrossEarning?: number;
    netSalary?: number;
    ctcPerMonth?: number;         // Cost to Company
    
    // Configurable Parameters
    hraPercentage?: number;       // Default: 5%
    esicEmployeePercentage?: number; // Default: 0.75%
    pfEmployeePercentage?: number;   // Default: 12%
    
    // Working Days & Overtime
    totalDays?: number;
    paidDays?: number;
    singleOTHours?: number;
    doubleOTHours?: number;
    advance?: number;             // Advance deduction
  };
}
```

#### **Attendance & Payroll**
```typescript
Attendance: {
  id: string;
  employeeId: string;
  companyId: string;              // Company isolation
  date: Date;
  status: 'present' | 'absent' | 'late' | 'half-day';
  checkIn?: Date;
  checkOut?: Date;
  notes?: string;
}

Payroll: {
  id: string;
  employeeId: string;
  companyId: string;              // Company isolation
  month: number;
  year: number;
  baseSalary: number;
  totalGross: number;
  totalDeductions: number;
  netSalary: number;
  ctc: number;
  status: 'pending' | 'approved' | 'paid';
  processedAt: Date;
}
```

#### **Audit & Operations**
```typescript
AuditLog: {
  id: string;
  companyId: string;              // Company isolation
  action: string;
  userId: string;
  targetType: 'employee' | 'attendance' | 'payroll' | 'salary';
  targetId: string;
  changes?: Record<string, any>;
  timestamp: Date;
}
```

---

## 🔥 **Firebase Configuration & Security Rules**

### **Configuration** (`src/lib/firebase.ts`)
- Initializes Firebase app with environment variables
- Exposes `auth`, `db` (Firestore), and `storage`
- Environment variables must be present at build/runtime

### **Firestore Security Rules** (Production-Ready)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User can only access their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Company data - only admin can access
    match /companies/{companyId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == companyId;
    }
    
    // Employees - company-based access control
    match /employees/{employeeId} {
      allow read, write: if request.auth != null && (
        // Admin can access all employees in their company
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' &&
         resource.data.companyId == request.auth.uid) ||
        // Manager can access assigned employees
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager' &&
         resource.data.assignedManagers.hasAny([request.auth.uid])) ||
        // Employee can access only their own data
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'employee' &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.employeeId == employeeId)
      );
    }
    
    // Managers - only admin can manage
    match /managers/{managerId} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' &&
        resource.data.companyId == request.auth.uid;
    }
    
    // Attendance - company-based access
    match /attendance/{attendanceId} {
      allow read, write: if request.auth != null && (
        // Admin can access all company attendance
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' &&
         resource.data.companyId == request.auth.uid) ||
        // Manager can read all company attendance
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'manager' &&
         resource.data.companyId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId)
      );
    }
    
    // Payroll - admin only
    match /payroll/{payrollId} {
      allow read, write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' &&
        resource.data.companyId == request.auth.uid;
    }
    
    // Leave Management - admin and employee only
    match /leaves/{leaveId} {
      allow read, write: if request.auth != null && (
        // Admin can access all company leaves
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' &&
         resource.data.companyId == request.auth.uid) ||
        // Employee can access only their own leaves
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'employee' &&
         resource.data.employeeId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.employeeId)
      );
    }
  }
}
```

---

## 🎨 Styling & UI

- **Material UI** for components and theming (`ThemeProvider` in `components/providers/ThemeProvider.tsx`)
- **Tailwind CSS v4** for utility classes (`src/app/globals.css` + `tailwindcss` in dev deps)

---

## 📊 Reports & Export Features

- **PDF**: `jsPDF` + `jspdf-autotable` for salary slips
- **Excel/CSV**: `xlsx` for import/export
- **Charts**: `recharts`

---

## ⚡ Performance & Indexing

The app is optimized to run without composite indexes by simplifying queries and sorting/filtering on the client for typical datasets. For larger datasets, see `FIREBASE_INDEXES.md` for optional composite indexes to improve performance (attendance, payroll, audit logs).

---

## 💻 Development Guidelines

- TypeScript everywhere; avoid `any`
- Meaningful names and early returns; handle errors with useful messages
- Keep server-side authorization enforced via Firestore rules even if UI hides features by role
- Format currency/dates using helpers in `src/lib/utils.ts`

---

## 🔧 Troubleshooting

- Ensure env vars are set correctly and Firebase services are enabled
- Clear caches if build issues occur:
  - Delete `node_modules` and reinstall
  - Remove `.next` folder
  - Verify Node 18+
- Authentication errors often stem from incorrect email/password or disabled providers

See `SETUP.md` for more detailed steps and common fixes.

---

## 🚀 Deployment

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

## 🗺️ **Roadmap**

### **� Pohase 1: Core Enhancements**
- [ ] � Moabile responsiveness improvements
- [ ] �  Email notification system for payroll and leave approvals
- [ ] 🔔 Real-time notifications with Firebase Cloud Messaging
- [ ] � Adcvanced analytics dashboard with custom date ranges

### **🌟 Phase 2: Advanced Features**
- [ ] 🌐 Multi-language support (i18n)
- [ ] 🏦 Bank integration for salary disbursement
- [ ] 📈 Performance review workflows with manager approvals
- [ ] 🎯 Goal setting and tracking system

### **🔧 Phase 3: Integrations**
- [ ] 🔗 Accounting software integrations (QuickBooks, Tally)
- [ ] 📤 Bulk email system for salary slips
- [ ] 🤖 Automated backup and data export
- [ ] 📴 Offline support capabilities with sync

### **💡 Phase 4: AI & Automation**
- [ ] 🤖 AI-powered attendance anomaly detection
- [ ] 📊 Predictive analytics for employee retention
- [ ] 🎯 Automated performance insights
- [ ] 💬 Chatbot for common HR queries

### **🔒 Phase 5: Enterprise Features**
- [ ] 🏢 Multi-location support
- [ ] 👥 Department-wise organization structure
- [ ] 📋 Custom approval workflows
- [ ] 🔐 Advanced audit logging and compliance reports

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Atharva Belote**
- GitHub: [@AtharvaBelote](https://github.com/AtharvaBelote)

---

<div align="center">

**⭐ Star this repository if you found it helpful!**

</div>
