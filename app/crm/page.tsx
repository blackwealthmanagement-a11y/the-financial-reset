'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase-client';

type LeadRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  service_interest: string | null;
  preferred_contact_method: string | null;
  status: string | null;
  created_at: string | null;
};

export default function CRMPage() {
  const [rows, setRows] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    async function loadLeads() {
      setLoading(true);
      setError(null);

      if (!supabase) {
        setError('Supabase credentials are not configured for this environment.');
        setLoading(false);
        return;
      }

      const { data, error: leadError } = await supabase
        .from('intake_submissions')
        .select('id, full_name, email, phone, service_interest, preferred_contact_method, status, created_at')
        .order('created_at', { ascending: false });

      if (leadError) {
        setError('We could not load the CRM list.');
        setLoading(false);
        return;
      }

      setRows((data as LeadRecord[]) || []);
      setLoading(false);
    }

    loadLeads();
  }, []);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const items = rows.filter((row) => {
      const haystack = [row.full_name, row.email, row.phone].filter(Boolean).join(' ').toLowerCase();
      const matchesQuery = query.length === 0 || haystack.includes(query);
      const matchesService = serviceFilter === 'all' || row.service_interest === serviceFilter;
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesQuery && matchesService && matchesStatus;
    });

    return items.sort((left, right) => {
      const leftDate = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightDate = right.created_at ? new Date(right.created_at).getTime() : 0;
      return sortOrder === 'newest' ? rightDate - leftDate : leftDate - rightDate;
    });
  }, [rows, search, serviceFilter, statusFilter, sortOrder]);

  return (
    <main className="page-shell">
      <section className="container page-section">
        <div className="page-card crm-dashboard-card">
          <div className="crm-toolbar">
            <div>
              <div className="eyebrow">Internal CRM</div>
              <h1>Lead workspace</h1>
            </div>
            <div className="crm-toolbar-actions">
              <label className="field" style={{ minWidth: 220 }}>
                <span>Search</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, or phone" />
              </label>
              <label className="field" style={{ minWidth: 180 }}>
                <span>Service</span>
                <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
                  <option value="all">All services</option>
                  <option value="Personal Credit">Personal Credit</option>
                  <option value="Business Credit">Business Credit</option>
                  <option value="Both">Both</option>
                </select>
              </label>
              <label className="field" style={{ minWidth: 180 }}>
                <span>Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="consultation_scheduled">Consultation scheduled</option>
                  <option value="in_progress">In progress</option>
                  <option value="follow_up">Follow up</option>
                  <option value="closed">Closed</option>
                  <option value="not_qualified">Not qualified</option>
                </select>
              </label>
              <label className="field" style={{ minWidth: 180 }}>
                <span>Sort</span>
                <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </label>
            </div>
          </div>

          {error ? (
            <div className="status-banner error" role="alert" aria-live="polite">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="crm-empty-state" role="status">
              <h3>Loading leads…</h3>
              <p>Please hold while we pull the latest intake submissions.</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="crm-empty-state">
              <h3>No leads match the current filters.</h3>
              <p>Try relaxing the search or changing the service and status filters.</p>
            </div>
          ) : (
            <div className="crm-table-shell">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th scope="col">Full name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Service interest</th>
                    <th scope="col">Preferred contact</th>
                    <th scope="col">Status</th>
                    <th scope="col">Submission date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link href={`/crm/leads/${row.id}`} className="crm-link">
                          {row.full_name || 'Unnamed lead'}
                        </Link>
                      </td>
                      <td>{row.email || '—'}</td>
                      <td>{row.phone || '—'}</td>
                      <td>{row.service_interest || '—'}</td>
                      <td>{row.preferred_contact_method || '—'}</td>
                      <td>
                        <span className="crm-status-pill">{row.status || 'new'}</span>
                      </td>
                      <td>{row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

