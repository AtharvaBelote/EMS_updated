export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  reviewPeriod: {
    startDate: Date;
    endDate: Date;
  };
  type: 'annual' | 'quarterly' | 'monthly' | 'probation';
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  overallRating: number;
  goals: Goal[];
  competencies: CompetencyRating[];
  feedback: {
    strengths: string;
    areasForImprovement: string;
    achievements: string;
    developmentPlan: string;
  };
  employeeSelfAssessment?: {
    achievements: string;
    challenges: string;
    goals: string;
    feedback: string;
  };
  createdAt: Date;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'development' | 'behavioral' | 'project';
  targetDate: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  progress: number;
  rating?: number;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompetencyRating {
  competencyId: string;
  rating: number;
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