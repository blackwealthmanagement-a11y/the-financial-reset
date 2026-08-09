'use client';

import { useEffect, useState } from 'react';
import { AppointmentDetails } from './AppointmentDetails';
import { BookingForm } from './BookingForm';

interface SchedulingCardProps {
  event: {
    id: string;
    start_time: string;
    end_time: string;
    timezone: string;
    meeting_type: string;
    status: string;
    meeting_link: string | null;
    notes: string | null;
  } | null;
  onBook: (payload: { start_time: string; timezone?: string; meeting_type?: string; notes?: string | null }) => Promise<boolean>;
  onReschedule: (eventId: string, payload: { start_time: string; timezone?: string; meeting_type?: string; notes?: string | null }) => Promise<boolean>;
  onCancel: (eventId: string) => Promise<boolean>;
  submitting: boolean;
  message: string | null;
  error: string | null;
  availabilitySlots: string[];
}

export function SchedulingCard({ event, onBook, onReschedule, onCancel, submitting, message, error, availabilitySlots }: SchedulingCardProps) {
  const [selectedSlot, setSelectedSlot] = useState('');

  useEffect(() => {
    if (!availabilitySlots.length) {
      setSelectedSlot('');
      return;
    }

    setSelectedSlot((current) => (current && availabilitySlots.includes(current) ? current : availabilitySlots[0]));
  }, [availabilitySlots]);

  return (
    <section className="portal-card portal-card-navy">
      <div className="portal-card-header">
        <h3>Consultation scheduling</h3>
        <span className="portal-pill">Self-service</span>
      </div>
      {message ? <p className="status-banner">{message}</p> : null}
      {error ? <p className="status-banner error">{error}</p> : null}
      <div className="portal-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <AppointmentDetails event={event} />
        <div className="portal-card portal-card-gold">
          <h3>Book or change</h3>
          <BookingForm onSubmit={onBook} submitting={submitting} slots={availabilitySlots} selectedSlot={selectedSlot} onSlotChange={setSelectedSlot} submitLabel={event ? 'Book new consultation' : 'Book Consultation'} />
          {event ? (
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              <button type="button" className="button secondary" onClick={() => {
                if (selectedSlot) {
                  void onReschedule(event.id, { start_time: selectedSlot, timezone: event.timezone, meeting_type: event.meeting_type, notes: event.notes });
                }
              }} disabled={submitting || !selectedSlot || !availabilitySlots.length}>
                Reschedule
              </button>
              <button type="button" className="button secondary" onClick={() => {
                if (window.confirm('Cancel this consultation?')) {
                  void onCancel(event.id);
                }
              }} disabled={submitting}>
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
