'use client';

interface AppointmentDetailsProps {
  event: {
    start_time: string;
    end_time: string;
    timezone: string;
    meeting_type: string;
    status: string;
    meeting_link: string | null;
    notes: string | null;
  } | null;
}

export function AppointmentDetails({ event }: AppointmentDetailsProps) {
  if (!event) {
    return (
      <div className="portal-card portal-card-navy">
        <h3>Upcoming appointment</h3>
        <p className="portal-card-copy">No upcoming consultation is scheduled.</p>
      </div>
    );
  }

  return (
    <div className="portal-card portal-card-gold">
      <div className="portal-card-header">
        <h3>Upcoming appointment</h3>
        <span className="portal-pill">{event.status}</span>
      </div>
      <p className="portal-card-copy"><strong>Date:</strong> {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
      <p className="portal-card-copy"><strong>Time:</strong> {new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {new Date(event.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
      <p className="portal-card-copy"><strong>Timezone:</strong> {event.timezone}</p>
      <p className="portal-card-copy"><strong>Meeting type:</strong> {event.meeting_type}</p>
      {event.meeting_link ? <p className="portal-card-copy"><strong>Meeting link:</strong> <a href={event.meeting_link} target="_blank" rel="noreferrer">Open link</a></p> : null}
      {event.notes ? <p className="portal-card-copy"><strong>Notes:</strong> {event.notes}</p> : null}
    </div>
  );
}
