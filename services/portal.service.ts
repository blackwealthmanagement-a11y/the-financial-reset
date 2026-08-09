import { browserSupabase } from '../lib/supabase/browser';
import type { ClientUser, PortalDashboardData } from '../types/client';
import { findClientByAuthUser } from './client.service';

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
  const programName = clientProfile?.program || 'Financial Reset Program';
  const progressPercent = clientProfile?.onboarding_completed ? 100 : 45;

  return {
    welcomeMessage: 'Welcome back to your client portal.',
    programName,
    progressPercent,
    consultationTitle: 'Strategy Session',
    consultationDate: 'To be confirmed',
    consultationLocation: 'Virtual meeting',
    tasks: [
      { title: 'Review onboarding checklist', status: 'In progress' },
      { title: 'Confirm consultation preferences', status: 'Upcoming' }
    ],
    activity: [
      { title: 'Client profile synced', detail: 'Your portal profile is linked to your lead record.' },
      { title: 'Onboarding status updated', detail: clientProfile?.onboarding_completed ? 'Onboarding is complete.' : 'We are preparing your onboarding steps.' }
    ]
  };
}

function fallbackDashboardData(): PortalDashboardData {
  return {
    welcomeMessage: 'Welcome back to your client portal.',
    programName: 'Financial Reset Program',
    progressPercent: 45,
    consultationTitle: 'Strategy Session',
    consultationDate: 'To be confirmed',
    consultationLocation: 'Virtual meeting',
    tasks: [{ title: 'Review onboarding checklist', status: 'In progress' }],
    activity: [{ title: 'Portal ready', detail: 'Your profile will appear here once linked.' }]
  };
}
