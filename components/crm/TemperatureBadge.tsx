import { LEAD_TEMPERATURE } from '../../lib/constants';

interface TemperatureBadgeProps {
  temperature?: string | null;
}

export function TemperatureBadge({ temperature }: TemperatureBadgeProps) {
  const normalized = (temperature || LEAD_TEMPERATURE.WARM).toLowerCase();
  let label = 'Warm';
  if (normalized === LEAD_TEMPERATURE.HOT) label = 'Hot';
  if (normalized === LEAD_TEMPERATURE.COLD) label = 'Cold';

  return <span className="crm-temp-pill">{label}</span>;
}
