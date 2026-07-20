import { browserSupabase } from '../lib/supabase/browser';
import type { Lead, LeadActivity, LeadNote } from '../types/crm';

export async function getLeads() {
  if (!browserSupabase) {
    return { data: [] as Lead[], error: null };
  }

  const { data, error } = await browserSupabase
    .from('intake_submissions')
    .select('id, full_name, email, phone, service_interest, preferred_contact_method, status, created_at, next_follow_up_date, lead_temperature')
    .order('created_at', { ascending: false });

  return { data: (data as Lead[]) || [], error };
}

export async function getLeadById(leadId: string) {
  if (!browserSupabase) {
    return { data: null as Lead | null, error: null };
  }

  const { data, error } = await browserSupabase.from('intake_submissions').select('*').eq('id', leadId).single();
  return { data: data as Lead | null, error };
}

export async function updateLeadStatus(leadId: string, status: string) {
  if (!browserSupabase) {
    return { error: new Error('Supabase unavailable') };
  }

  return browserSupabase.from('intake_submissions').update({ status }).eq('id', leadId);
}

export async function updateLeadFollowUp(leadId: string, payload: { next_follow_up_date?: string; lead_temperature?: string }) {
  if (!browserSupabase) {
    return { error: new Error('Supabase unavailable') };
  }

  return browserSupabase.from('intake_submissions').update(payload).eq('id', leadId);
}

export async function getLeadNotes(leadId: string) {
  if (!browserSupabase) {
    return { data: [] as LeadNote[], error: null };
  }

  const { data, error } = await browserSupabase
    .from('crm_lead_notes')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  return { data: (data as LeadNote[]) || [], error };
}

export async function addLeadNote(leadId: string, note: string) {
  if (!browserSupabase) {
    return { error: new Error('Supabase unavailable') };
  }

  return browserSupabase.from('crm_lead_notes').insert({ lead_id: leadId, note, created_by: 'admin' });
}

export async function getLeadActivity(leadId: string) {
  if (!browserSupabase) {
    return { data: [] as LeadActivity[], error: null };
  }

  const { data, error } = await browserSupabase
    .from('crm_lead_activity')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  return { data: (data as LeadActivity[]) || [], error };
}

export async function addLeadActivity(leadId: string, activityType: string, message: string) {
  if (!browserSupabase) {
    return { error: new Error('Supabase unavailable') };
  }

  return browserSupabase.from('crm_lead_activity').insert({ lead_id: leadId, activity_type: activityType, message, created_by: 'admin' });
}
