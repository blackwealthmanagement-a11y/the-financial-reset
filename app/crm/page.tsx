'use client';

import { useMemo, useState } from 'react';
import { DashboardMetrics } from '../../components/crm/DashboardMetrics';
import { FollowUpWidget } from '../../components/crm/FollowUpWidget';
import { LeadFilters } from '../../components/crm/LeadFilters';
import { LeadTable } from '../../components/crm/LeadTable';
import { useDashboard } from '../../hooks/useDashboard';
import { useLeads } from '../../hooks/useLeads';

export default function CRMPage() {
  const { rows, loading, error } = useLeads();
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

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

  const metrics = useDashboard(rows);

  return (
    <main className="page-shell">
      <section className="container page-section">
        <div className="page-card crm-dashboard-card">
          <div className="crm-toolbar">
            <div>
              <div className="eyebrow">Internal CRM</div>
              <h1>Lead workspace</h1>
            </div>
            <LeadFilters
              search={search}
              onSearchChange={setSearch}
              serviceFilter={serviceFilter}
              onServiceFilterChange={setServiceFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
            />
          </div>

          <DashboardMetrics metrics={metrics} />
          <div className="crm-dashboard-grid">
            <FollowUpWidget rows={rows} />
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
            <LeadTable rows={filteredRows} />
          )}
        </div>
      </section>
    </main>
  );
}

