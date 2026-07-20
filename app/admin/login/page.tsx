'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase-client';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/crm';

  useEffect(() => {
    let ignore = false;
    async function checkSession() {
      if (!supabase) {
        setError('Supabase credentials are not configured for this environment.');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!ignore && session) {
        router.replace(nextPath);
      }
    }

    checkSession();
    return () => {
      ignore = true;
    };
  }, [nextPath, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError('Supabase credentials are not configured for this environment.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setIsSubmitting(false);

    if (authError) {
      setError(authError.message || 'Unable to sign in right now.');
      return;
    }

    if (data.session) {
      router.replace(nextPath);
    }
  }

  return (
    <main className="page-shell">
      <section className="container page-section">
        <div className="page-card auth-card">
          <div className="eyebrow">Internal access</div>
          <h1>Administrator sign in</h1>
          <p>Use your Supabase-authenticated administrator account to access the internal CRM dashboard.</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            {error ? (
              <div className="status-banner error" role="alert" aria-live="polite">
                {error}
              </div>
            ) : null}
            <div className="form-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Link className="button secondary" href="/">
                Return home
              </Link>
              <button className="button primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function AdminLoginPage() {
  return <LoginForm />;
}
