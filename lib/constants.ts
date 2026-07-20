export const LEAD_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  CONSULTATION: 'consultation_scheduled',
  IN_PROGRESS: 'in_progress',
  FOLLOW_UP: 'follow_up',
  CLOSED: 'closed',
  NOT_QUALIFIED: 'not_qualified'
} as const;

export const LEAD_TEMPERATURE = {
  HOT: 'hot',
  WARM: 'warm',
  COLD: 'cold'
} as const;

export const STATUS_OPTIONS = Object.values(LEAD_STATUS);
export const TEMPERATURE_OPTIONS = Object.values(LEAD_TEMPERATURE);
