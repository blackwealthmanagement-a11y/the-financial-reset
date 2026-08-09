export type DocumentCategory = 'identity' | 'proof_of_address' | 'credit_report' | 'income' | 'tax' | 'banking' | 'business' | 'agreement' | 'other';

export type DocumentStatus = 'uploaded' | 'reviewed' | 'approved' | 'rejected' | 'archived';

export interface ClientDocument {
  id: string;
  client_id: string;
  lead_id: string;
  storage_path: string;
  file_name: string;
  original_file_name: string;
  mime_type: string;
  file_size: number;
  category: DocumentCategory;
  status: DocumentStatus;
  uploaded_by: 'client' | 'admin';
  created_at: string;
  updated_at: string;
}
