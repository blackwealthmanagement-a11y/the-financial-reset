import Link from 'next/link';
import type { Lead } from '../../types/crm';
import { isSameDay } from '../../utils/date';

interface FollowUpWidgetProps {
  rows: Lead[];
}

export function FollowUpWidget({ rows }: FollowUpWidgetProps) {
  const todayFollowUps = rows.filter((row) => isSameDay(row.next_follow_up_date));

  return (
    <div className="crm-widget-card">
      <div className="crm-widget-header">
        <div className="eyebrow">Today's follow-ups</div>
        <h3>Scheduled for today</h3>
      </div>
      {todayFollowUps.length === 0 ? (
        <p className="crm-widget-copy">No follow-ups are scheduled for today.</p>
      ) : (
        <ul className="crm-widget-list">
          {todayFollowUps.map((row) => (
            <li key={row.id}>
              <Link href={`/crm/leads/${row.id}`} className="crm-link">
                {row.full_name || 'Unnamed lead'}
              </Link>
              <span>{row.email || '—'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
