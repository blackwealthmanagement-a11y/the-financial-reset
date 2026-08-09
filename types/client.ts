export interface ClientUser {
  id: string;
  email: string | null;
  name: string | null;
}

export interface ClientProfile {
  id: string;
  lead_id: string;
  auth_user_id: string | null;
  program: string | null;
  status: string | null;
  onboarding_completed: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PortalDashboardData {
  welcomeMessage: string;
  programName: string;
  progressPercent: number;
  consultationTitle: string;
  consultationDate: string;
  consultationLocation: string;
  tasks: Array<{
    title: string;
    status: string;
  }>;
  activity: Array<{
    title: string;
    detail: string;
  }>;
}
