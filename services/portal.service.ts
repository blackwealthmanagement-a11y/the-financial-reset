import { browserSupabase } from '../lib/supabase/browser';
import type { ClientUser, PortalDashboardData } from '../types/client';
import { findClientByAuthUser } from './client.service';
import { getTasksForLead } from './task.service';

function formatDisplayDate(value: string | null | undefined) {
  if (!value) {
    return 'Not scheduled';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not scheduled';
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatDisplayDateTime(value: string | null | undefined) {
  if (!value) {
    return 'No timestamp';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'No timestamp';
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getProgressStage(clientStatus: string | null | undefined, onboardingCompleted: boolean | null | undefined) {
  if (onboardingCompleted) {
    return 'Completed';
  }

  const normalized = (clientStatus || '').toLowerCase();
  if (normalized === 'active') {
    return 'Active';
  }

  if (normalized === 'onboarding' || normalized === 'in_progress' || normalized === 'in progress') {
    return 'Onboarding';
  }

  return 'Invited';
}

function getProgressPercent(clientStatus: string | null | undefined, onboardingCompleted: boolean | null | undefined) {
  if (onboardingCompleted) {
    return 100;
  }

  const normalized = (clientStatus || '').toLowerCase();
  if (normalized === 'active') {
    return 75;
  }

  if (normalized === 'onboarding' || normalized === 'in_progress' || normalized === 'in progress') {
    return 50;
  }

  return 25;
}

export async function getClientSessionUser() {
  if (!browserSupabase) {
    return { data: null as ClientUser | null, error: null };
  }

  const { data: { user }, error } = await browserSupabase.auth.getUser();
  if (error || !user) {
    return { data: null, error };
  }

  return {
    data: {
      id: user.id,
      email: user.email || null,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null
    } satisfies ClientUser,
    error: null
  };
}

export async function getPortalDashboardData(): Promise<PortalDashboardData> {
  if (!browserSupabase) {
    return fallbackDashboardData();
  }

  const { data: { user } } = await browserSupabase.auth.getUser();
  if (!user) {
    return fallbackDashboardData();
  }

  const { data: clientProfile } = await findClientByAuthUser(user.id);
  if (!clientProfile?.lead_id) {
    return fallbackDashboardData();
  }

  const [{ data: leadData }, { data: taskData }, { data: activityData }] = await Promise.all([
    browserSupabase
      .from('intake_submissions')
      .select('id, full_name, consultation_date, consultation_status, consultation_summary, status, created_at')
      .eq('id', clientProfile.lead_id)
      .maybeSingle(),
    getTasksForLead(clientProfile.lead_id),
    browserSupabase
      .from('crm_lead_activity')
      .select('id, activity_type, message, created_at')
      .eq('lead_id', clientProfile.lead_id)
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  const leadRecord = leadData as {
    full_name?: string | null;
    consultation_date?: string | null;
    consultation_status?: string | null;
    consultation_summary?: string | null;
    status?: string | null;
    created_at?: string | null;
  } | null;

  const tasks = (taskData || [])
    .slice()
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
      }

      const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    })
    .map((task) => ({
      title: task.title || 'Untitled task',
      priority: task.priority || 'Medium',
      dueDate: task.due_date ? formatDisplayDate(task.due_date) : 'No due date',
      completed: Boolean(task.completed)
    }));

  const activity = (activityData || [])
    .map((item: { activity_type?: string | null; message?: string | null; created_at?: string | null }) => ({
      title: item.activity_type || 'Activity',
      detail: item.message || 'No details available.',
      createdAt: formatDisplayDateTime(item.created_at)
    }));

  const clientStatus = clientProfile.status || leadRecord?.status || 'Active';
  const programName = clientProfile.program || 'Financial Reset Program';
  const progressStage = getProgressStage(clientStatus, clientProfile.onboarding_completed);
  const progressPercent = getProgressPercent(clientStatus, clientProfile.onboarding_completed);
  const clientName = leadRecord?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Client';

  return {
    welcomeMessage: 'Welcome back to your client portal.',
    clientName,
    programName,
    clientStatus: clientStatus || 'Active',
    memberSince: formatDisplayDate(clientProfile.created_at || leadRecord?.created_at),
    progressPercent,
    progressStage,
    consultationDate: formatDisplayDate(leadRecord?.consultation_date),
    consultationStatus: leadRecord?.consultation_status || 'Not scheduled',
    consultationSummary: leadRecord?.consultation_summary || 'Your consultation has not been scheduled.',
    tasks: tasks.length > 0 ? tasks : [{ title: 'No active tasks.', priority: 'Low', dueDate: 'N/A', completed: false }],
    activity: activity.length > 0 ? activity : [{ title: 'Portal ready', detail: 'Your activity will appear here once your lead record updates.', createdAt: 'Just now' }],
    supportPhone: process.env.NEXT_PUBLIC_PORTAL_SUPPORT_PHONE || '(470) 661-2258',
    supportEmail: process.env.NEXT_PUBLIC_PORTAL_SUPPORT_EMAIL || 'blackwealthmanagement@gmail.com',
    supportHours: process.env.NEXT_PUBLIC_PORTAL_SUPPORT_HOURS || 'Mon–Fri 9am–5pm'
  };
}

function fallbackDashboardData(): PortalDashboardData {
  return {
    welcomeMessage: 'Welcome back to your client portal.',
    clientName: 'Client',
    programName: 'Financial Reset Program',
    clientStatus: 'Active',
    memberSince: 'Not available',
    progressPercent: 25,
    progressStage: 'Invited',
    consultationDate: 'Not scheduled',
    consultationStatus: 'Not scheduled',
    consultationSummary: 'Your consultation has not been scheduled.',
    tasks: [{ title: 'No active tasks.', priority: 'Low', dueDate: 'N/A', completed: false }],
    activity: [{ title: 'Portal ready', detail: 'Your activity will appear here once your lead record updates.', createdAt: 'Just now' }],
    supportPhone: process.env.NEXT_PUBLIC_PORTAL_SUPPORT_PHONE || '(470) 661-2258',
    supportEmail: process.env.NEXT_PUBLIC_PORTAL_SUPPORT_EMAIL || 'blackwealthmanagement@gmail.com',
    supportHours: process.env.NEXT_PUBLIC_PORTAL_SUPPORT_HOURS || 'Mon–Fri 9am–5pm'
  };
}
