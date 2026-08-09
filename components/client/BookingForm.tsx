'use client';

import { useEffect, useState } from 'react';

interface BookingFormProps {
  onSubmit: (payload: { start_time: string; timezone?: string; meeting_type?: string; notes?: string | null }) => Promise<boolean>;
  submitting: boolean;
  defaultTimezone?: string;
  slots: string[];
  emptyMessage?: string;
  submitLabel?: string;
  selectedSlot: string;
  onSlotChange: (slot: string) => void;
}

function formatSlotLabel(slot: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  }).format(new Date(slot));
}

export function BookingForm({ onSubmit, submitting, defaultTimezone = 'America/New_York', slots, emptyMessage = 'No consultation slots are available right now.', submitLabel = 'Book Consultation', selectedSlot, onSlotChange }: BookingFormProps) {
  const [meetingType, setMeetingType] = useState('consultation');
  const [notes, setNotes] = useState('');
  const [timezone, setTimezone] = useState(defaultTimezone);

  useEffect(() => {
    setTimezone(defaultTimezone);
  }, [defaultTimezone]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) {
      return;
    }

    await onSubmit({
      start_time: selectedSlot,
      timezone,
      meeting_type: meetingType,
      notes: notes || null
    });
  }

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Select appointment time</span>
        <select value={selectedSlot} onChange={(event) => onSlotChange(event.target.value)} required disabled={!slots.length}>
          {slots.length ? slots.map((slot) => (
            <option key={slot} value={slot}>
              {formatSlotLabel(slot)}
            </option>
          )) : <option value="">{emptyMessage}</option>}
        </select>
      </label>
      <label className="field">
        <span>Meeting type</span>
        <select value={meetingType} onChange={(event) => setMeetingType(event.target.value)}>
          <option value="consultation">Consultation</option>
          <option value="follow_up">Follow-up</option>
          <option value="coaching">Coaching</option>
        </select>
      </label>
      <label className="field">
        <span>Timezone</span>
        <input type="text" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
      </label>
      <label className="field">
        <span>Notes</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Share anything helpful for the meeting." />
      </label>
      <button type="submit" className="button primary" disabled={submitting || !selectedSlot || !slots.length}>
        {submitting ? 'Booking…' : submitLabel}
      </button>
    </form>
  );
}
