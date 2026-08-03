interface DashboardMetricsProps {
  metrics: {
    new: number;
    contacted: number;
    consultation_scheduled: number;
    closed: number;
    consultations_today: number;
    upcoming_consultations: number;
    completed_this_month: number;
    no_shows: number;
  };
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <div className="crm-metrics-grid">
      <div className="crm-metric-card">
        <span>New leads</span>
        <strong>{metrics.new}</strong>
      </div>
      <div className="crm-metric-card">
        <span>Contacted</span>
        <strong>{metrics.contacted}</strong>
      </div>
      <div className="crm-metric-card">
        <span>Consultations scheduled</span>
        <strong>{metrics.consultation_scheduled}</strong>
      </div>
      <div className="crm-metric-card">
        <span>Closed</span>
        <strong>{metrics.closed}</strong>
      </div>
      <div className="crm-metric-card">
        <span>Consultations today</span>
        <strong>{metrics.consultations_today}</strong>
      </div>
      <div className="crm-metric-card">
        <span>Upcoming consultations</span>
        <strong>{metrics.upcoming_consultations}</strong>
      </div>
      <div className="crm-metric-card">
        <span>Completed this month</span>
        <strong>{metrics.completed_this_month}</strong>
      </div>
      <div className="crm-metric-card">
        <span>No shows</span>
        <strong>{metrics.no_shows}</strong>
      </div>
    </div>
  );
}
