import { browserSupabase } from '../lib/supabase/browser';

export interface PortalConsultationEvent {
  id: string;
  client_id: string;
  lead_id: string;
  start_time: string;
  end_time: string;
  timezone: string;
  meeting_type: string;
  status: string;
  meeting_link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function getPortalConsultations() {
  if (!browserSupabase) {
    return { data: [] as PortalConsultationEvent[], slots: [] as string[], error: null };
  }

  const session = (await browserSupabase.auth.getSession()).data.session;
  const response = await fetch('/api/portal/consultations', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session?.access_token || ''}`
    }
  });

  const json = await response.json();
  if (!response.ok) {
    return { data: [] as PortalConsultationEvent[], slots: [] as string[], error: new Error(json?.error || 'We could not load your consultations.') };
  }

  return {
    data: (json?.events as PortalConsultationEvent[]) || [],
    slots: (json?.availability_slots as string[]) || [],
    error: null
  };
}

export async function bookPortalConsultation(payload: {
  start_time: string;
  timezone?: string;
  meeting_type?: string;
  notes?: string | null;
}) {
  if (!browserSupabase) {
    return { data: null as PortalConsultationEvent | null, error: new Error('Supabase unavailable') };
  }

  const response = await fetch('/api/portal/consultations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${(await browserSupabase.auth.getSession()).data.session?.access_token || ''}`
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json();
  if (!response.ok) {
    return { data: null, error: new Error(json?.error || 'We could not book the consultation.') };
  }

  return { data: json?.event as PortalConsultationEvent | null, error: null };
}

export async function reschedulePortalConsultation(eventId: string, payload: {
  start_time: string;
  timezone?: string;
  meeting_type?: string;
  notes?: string | null;
}) {
  if (!browserSupabase) {
    return { data: null as PortalConsultationEvent | null, error: new Error('Supabase unavailable') };
  }

  const response = await fetch('/api/portal/consultations', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${(await browserSupabase.auth.getSession()).data.session?.access_token || ''}`
    },
    body: JSON.stringify({ eventId, ...payload })
  });

  const json = await response.json();
  if (!response.ok) {
    return { data: null, error: new Error(json?.error || 'We could not reschedule the consultation.') };
  }

  return { data: json?.event as PortalConsultationEvent | null, error: null };
}

export async function cancelPortalConsultation(eventId: string) {
  if (!browserSupabase) {
    return { data: null as PortalConsultationEvent | null, error: new Error('Supabase unavailable') };
  }

  const response = await fetch('/api/portal/consultations', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${(await browserSupabase.auth.getSession()).data.session?.access_token || ''}`
    },
    body: JSON.stringify({ eventId })
  });

  const json = await response.json();
  if (!response.ok) {
    return { data: null, error: new Error(json?.error || 'We could not cancel the consultation.') };
  }

  return { data: json?.event as PortalConsultationEvent | null, error: null };
}
