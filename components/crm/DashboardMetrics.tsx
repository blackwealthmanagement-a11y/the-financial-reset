interface DashboardMetricsProps {
  metrics: {
    new: number;
    contacted: number;
    consultation_scheduled: number;
    closed: number;
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
    </div>
  );
}
