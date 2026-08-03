import { browserSupabase } from '../lib/supabase/browser';
import type { TaskRow } from '../types/task';

export async function getTasksForLead(leadId: string) {
  if (!browserSupabase) {
    return { data: [] as TaskRow[], error: null };
  }

  const { data, error } = await browserSupabase
    .from('crm_tasks')
    .select('*')
    .eq('lead_id', leadId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  return { data: (data as TaskRow[]) || [], error };
}

export async function getTasks() {
  if (!browserSupabase) {
    return { data: [] as TaskRow[], error: null };
  }

  const { data, error } = await browserSupabase
    .from('crm_tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  return { data: (data as TaskRow[]) || [], error };
}

export async function createTask(leadId: string, payload: Omit<TaskRow, 'id' | 'lead_id' | 'created_at' | 'completed_at' | 'completed'>) {
  if (!browserSupabase) {
    return { error: new Error('Supabase unavailable') };
  }

  return browserSupabase.from('crm_tasks').insert({ lead_id: leadId, ...payload });
}

export async function updateTask(taskId: string, payload: Partial<TaskRow>) {
  if (!browserSupabase) {
    return { error: new Error('Supabase unavailable') };
  }

  return browserSupabase.from('crm_tasks').update(payload).eq('id', taskId);
}

export async function deleteTask(taskId: string) {
  if (!browserSupabase) {
    return { error: new Error('Supabase unavailable') };
  }

  return browserSupabase.from('crm_tasks').delete().eq('id', taskId);
}
