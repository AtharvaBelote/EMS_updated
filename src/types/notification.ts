export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'leave' | 'payroll' | 'attendance' | 'system' | 'announcement';
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  categories: {
    leave: boolean;
    payroll: boolean;
    attendance: boolean;
    system: boolean;
    announcement: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  updatedAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}