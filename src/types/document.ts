export interface Document {
  id: string;
  employeeId: string;
  name: string;
  type: 'resume' | 'id_proof' | 'address_proof' | 'education' | 'experience' | 'medical' | 'contract' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  expiryDate?: Date;
  isExpired: boolean;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  tags: string[];
  isConfidential: boolean;
  version: number;
  previousVersionId?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  templateUrl: string;
  fields: DocumentField[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'signature' | 'checkbox';
  required: boolean;
  placeholder?: string;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface DocumentRequest {
  id: string;
  employeeId: string;
  requestedBy: string;
  documentType: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  submittedAt?: Date;
  documentId?: string;
}