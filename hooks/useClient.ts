import { useEffect, useState } from 'react';
import { browserSupabase } from '../lib/supabase/browser';
import { getClientSessionUser, getPortalDashboardData } from '../services/portal.service';
import type { ClientUser, PortalDashboardData } from '../types/client';

export function useClient() {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [dashboardData, setDashboardData] = useState<PortalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      if (!browserSupabase) {
        if (isMounted) {
          setError('Portal authentication is not available right now.');
          setLoading(false);
        }
        return;
      }

      const { data, error: userError } = await getClientSessionUser();
      if (!isMounted) {
        return;
      }

      if (userError || !data) {
        setUser(null);
        setDashboardData(null);
        setError(userError?.message || 'Please sign in to continue.');
        setLoading(false);
        return;
      }

      const dashboard = await getPortalDashboardData();
      if (isMounted) {
        setUser(data);
        setDashboardData(dashboard);
        setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { user, dashboardData, loading, error };
}
