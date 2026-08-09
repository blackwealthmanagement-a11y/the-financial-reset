import { browserSupabase } from '../lib/supabase/browser';

export interface ConsultationEventRow {
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

export interface CreateConsultationPayload {
  client_id: string;
  lead_id: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  meeting_type?: string;
  status?: string;
  meeting_link?: string | null;
  notes?: string | null;
}

export async function getConsultationEventsForLead(leadId: string) {
  if (!browserSupabase) {
    return { data: [] as ConsultationEventRow[], error: null };
  }

  const { data, error } = await browserSupabase
    .from('consultation_events')
    .select('*')
    .eq('lead_id', leadId)
    .order('start_time', { ascending: true });

  return { data: (data as ConsultationEventRow[]) || [], error };
}

export async function getConsultationEventsForClient(clientId: string) {
  if (!browserSupabase) {
    return { data: [] as ConsultationEventRow[], error: null };
  }

  const { data, error } = await browserSupabase
    .from('consultation_events')
    .select('*')
    .eq('client_id', clientId)
    .order('start_time', { ascending: true });

  return { data: (data as ConsultationEventRow[]) || [], error };
}

export async function createConsultationEvent(payload: CreateConsultationPayload) {
  if (!browserSupabase) {
    return { data: null as ConsultationEventRow | null, error: new Error('Supabase unavailable') };
  }

  const { data, error } = await browserSupabase
    .from('consultation_events')
    .insert(payload)
    .select('*')
    .single();

  return { data: data as ConsultationEventRow | null, error };
}

export async function updateConsultationEvent(eventId: string, payload: Partial<CreateConsultationPayload> & { updated_at?: string }) {
  if (!browserSupabase) {
    return { data: null as ConsultationEventRow | null, error: new Error('Supabase unavailable') };
  }

  const { data, error } = await browserSupabase
    .from('consultation_events')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select('*')
    .single();

  return { data: data as ConsultationEventRow | null, error };
}

export async function cancelConsultationEvent(eventId: string) {
  if (!browserSupabase) {
    return { data: null as ConsultationEventRow | null, error: new Error('Supabase unavailable') };
  }

  const { data, error } = await browserSupabase
    .from('consultation_events')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select('*')
    .single();

  return { data: data as ConsultationEventRow | null, error };
}
