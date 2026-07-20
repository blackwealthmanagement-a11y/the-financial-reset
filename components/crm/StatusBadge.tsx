import { LEAD_STATUS } from '../../lib/constants';

interface StatusBadgeProps {
  status?: string | null;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status || LEAD_STATUS.NEW;
  return <span className="crm-status-pill">{normalized.replace(/_/g, ' ')}</span>;
}
