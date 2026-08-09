'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PortalLayout } from '../../../components/client/PortalLayout';
import { SchedulingCard } from '../../../components/client/SchedulingCard';
import { useClientScheduling } from '../../../hooks/useClientScheduling';
import { browserSupabase } from '../../../lib/supabase/browser';

export default function PortalSchedulingPage() {
  const router = useRouter();
  const { events, availabilitySlots, loading, error, message, bookConsultation, rescheduleConsultation, cancelConsultation } = useClientScheduling();

  useEffect(() => {
    async function checkAccess() {
      if (!browserSupabase) {
        router.replace('/portal/login');
        return;
      }

      const { data: { session } } = await browserSupabase.auth.getSession();
      if (!session) {
        router.replace('/portal/login');
      }
    }

    void checkAccess();
  }, [router]);

  const upcomingEvent = events.find((event) => event.status === 'scheduled') || null;

  if (loading) {
    return (
      <PortalLayout title="Scheduling" subtitle="Preparing your consultation options.">
        <div className="crm-empty-state">
          <h3>Loading your schedule…</h3>
          <p>Please wait while we load your consultations.</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title="Scheduling" subtitle="Book, reschedule, or cancel your consultation.">
      <div className="portal-grid" style={{ gridTemplateColumns: '1fr' }}>
        <SchedulingCard
          event={upcomingEvent}
          onBook={bookConsultation}
          onReschedule={rescheduleConsultation}
          onCancel={cancelConsultation}
          submitting={loading}
          message={message}
          error={error}
          availabilitySlots={availabilitySlots}
        />
        {error ? <p className="status-banner error">{error}</p> : null}
      </div>
    </PortalLayout>
  );
}
