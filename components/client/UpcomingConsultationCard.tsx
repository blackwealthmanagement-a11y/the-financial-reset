'use client';

interface UpcomingConsultationCardProps {
  title: string;
  date: string;
  location: string;
}

export function UpcomingConsultationCard({ title, date, location }: UpcomingConsultationCardProps) {
  return (
    <section className="portal-card portal-card-navy">
      <div className="portal-card-header">
        <h3>Upcoming consultation</h3>
        <span className="portal-pill">Scheduled</span>
      </div>
      <p className="portal-card-copy"><strong>{title}</strong></p>
      <p className="portal-card-copy">{date}</p>
      <p className="portal-card-copy">{location}</p>
    </section>
  );
}
