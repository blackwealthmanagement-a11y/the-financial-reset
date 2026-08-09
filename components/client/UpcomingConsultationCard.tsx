'use client';

interface UpcomingConsultationCardProps {
  date: string;
  status: string;
  summary: string;
}

export function UpcomingConsultationCard({ date, status, summary }: UpcomingConsultationCardProps) {
  return (
    <section className="portal-card portal-card-navy">
      <div className="portal-card-header">
        <h3>Upcoming consultation</h3>
        <span className="portal-pill">{status}</span>
      </div>
      <p className="portal-card-copy"><strong>Date:</strong> {date}</p>
      <p className="portal-card-copy"><strong>Status:</strong> {status}</p>
      <p className="portal-card-copy"><strong>Summary:</strong> {summary}</p>
    </section>
  );
}
