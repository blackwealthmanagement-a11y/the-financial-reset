'use client';

interface ProgressCardProps {
  percent: number;
  programName: string;
  status: string;
  stage: string;
}

export function ProgressCard({ percent, programName, status, stage }: ProgressCardProps) {
  return (
    <section className="portal-card portal-card-gold">
      <div className="portal-card-header">
        <h3>Your progress</h3>
        <span className="portal-pill">{percent}% complete</span>
      </div>
      <p className="portal-card-copy"><strong>{programName}</strong></p>
      <p className="portal-card-copy">Status: {status}</p>
      <p className="portal-card-copy">Stage: {stage}</p>
      <div className="portal-progress-track" aria-hidden="true">
        <span style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
      </div>
    </section>
  );
}
