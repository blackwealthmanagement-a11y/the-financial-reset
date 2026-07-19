'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, LoaderCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

const STORAGE_KEY = 'the-financial-reset-intake';
const STEPS = ['Contact', 'Profile', 'Goals'];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
  : null;

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  serviceFocus: 'Both',
  estimatedCreditScore: '',
  biggestFinancialGoal: '',
  biggestCreditChallenge: '',
  preferredContactMethod: 'Email',
  bestTimeToReachYou: ''
};

type FormState = typeof initialForm;
type StepKey = 0 | 1 | 2;
type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function IntakePage() {
  const [step, setStep] = useState<StepKey>(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const progressValue = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);
  const isSubmitting = submissionStatus === 'submitting';

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (submitError) {
      setSubmitError(null);
    }
    if (submissionStatus === 'error') {
      setSubmissionStatus('idle');
    }
  }

  function handleNext() {
    if (step < 2) {
      setStep((prev) => (prev + 1) as StepKey);
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep((prev) => (prev - 1) as StepKey);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setSubmissionStatus('submitting');
    setSubmitError(null);

    const submission = {
      full_name: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      service_interest: form.serviceFocus,
      estimated_credit_score: form.estimatedCreditScore.trim(),
      financial_goal: form.biggestFinancialGoal.trim(),
      credit_challenge: form.biggestCreditChallenge.trim(),
      preferred_contact_method: form.preferredContactMethod,
      best_contact_time: form.bestTimeToReachYou.trim(),
      status: 'new' as const
    };

    try {
      if (!supabaseClient) {
        throw new Error('Supabase client is not configured.');
      }

      const { error } = await supabaseClient.from('intake_submissions').insert([submission]);
      if (error) {
        throw error;
      }

      if (typeof window !== 'undefined') {
        const existing = window.localStorage.getItem(STORAGE_KEY);
        const backups = existing ? JSON.parse(existing) : [];
        backups.push({ submittedAt: new Date().toISOString(), ...submission });
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(backups));
      }

      setForm(initialForm);
      setStep(0);
      setSubmissionStatus('success');
    } catch (error) {
      console.error('Failed to save intake submission:', error);
      setSubmissionStatus('error');
      setSubmitError('We could not send your intake right now. Please try again in a moment.');
    }
  }

  if (!isReady) {
    return null;
  }

  if (submissionStatus === 'success') {
    return (
      <>
        <Nav />
        <main className="page-shell">
          <section className="container page-section">
            <div className="page-card success-card">
              <div className="success-icon"><CheckCircle2 size={42} /></div>
              <div className="eyebrow">Intake received</div>
              <h1>Your reset request is ready.</h1>
              <p>Thank you for sharing your goals with us. Your submission is now securely stored in Supabase and we will review it shortly.</p>
              <div className="hero-actions">
                <Link className="button primary" href="/">
                  Return Home <ArrowRight size={18} />
                </Link>
                <Link className="button secondary" href="/privacy">
                  Review Privacy Policy
                </Link>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card intake-card">
            <div className="eyebrow">Start your reset</div>
            <h1>Tell us about your goals.</h1>
            <p>We will use this intake to understand your priorities and recommend the best path forward. Your submission is sent securely to our Supabase database.</p>

            <div className="progress-shell" aria-label="Intake progress">
              <div className="progress-track" aria-hidden="true">
                <span style={{ width: `${progressValue}%` }} />
              </div>
              <div className="progress-labels">
                {STEPS.map((label, index) => (
                  <span key={label} className={index <= step ? 'active' : ''}>{label}</span>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="intake-form" aria-busy={isSubmitting}>
              {step === 0 && (
                <div className="form-grid">
                  <label className="field">
                    <span>Full Name</span>
                    <input required value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input type="email" required value={form.email} onChange={(event) => updateField('email', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Phone Number</span>
                    <input type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Preferred Contact Method</span>
                    <select value={form.preferredContactMethod} onChange={(event) => updateField('preferredContactMethod', event.target.value)}>
                      <option value="Email">Email</option>
                      <option value="Phone">Phone</option>
                      <option value="Text">Text</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Best Time to Reach You</span>
                    <input value={form.bestTimeToReachYou} onChange={(event) => updateField('bestTimeToReachYou', event.target.value)} placeholder="Morning, afternoon, or evening" />
                  </label>
                </div>
              )}

              {step === 1 && (
                <div className="form-grid">
                  <label className="field">
                    <span>Personal Credit / Business Credit / Both</span>
                    <select value={form.serviceFocus} onChange={(event) => updateField('serviceFocus', event.target.value)}>
                      <option value="Personal Credit">Personal Credit</option>
                      <option value="Business Credit">Business Credit</option>
                      <option value="Both">Both</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Estimated Credit Score</span>
                    <input value={form.estimatedCreditScore} onChange={(event) => updateField('estimatedCreditScore', event.target.value)} placeholder="e.g. 620" />
                  </label>
                  <label className="field full">
                    <span>Biggest Credit Challenge</span>
                    <textarea value={form.biggestCreditChallenge} onChange={(event) => updateField('biggestCreditChallenge', event.target.value)} placeholder="Tell us what is keeping you stuck right now." />
                  </label>
                </div>
              )}

              {step === 2 && (
                <div className="form-grid">
                  <label className="field full">
                    <span>Biggest Financial Goal</span>
                    <textarea required value={form.biggestFinancialGoal} onChange={(event) => updateField('biggestFinancialGoal', event.target.value)} placeholder="Example: buy a home, improve cash flow, prepare for funding, or rebuild confidence." />
                  </label>
                  <div className="field full summary-panel">
                    <h3>Review your intake</h3>
                    <p><strong>Name:</strong> {form.fullName || '—'}</p>
                    <p><strong>Email:</strong> {form.email || '—'}</p>
                    <p><strong>Focus:</strong> {form.serviceFocus}</p>
                    <p><strong>Goal:</strong> {form.biggestFinancialGoal || '—'}</p>
                  </div>
                </div>
              )}

              {submitError && (
                <div className="status-banner error" role="alert" aria-live="polite">
                  {submitError}
                </div>
              )}

              <div className="form-actions">
                {step > 0 && (
                  <button className="button secondary" type="button" onClick={handleBack} disabled={isSubmitting}>
                    Back
                  </button>
                )}
                {step < 2 ? (
                  <button className="button primary" type="button" onClick={handleNext} disabled={isSubmitting}>
                    Continue <ChevronRight size={18} />
                  </button>
                ) : (
                  <button className="button primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <LoaderCircle size={18} className="spinner" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Intake <ChevronRight size={18} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
