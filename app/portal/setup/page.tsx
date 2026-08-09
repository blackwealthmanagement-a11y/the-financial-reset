'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { browserSupabase } from '../../../lib/supabase/browser';

export default function PortalSetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function verifySession() {
      if (!browserSupabase) {
        setCheckingSession(false);
        setMessage('Authentication is unavailable right now.');
        return;
      }

      const { data: { session }, error } = await browserSupabase.auth.getSession();
      if (error) {
        setMessage('We could not validate your invitation session.');
        setCheckingSession(false);
        return;
      }

      if (!session?.access_token) {
        router.replace('/portal/login');
        return;
      }

      setCheckingSession(false);
    }

    verifySession();
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!browserSupabase) {
      setMessage('Authentication is unavailable right now.');
      return;
    }

    if (!password || password.length < 8) {
      setMessage('Choose a password with at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setMessage(null);

    const { error } = await browserSupabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMessage(error.message || 'We could not set your password.');
      return;
    }

    router.replace('/portal/dashboard');
  }

  if (checkingSession) {
    return (
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card portal-login-card">
            <div className="eyebrow">Client portal</div>
            <h1>Preparing your portal access…</h1>
            <p>Please wait while we verify your invitation session.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="container page-section">
        <div className="page-card portal-login-card">
          <div className="eyebrow">Client portal</div>
          <h1>Set your password</h1>
          <p>Create a password to finish activating your secure portal access.</p>
          <form className="intake-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
            </label>
            <label className="field">
              <span>Confirm password</span>
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
            </label>
            <button className="button primary" type="submit" disabled={loading}>
              {loading ? 'Setting password…' : 'Create password'} <ArrowRight size={18} />
            </button>
          </form>
          {message ? <p className="status-banner error">{message}</p> : null}
          <div className="portal-login-footer">
            <div className="hero-badges">
              <span><ShieldCheck size={16} /> Secure client access</span>
            </div>
            <Link href="/portal/login" className="text-link">Go to sign in</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
