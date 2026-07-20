import { useEffect, useMemo, useState } from 'react';
import { getLeads } from '../services/crm.service';
import type { Lead } from '../types/crm';

export function useLeads() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLeads() {
      setLoading(true);
      setError(null);
      const { data, error: leadError } = await getLeads();
      if (leadError) {
        setError('We could not load the CRM list.');
        setLoading(false);
        return;
      }
      setRows(data || []);
      setLoading(false);
    }

    loadLeads();
  }, []);

  return useMemo(() => ({ rows, loading, error, setRows }), [rows, loading, error]);
}
