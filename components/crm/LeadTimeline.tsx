import type { LeadActivity } from '../../types/crm';

interface LeadTimelineProps {
  activity: LeadActivity[];
}

export function LeadTimeline({ activity }: LeadTimelineProps) {
  return (
    <div className="crm-field-card full-card">
      <h3>Recent activity timeline</h3>
      <div className="crm-timeline">
        {activity.length === 0 ? (
          <p className="crm-widget-copy">No activity yet.</p>
        ) : (
          activity.map((item) => (
            <div key={item.id} className="crm-timeline-item">
              <div className="crm-timeline-marker" />
              <div>
                <p><strong>{item.message}</strong></p>
                <span>{new Date(item.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
