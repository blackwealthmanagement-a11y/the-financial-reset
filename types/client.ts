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
  clientName: string;
  programName: string;
  clientStatus: string;
  memberSince: string;
  progressPercent: number;
  progressStage: string;
  consultationDate: string;
  consultationStatus: string;
  consultationSummary: string;
  tasks: Array<{
    title: string;
    priority: string;
    dueDate: string;
    completed: boolean;
  }>;
  activity: Array<{
    title: string;
    detail: string;
    createdAt: string;
  }>;
  supportPhone: string;
  supportEmail: string;
  supportHours: string;
}
