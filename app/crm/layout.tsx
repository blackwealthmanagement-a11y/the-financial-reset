'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase/browser';

export default function CRMLayout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let ignore = false;
    let authSubscription: { unsubscribe: () => void } | null = null;

    async function checkSession() {
      if (!supabase) {
        router.replace('/admin/login');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!ignore) {
        if (!session) {
          router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
        } else {
          setReady(true);
        }
      }
    }

    checkSession();

    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!ignore && !session) {
          router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
        } else if (!ignore) {
          setReady(true);
        }
      });
      authSubscription = data.subscription;
    }

    return () => {
      ignore = true;
      authSubscription?.unsubscribe();
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card crm-loading-card">
            <div className="eyebrow">Secure access</div>
            <h1>Checking administrator access…</h1>
            <p>Please wait while we verify your Supabase session.</p>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
