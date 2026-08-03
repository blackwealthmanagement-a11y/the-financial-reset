import { LEAD_STATUS, LEAD_TEMPERATURE } from '../lib/constants';

export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];
export type LeadTemperature = (typeof LEAD_TEMPERATURE)[keyof typeof LEAD_TEMPERATURE];

export interface Lead {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  service_interest: string | null;
  estimated_credit_score: string | null;
  financial_goal: string | null;
  credit_challenge: string | null;
  preferred_contact_method: string | null;
  best_contact_time: string | null;
  status: LeadStatus | string | null;
  created_at: string | null;
  next_follow_up_date: string | null;
  lead_temperature: LeadTemperature | string | null;
  consultation_status: string | null;
  consultation_date: string | null;
  consultation_outcome: string | null;
  consultation_summary: string | null;
}

export interface LeadNote {
  id: string;
  note: string;
  created_at: string;
  created_by: string | null;
}

export interface LeadActivity {
  id: string;
  activity_type: string;
  message: string;
  created_at: string;
  created_by: string | null;
}
