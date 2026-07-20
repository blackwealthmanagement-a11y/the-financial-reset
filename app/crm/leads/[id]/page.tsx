'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase-client';

type LeadRecord = {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  service_interest?: string;
  estimated_credit_score?: string;
  financial_goal?: string;
  credit_challenge?: string;
  preferred_contact_method?: string;
  best_contact_time?: string;
  status?: string;
  created_at?: string;
};

const statusOptions = [
  'new',
  'contacted',
  'consultation_scheduled',
  'in_progress',
  'follow_up',
  'closed',
  'not_qualified'
];

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return 'Not provided';
  }
  return String(value);
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [status, setStatus] = useState('new');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const leadId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!leadId) {
      setError('The requested lead could not be found.');
      setLoading(false);
      return;
    }

    async function loadLead() {
      if (!supabase) {
        setError('Supabase credentials are not configured.');
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin/login?next=/crm');
        return;
      }

      const { data, error: leadError } = await supabase
        .from('intake_submissions')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError || !data) {
        setError('We could not load this lead.');
        setLoading(false);
        return;
      }

      setLead(data as LeadRecord);
      setStatus((data.status as string) || 'new');
      setLoading(false);
    }

    loadLead();
  }, [params.id, router]);

  async function handleStatusUpdate(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = event.target.value;
    const leadId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (!leadId || !supabase) {
      return;
    }

    setSaving(true);
    setNotice(null);
    setError(null);

    const { error: updateError } = await supabase
      .from('intake_submissions')
      .update({ status: nextStatus })
      .eq('id', leadId);

    setSaving(false);
    if (updateError) {
      setError('We could not update the lead status.');
      return;
    }

    setStatus(nextStatus);
    setLead((current) => current ? { ...current, status: nextStatus } : current);
    setNotice('Lead status updated.');
  }

  if (loading) {
    return (
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card">
            <div className="eyebrow">Loading lead</div>
            <h1>Fetching lead details…</h1>
          </div>
        </section>
      </main>
    );
  }

  if (error || !lead) {
    return (
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card">
            <div className="eyebrow">Lead unavailable</div>
            <h1>{error || 'We could not load this lead.'}</h1>
            <Link className="button secondary" href="/crm">
              Back to CRM
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="container page-section">
        <div className="page-card crm-detail-card">
          <div className="crm-toolbar">
            <div>
              <div className="eyebrow">Lead detail</div>
              <h1>{lead.full_name || 'Untitled intake'}</h1>
            </div>
            <Link className="button secondary" href="/crm">
              Back to CRM
            </Link>
          </div>

          <div className="crm-status-row">
            <label className="field" style={{ maxWidth: 280 }}>
              <span>Status</span>
              <select value={status} onChange={handleStatusUpdate} disabled={saving}>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            {notice ? <div className="status-banner" role="status">{notice}</div> : null}
          </div>

          {error ? (
            <div className="status-banner error" role="alert" aria-live="polite">
              {error}
            </div>
          ) : null}

          <div className="crm-detail-grid">
            <div className="crm-field-card">
              <h3>Contact information</h3>
              <p><strong>Full name:</strong> {formatValue(lead.full_name)}</p>
              <p><strong>Email:</strong> {formatValue(lead.email)}</p>
              <p><strong>Phone:</strong> {formatValue(lead.phone)}</p>
              <p><strong>Preferred contact method:</strong> {formatValue(lead.preferred_contact_method)}</p>
              <p><strong>Best contact time:</strong> {formatValue(lead.best_contact_time)}</p>
            </div>
            <div className="crm-field-card">
              <h3>Service and goals</h3>
              <p><strong>Service interest:</strong> {formatValue(lead.service_interest)}</p>
              <p><strong>Estimated credit score:</strong> {formatValue(lead.estimated_credit_score)}</p>
              <p><strong>Financial goal:</strong> {formatValue(lead.financial_goal)}</p>
              <p><strong>Credit challenge:</strong> {formatValue(lead.credit_challenge)}</p>
            </div>
            <div className="crm-field-card full-card">
              <h3>Lead details</h3>
              <p><strong>Status:</strong> {formatValue(lead.status)}</p>
              <p><strong>Submission date:</strong> {lead.created_at ? new Date(lead.created_at).toLocaleString() : 'Not provided'}</p>
              <p><strong>Lead id:</strong> {formatValue(lead.id)}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
