import { browserSupabase } from '../lib/supabase/browser';
import type { ClientProfile } from '../types/client';

export async function createClient(payload: { lead_id: string; auth_user_id?: string | null; program?: string | null; status?: string | null; onboarding_completed?: boolean }) {
  if (!browserSupabase) {
    return { data: null as ClientProfile | null, error: new Error('Supabase unavailable') };
  }

  const { data, error } = await browserSupabase
    .from('clients')
    .insert(payload)
    .select('*')
    .single();

  return { data: data as ClientProfile | null, error };
}

export async function getClient(clientId: string) {
  if (!browserSupabase) {
    return { data: null as ClientProfile | null, error: null };
  }

  const { data, error } = await browserSupabase.from('clients').select('*').eq('id', clientId).maybeSingle();
  return { data: data as ClientProfile | null, error };
}

export async function updateClient(clientId: string, payload: Partial<ClientProfile>) {
  if (!browserSupabase) {
    return { data: null as ClientProfile | null, error: new Error('Supabase unavailable') };
  }

  const { data, error } = await browserSupabase
    .from('clients')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', clientId)
    .select('*')
    .single();

  return { data: data as ClientProfile | null, error };
}

export async function findClientByAuthUser(authUserId: string) {
  if (!browserSupabase) {
    return { data: null as ClientProfile | null, error: null };
  }

  const { data, error } = await browserSupabase
    .from('clients')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  return { data: data as ClientProfile | null, error };
}

export async function findClientByLeadId(leadId: string) {
  if (!browserSupabase) {
    return { data: null as ClientProfile | null, error: null };
  }

  const { data, error } = await browserSupabase
    .from('clients')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle();

  return { data: data as ClientProfile | null, error };
}

export async function convertLeadToClient(leadId: string) {
  if (!browserSupabase) {
    return { data: null as ClientProfile | null, error: new Error('Supabase unavailable'), created: false };
  }

  const { data: existingLead, error: leadLookupError } = await browserSupabase
    .from('intake_submissions')
    .select('id')
    .eq('id', leadId)
    .maybeSingle();

  if (leadLookupError || !existingLead) {
    return { data: null, error: new Error('The lead could not be found.'), created: false };
  }

  const { data: existingClient, error: existingClientError } = await browserSupabase
    .from('clients')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle();

  if (existingClientError) {
    return { data: null, error: existingClientError, created: false };
  }

  if (existingClient) {
    return { data: existingClient as ClientProfile, error: null, created: false };
  }

  const { data, error } = await browserSupabase
    .from('clients')
    .insert({
      lead_id: leadId,
      auth_user_id: null,
      program: null,
      status: 'Active',
      onboarding_completed: false
    })
    .select('*')
    .single();

  return { data: data as ClientProfile | null, error, created: true };
}
