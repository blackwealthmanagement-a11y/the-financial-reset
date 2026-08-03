export const CONSULTATION_STATUS = {
  NOT_BOOKED: 'Not Booked',
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
  CANCELLED: 'Cancelled',
} as const;

export const CONSULTATION_OUTCOME = {
  QUALIFIED: 'Qualified',
  FOLLOW_UP: 'Follow-up Needed',
  CLOSED: 'Closed',
  NOT_QUALIFIED: 'Not Qualified',
} as const;
