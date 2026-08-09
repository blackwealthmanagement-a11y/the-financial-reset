'use client';

interface ProgressCardProps {
  percent: number;
  programName: string;
}

export function ProgressCard({ percent, programName }: ProgressCardProps) {
  return (
    <section className="portal-card portal-card-gold">
      <div className="portal-card-header">
        <h3>Your progress</h3>
        <span className="portal-pill">{percent}% complete</span>
      </div>
      <p className="portal-card-copy">{programName}</p>
      <div className="portal-progress-track" aria-hidden="true">
        <span style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
      </div>
    </section>
  );
}
