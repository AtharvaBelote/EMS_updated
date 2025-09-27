export interface LeaveType {
  id: string;
  name: string;
  code: string;
  maxDaysPerYear: number;
  carryForward: boolean;
  maxCarryForwardDays?: number;
  isActive: boolean;
  color: string;
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
  carriedForward: number;
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
  attachments?: string[];
  isHalfDay?: boolean;
  halfDayType?: 'first-half' | 'second-half';
}

export interface Holiday {
  id: string;
  name: string;
  date: Date;
  type: 'national' | 'regional' | 'company';
  isOptional: boolean;
  description?: string;
  createdAt: Date;
}