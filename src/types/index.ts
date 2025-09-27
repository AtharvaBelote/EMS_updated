export interface User {
  uid: string;
  userId: string; // ID for login (Employee ID, Manager ID, or Admin ID)
  email: string;
  role: 'admin' | 'manager' | 'employee';
  employeeId?: string;
  companyId?: string;
  displayName: string;
  status?: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  lastLoginAt: Date;
  updatedAt?: Date;
}

export interface Company {
  id: string;
  companyName: string;
  companyEmail: string;
  phoneNumber: string;
  industryType: string;
  domain: string;
  logoUrl?: string;
  status: 'active' | 'inactive' | 'suspended';
  subscription: {
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    startDate: Date;
    endDate: Date;
    features: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  mobile: number;
  salary: {
    base: string;
    hra?: string;
    ta?: string;
    da?: string;
    bonuses?: Record<string, any>;
    customDeductions?: Record<string, any>;
    deductions?: Record<string, any>;
    taxRegime?: 'old' | 'new';
  };
  // Dynamic fields - can be added by users
  [key: string]: any;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: Date;
  status: 'present' | 'absent' | 'late' | 'half-day';
  checkIn?: Date;
  checkOut?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalaryStructure {
  id: string;
  name: string;
  baseSalary: number;
  hra: number;
  ta: number;
  da: number;
  bonuses: {
    performance?: number;
    attendance?: number;
    special?: number;
    [key: string]: number | undefined;
  };
  deductions: {
    pf?: number;
    tax?: number;
    insurance?: number;
    [key: string]: number | undefined;
  };
  taxRegime: 'old' | 'new';
  createdAt: Date;
  updatedAt: Date;
}

export interface Payroll {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  hra: number;
  ta: number;
  da: number;
  totalBonus: number;
  totalDeduction: number;
  grossSalary: number;
  netSalary: number;
  taxAmount: number;
  status: 'pending' | 'approved' | 'paid';
  processedAt: Date;
  paidAt?: Date;
}

export interface SalarySlip {
  id: string;
  employeeId: string;
  payrollId: string;
  month: number;
  year: number;
  pdfUrl?: string;
  generatedAt: Date;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  targetType: 'employee' | 'attendance' | 'payroll' | 'salary';
  targetId: string;
  changes?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
}

export interface BulkOperation {
  id: string;
  type: 'import' | 'export' | 'update' | 'delete';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  fileUrl?: string;
  errors?: string[];
  startedAt: Date;
  completedAt?: Date;
  createdBy: string;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select';
  required: boolean;
  options?: string[]; // For select type
  defaultValue?: any;
  order: number;
  createdAt: Date;
}

export interface TableColumn {
  id: string;
  field: string;
  headerName: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  order: number;
  isAutoDetected?: boolean;
  isCustom?: boolean;
}

// Re-export types from other modules
export * from './leave';
export * from './notification';
export * from './document';
export * from './performance'; 