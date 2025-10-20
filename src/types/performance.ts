// Rating type: Descriptive ratings
export type PerformanceRating = 'Excellent' | 'Good' | 'Average' | 'Needs Improvement' | 'Poor';

// Performance categories
export interface PerformanceCategory {
  id: string;
  name: string;
  description: string;
  rating: PerformanceRating;
  comments?: string;
}

// Annual Performance Review
export interface AnnualReview {
  id: string;
  employeeId: string;
  employeeName: string;
  reviewerId: string;
  reviewerName: string;
  reviewYear: number;
  reviewPeriod: {
    startDate: Date;
    endDate: Date;
  };
  status: 'draft' | 'submitted' | 'completed';
  categories: PerformanceCategory[];
  overallRating: PerformanceRating;
  strengths: string;
  areasForImprovement: string;
  achievements: string;
  recommendations: string;
  createdAt: Date;
  submittedAt?: Date;
  completedAt?: Date;
}

// Daily Performance Tracking
export interface DailyPerformance {
  id: string;
  employeeId: string;
  employeeName: string;
  trackerId: string;
  trackerName: string;
  date: Date;
  attendance: 'Present' | 'Absent' | 'Half Day' | 'Late';
  punctuality: PerformanceRating;
  productivity: PerformanceRating;
  quality: PerformanceRating;
  behavior: PerformanceRating;
  tasksCompleted: number;
  notes?: string;
  createdAt: Date;
}

// Performance Statistics for Dashboard
export interface PerformanceStats {
  employeeId: string;
  totalReviews: number;
  averageRating: string;
  lastReviewDate?: Date;
  dailyTrackingCount: number;
  attendancePercentage: number;
  performanceTrend: 'Improving' | 'Stable' | 'Declining';
}

export interface CompetencyRating {
  competencyId: string;
  rating: PerformanceRating;
  comments?: string;
}

export interface Competency {
  id: string;
  name: string;
  description: string;
  category: string;
  levels: CompetencyLevel[];
  isActive: boolean;
  createdAt: Date;
}

export interface CompetencyLevel {
  level: number;
  name: string;
  description: string;
  behaviors: string[];
}

export interface FeedbackRequest {
  id: string;
  employeeId: string;
  requesterId: string;
  feedbackProviderId: string;
  type: '360' | 'peer' | 'upward' | 'customer';
  questions: FeedbackQuestion[];
  responses?: FeedbackResponse[];
  status: 'pending' | 'completed' | 'expired';
  dueDate: Date;
  createdAt: Date;
  completedAt?: Date;
}

export interface FeedbackQuestion {
  id: string;
  question: string;
  type: 'rating' | 'text' | 'multiple_choice';
  required: boolean;
  options?: string[];
}

export interface FeedbackResponse {
  questionId: string;
  response: any;
  comments?: string;
}