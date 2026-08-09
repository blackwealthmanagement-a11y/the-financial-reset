import { browserSupabase } from '../lib/supabase/browser';
import type { ClientDocument } from '../types/document';

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

export async function getSignedDocumentUrl(storagePath: string) {
  if (!browserSupabase) {
    return { signedUrl: null as string | null, error: null as Error | null };
  }

  const { data: { session } } = await browserSupabase.auth.getSession();
  const response = await fetch(`/api/portal/documents?storagePath=${encodeURIComponent(storagePath)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session?.access_token || ''}`
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    return { signedUrl: null, error: new Error(payload?.error || 'We could not access the document.') };
  }

  return { signedUrl: payload?.signedUrl as string | null, error: null };
}
