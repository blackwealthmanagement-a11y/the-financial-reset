import { useEffect, useState } from 'react';
import { browserSupabase } from '../lib/supabase/browser';
import { bookPortalConsultation, cancelPortalConsultation, getPortalConsultations, reschedulePortalConsultation, type PortalConsultationEvent } from '../services/portal-scheduling.service';

export function useClientScheduling() {
  const [events, setEvents] = useState<PortalConsultationEvent[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    if (!browserSupabase) {
      setError('Portal scheduling is unavailable right now.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, slots, error: loadError } = await getPortalConsultations();
    setEvents(data || []);
    setAvailabilitySlots(slots || []);
    setError(loadError?.message || null);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function bookConsultation(payload: { start_time: string; timezone?: string; meeting_type?: string; notes?: string | null }) {
    setMessage(null);
    setError(null);
    const { error: bookError } = await bookPortalConsultation(payload);
    if (bookError) {
      setError(bookError.message);
      return false;
    }
    await refresh();
    setMessage('Consultation booked successfully.');
    return true;
  }

  async function rescheduleConsultation(eventId: string, payload: { start_time: string; timezone?: string; meeting_type?: string; notes?: string | null }) {
    setMessage(null);
    setError(null);
    const { error: rescheduleError } = await reschedulePortalConsultation(eventId, payload);
    if (rescheduleError) {
      setError(rescheduleError.message);
      return false;
    }
    await refresh();
    setMessage('Consultation rescheduled successfully.');
    return true;
  }

  async function cancelConsultation(eventId: string) {
    setMessage(null);
    setError(null);
    const { error: cancelError } = await cancelPortalConsultation(eventId);
    if (cancelError) {
      setError(cancelError.message);
      return false;
    }
    await refresh();
    setMessage('Consultation cancelled successfully.');
    return true;
  }

  return { events, availabilitySlots, loading, error, message, refresh, bookConsultation, rescheduleConsultation, cancelConsultation };
}
