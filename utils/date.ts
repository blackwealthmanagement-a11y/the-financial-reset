export function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function getFollowUpState(
  value: string | null | undefined,
  status: string | null | undefined,
  referenceDate: Date = new Date()
) {
  if (!value) {
    return { isOverdue: false, label: 'No date set' };
  }

  const parsed = parseDate(value);
  if (!parsed) {
    return { isOverdue: false, label: 'Invalid date' };
  }

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const followUpDate = new Date(parsed);
  followUpDate.setHours(0, 0, 0, 0);

  return {
    isOverdue: followUpDate < today && (status || 'new') !== 'closed',
    label: followUpDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  };
}

export function isSameDay(value: string | null | undefined, referenceDate: Date = new Date()) {
  const parsed = parseDate(value);
  if (!parsed) return false;

  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(parsed);
  compareDate.setHours(0, 0, 0, 0);

  return compareDate.getTime() === today.getTime();
}

export function formatDate(value: string | null | undefined, fallback = '—') {
  const parsed = parseDate(value);
  if (!parsed) return fallback;
  return parsed.toLocaleDateString();
}

export function formatDateTime(value: string | null | undefined, fallback = '—') {
  const parsed = parseDate(value);
  if (!parsed) return fallback;
  return parsed.toLocaleString();
}
