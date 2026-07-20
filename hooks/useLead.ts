import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserSupabase } from '../lib/supabase/browser';
import { getLeadActivity, getLeadById, getLeadNotes } from '../services/crm.service';
import type { Lead, LeadActivity, LeadNote } from '../types/crm';

export function useLead(leadId?: string) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [activity, setActivity] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLead = useCallback(async () => {
    if (!leadId || !browserSupabase) {
      setError('The requested lead could not be found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: { session } } = await browserSupabase.auth.getSession();
    if (!session) {
      setLoading(false);
      router.replace('/admin/login?next=/crm');
      return;
    }

    const [leadResult, notesResult, activityResult] = await Promise.all([
      getLeadById(leadId),
      getLeadNotes(leadId),
      getLeadActivity(leadId)
    ]);

    if (leadResult.error || !leadResult.data) {
      setError('We could not load this lead.');
      setLoading(false);
      return;
    }

    setLead(leadResult.data);
    setNotes(notesResult.data || []);
    setActivity(activityResult.data || []);
    setLoading(false);
  }, [leadId, router]);

  useEffect(() => {
    void loadLead();
  }, [loadLead]);

  return useMemo(() => ({ lead, notes, activity, loading, error, setLead, setNotes, setActivity, reload: loadLead }), [lead, notes, activity, loading, error, loadLead]);
}
