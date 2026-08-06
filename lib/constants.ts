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

export const PIPELINE_STATUSES = [
  LEAD_STATUS.NEW,
  LEAD_STATUS.CONTACTED,
  LEAD_STATUS.CONSULTATION,
  LEAD_STATUS.IN_PROGRESS,
  LEAD_STATUS.FOLLOW_UP,
  LEAD_STATUS.CLOSED,
  LEAD_STATUS.NOT_QUALIFIED
] as const;

export const PIPELINE_STATUS_LABELS = {
  [LEAD_STATUS.NEW]: 'New',
  [LEAD_STATUS.CONTACTED]: 'Contacted',
  [LEAD_STATUS.CONSULTATION]: 'Consultation Scheduled',
  [LEAD_STATUS.IN_PROGRESS]: 'In Progress',
  [LEAD_STATUS.FOLLOW_UP]: 'Follow-Up',
  [LEAD_STATUS.CLOSED]: 'Closed',
  [LEAD_STATUS.NOT_QUALIFIED]: 'Not Qualified'
} as const;

export const STATUS_OPTIONS = Object.values(LEAD_STATUS);
export const TEMPERATURE_OPTIONS = Object.values(LEAD_TEMPERATURE);
