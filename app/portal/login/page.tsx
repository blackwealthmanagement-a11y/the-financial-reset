'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { browserSupabase } from '../../../lib/supabase/browser';

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      if (!browserSupabase) {
        return;
      }

      const { data: { session } } = await browserSupabase.auth.getSession();
      if (session) {
        router.replace('/portal/dashboard');
      }
    }

    checkSession();
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!browserSupabase) {
      setMessage('Authentication is unavailable right now.');
      return;
    }

    setLoading(true);
    setMessage(null);

    const { data, error } = await browserSupabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage(error.message || 'We could not sign you in.');
      return;
    }

    if (data.session) {
      router.replace('/portal/dashboard');
    }
  }

  return (
    <main className="page-shell">
      <section className="container page-section">
        <div className="page-card portal-login-card">
          <div className="eyebrow">Client portal</div>
          <h1>Welcome back</h1>
          <p>Sign in to view your progress, upcoming consultations, and assigned tasks.</p>
          <form className="intake-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <button className="button primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'} <ArrowRight size={18} />
            </button>
          </form>
          {message ? <p className="status-banner error">{message}</p> : null}
          <div className="portal-login-footer">
            <div className="hero-badges">
              <span><ShieldCheck size={16} /> Secure client access</span>
            </div>
            <Link href="/" className="text-link">Return home</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
