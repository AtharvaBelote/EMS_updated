export interface User {
  uid: string;
  userId: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  employeeId?: string;
  companyId?: string;
  displayName?: string;
  status?: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  lastLoginAt: Date;
}

export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  mobile: number;
  companyId?: string;
  assignedManagers?: string[] | string;
  esicNo?: string;
  uan?: string;
  department?: string;
  joinDate?: any;
  joiningDate?: any;
  address?: string;
  salary: {
    basic: number;
    da: number;
    hra?: number;
    ta?: string | number;
    grossRatePM?: number;
    totalGrossEarning?: number;
    netSalary?: number;
    ctcPerMonth?: number;
    taxRegime?: 'old' | 'new';
    customAllowances?: { label: string; amount: number }[];
    [key: string]: any;
  };
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

export interface LeaveApplication {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  isHalfDay?: boolean;
  halfDayType?: 'first-half' | 'second-half';
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  maxDaysPerYear: number;
  carryForward: boolean;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'leave' | 'payroll' | 'attendance' | 'system' | 'announcement';
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

export interface SalarySlip {
  id: string;
  employeeId: string;
  payrollId: string;
  month: number;
  year: number;
  fileName?: string;
  pdfUrl?: string;
  generatedBy?: string;
  companyId?: string;
  employeeSnapshot?: {
    employeeId: string;
    fullName: string;
  };
  payrollSnapshot?: {
    baseSalary?: number;
    hra?: number;
    ta?: number;
    da?: number;
    totalBonus?: number;
    grossSalary?: number;
    totalDeduction?: number;
    netSalary?: number;
    taxAmount?: number;
    status?: string;
  };
  branding?: {
    selectedBrandingAssetId?: string;
    selectedManagerId?: string;
    logoUrl?: string;
    stampUrl?: string;
    signUrl?: string;
  };
  slipData?: {
    companyName: string;
    companyAddress: string;
    period: string;
    paidMode: string;
    logoUrl?: string;
    stampUrl?: string;
    signUrl?: string;
    details: { cells: string[] }[];
    attendance: { cells: string[] }[];
    earnings: { cells: string[] }[];
    deductions: { cells: string[] }[];
    netSalary: string;
  };
  generatedAt: Date;
}
