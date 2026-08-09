import { useEffect, useState } from 'react';
import { browserSupabase } from '../lib/supabase/browser';
import { findClientByAuthUser } from '../services/client.service';
import type { ClientProfile, ClientUser } from '../types/client';

export function useClientProfile() {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!browserSupabase) {
        setError('Portal authentication is not available right now.');
        setLoading(false);
        return;
      }

      const { data: { user: authUser }, error: authError } = await browserSupabase.auth.getUser();
      if (!isMounted) {
        return;
      }

      if (authError || !authUser) {
        setUser(null);
        setProfile(null);
        setError('Please sign in to continue.');
        setLoading(false);
        return;
      }

      const { data: clientProfile, error: profileError } = await findClientByAuthUser(authUser.id);
      if (!isMounted) {
        return;
      }

      if (profileError) {
        setError('We could not load your client profile.');
        setLoading(false);
        return;
      }

      setUser({
        id: authUser.id,
        email: authUser.email || null,
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || null
      });
      setProfile(clientProfile);
      setLoading(false);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  return { user, profile, loading, error };
}
