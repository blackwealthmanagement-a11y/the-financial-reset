import { browserSupabase } from '../lib/supabase/browser';
import type { ClientDocument, ClientDocumentRequirement, DocumentRequirementCategory, DocumentRequirementStatus, DocumentUploadPayload, DocumentUploadResponse } from '../types/document';

export async function getClientDocuments() {
  if (!browserSupabase) {
    return { data: [] as ClientDocument[], error: null as Error | null };
  }

  const { data: { session } } = await browserSupabase.auth.getSession();
  const response = await fetch('/api/portal/documents', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session?.access_token || ''}`
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    return { data: [], error: new Error(payload?.error || 'We could not load your documents.') };
  }

  return { data: (payload?.documents as ClientDocument[]) || [], error: null };
}

export async function getLeadDocuments(leadId: string) {
  if (!browserSupabase) {
    return { data: [] as ClientDocument[], error: null as Error | null };
  }

  const { data: { session } } = await browserSupabase.auth.getSession();
  const response = await fetch(`/api/crm/documents?leadId=${encodeURIComponent(leadId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session?.access_token || ''}`
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    return { data: [], error: new Error(payload?.error || 'We could not load the documents.') };
  }

  return { data: (payload?.documents as ClientDocument[]) || [], error: null };
}

export function getRequiredDocumentCategories(isBusinessCreditClient = false): DocumentRequirementCategory[] {
  const baseCategories: DocumentRequirementCategory[] = ['identity', 'proof_of_address', 'credit_report'];

  if (isBusinessCreditClient) {
    return [...baseCategories, 'business', 'banking', 'tax'];
  }

  return baseCategories;
}

export function buildRequirementStatuses(requirements: ClientDocumentRequirement[], documents: ClientDocument[]) {
  return requirements.map((requirement) => {
    const matchingDocuments = documents.filter((document) => document.category === requirement.category);
    const latestDocument = [...matchingDocuments].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0];

    let status: DocumentRequirementStatus['status'] = 'missing';
    let received = false;
    let approved = false;
    let rejected = false;

    if (matchingDocuments.length > 0) {
      received = true;
      approved = matchingDocuments.some((document) => document.status === 'approved');
      rejected = matchingDocuments.some((document) => document.status === 'rejected');
      status = approved ? 'approved' : rejected ? 'rejected' : 'received';
    }

    return {
      category: requirement.category,
      required: requirement.required,
      received,
      approved,
      rejected,
      status,
      latestDocument,
      rejectionReason: latestDocument?.status === 'rejected' ? latestDocument.rejection_reason ?? null : null
    } satisfies DocumentRequirementStatus;
  });
}

export async function getClientDocumentRequirements(clientId: string) {
  if (!browserSupabase) {
    return { data: [] as ClientDocumentRequirement[], error: null as Error | null };
  }

  const { data, error } = await browserSupabase.from('client_document_requirements').select('*').eq('client_id', clientId).order('created_at', { ascending: true });
  return { data: (data as ClientDocumentRequirement[]) || [], error };
}

export async function upsertClientDocumentRequirements(clientId: string, leadId: string, categories: DocumentRequirementCategory[]) {
  if (!browserSupabase) {
    return { data: [] as ClientDocumentRequirement[], error: null as Error | null };
  }

  const existing = await browserSupabase.from('client_document_requirements').select('*').eq('client_id', clientId);
  if (existing.error) {
    return { data: [], error: existing.error };
  }

  const currentCategories = new Set((existing.data || []).map((row: ClientDocumentRequirement) => row.category));
  const missingCategories = categories.filter((category) => !currentCategories.has(category));

  if (!missingCategories.length) {
    return { data: (existing.data as ClientDocumentRequirement[]) || [], error: null };
  }

  const rows = missingCategories.map((category) => ({ client_id: clientId, lead_id: leadId, category, required: true }));
  const { data, error } = await browserSupabase.from('client_document_requirements').insert(rows).select('*');
  return { data: (data as ClientDocumentRequirement[]) || [], error };
}

export async function updateDocumentStatus(documentId: string, payload: { status: ClientDocument['status']; rejection_reason?: string | null }) {
  if (!browserSupabase) {
    return { data: null as ClientDocument | null, error: new Error('Supabase unavailable') };
  }

  const { data, error } = await browserSupabase
    .from('client_documents')
    .update({ status: payload.status, rejection_reason: payload.rejection_reason ?? null, updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .select('*')
    .single();

  return { data: data as ClientDocument | null, error };
}

export async function getSignedDocumentUrl(documentId: string) {
  if (!browserSupabase) {
    return { signedUrl: null as string | null, error: null as Error | null };
  }

  const { data: { session } } = await browserSupabase.auth.getSession();
  if (!session?.access_token) {
    return { signedUrl: null, error: new Error('Permission denied.') };
  }

  const portalResponse = await fetch(`/api/portal/documents?documentId=${encodeURIComponent(documentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  const portalPayload = await portalResponse.json();
  if (portalResponse.ok && portalPayload?.signedUrl) {
    return { signedUrl: portalPayload.signedUrl as string | null, error: null };
  }

  const crmResponse = await fetch(`/api/crm/documents?documentId=${encodeURIComponent(documentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  const crmPayload = await crmResponse.json();
  if (!crmResponse.ok) {
    return { signedUrl: null, error: new Error(crmPayload?.error || portalPayload?.error || 'We could not access the document.') };
  }

  return { signedUrl: crmPayload?.signedUrl as string | null, error: null };
}

export async function uploadClientDocument(payload: DocumentUploadPayload) {
  if (!browserSupabase) {
    return { data: null as DocumentUploadResponse | null, error: new Error('Supabase unavailable') };
  }

  const { data: { session } } = await browserSupabase.auth.getSession();
  if (!session?.access_token) {
    return { data: null, error: new Error('Permission denied.') };
  }

  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('category', payload.category);

  const response = await fetch('/api/portal/documents/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`
    },
    body: formData
  });

  const json = await response.json();
  if (!response.ok) {
    return { data: null, error: new Error(json?.error || 'Upload failed.') };
  }

  return { data: json as DocumentUploadResponse, error: null };
}

export async function uploadLeadDocument(payload: DocumentUploadPayload) {
  if (!browserSupabase) {
    return { data: null as DocumentUploadResponse | null, error: new Error('Supabase unavailable') };
  }

  const { data: { session } } = await browserSupabase.auth.getSession();
  if (!session?.access_token) {
    return { data: null, error: new Error('Permission denied.') };
  }

  const formData = new FormData();
  formData.append('file', payload.file);
  formData.append('leadId', payload.leadId);
  formData.append('clientId', payload.clientId);
  formData.append('category', payload.category);

  const response = await fetch('/api/crm/documents/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`
    },
    body: formData
  });

  const json = await response.json();
  if (!response.ok) {
    return { data: null, error: new Error(json?.error || 'Upload failed.') };
  }

  return { data: json as DocumentUploadResponse, error: null };
}
