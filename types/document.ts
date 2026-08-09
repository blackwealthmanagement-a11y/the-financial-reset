export type DocumentCategory = 'identity' | 'proof_of_address' | 'credit_report' | 'income' | 'tax' | 'banking' | 'business' | 'agreement' | 'other';

export type DocumentStatus = 'uploaded' | 'reviewed' | 'approved' | 'rejected' | 'archived';

export type DocumentRequirementCategory = 'identity' | 'proof_of_address' | 'credit_report' | 'business' | 'banking' | 'tax';

export interface ClientDocument {
  id: string;
  client_id: string;
  lead_id: string;
  storage_path?: string | null;
  file_name: string;
  original_file_name: string;
  mime_type: string;
  file_size: number;
  category: DocumentCategory;
  status: DocumentStatus;
  uploaded_by: 'client' | 'admin';
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientDocumentRequirement {
  id: string;
  client_id: string;
  lead_id: string;
  category: DocumentRequirementCategory;
  required: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentRequirementStatus {
  category: DocumentRequirementCategory;
  required: boolean;
  received: boolean;
  approved: boolean;
  rejected: boolean;
  status: DocumentStatus | 'missing' | 'received';
  latestDocument?: ClientDocument;
  rejectionReason?: string | null;
}

export interface DocumentUploadPayload {
  leadId?: string;
  clientId?: string;
  category: DocumentCategory;
  file: File;
}

export interface DocumentUploadResponse {
  ok: boolean;
  document: ClientDocument;
}
