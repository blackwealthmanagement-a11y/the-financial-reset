import { browserSupabase } from '../lib/supabase/browser';
import type { ClientDocument, DocumentUploadPayload, DocumentUploadResponse } from '../types/document';

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
