'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CRMViewSwitcher } from '../../components/crm/CRMViewSwitcher';
import { DashboardMetrics } from '../../components/crm/DashboardMetrics';
import { FollowUpWidget } from '../../components/crm/FollowUpWidget';
import { LeadFilters } from '../../components/crm/LeadFilters';
import { LeadTable } from '../../components/crm/LeadTable';
import { PipelineBoard } from '../../components/crm/PipelineBoard';
import { useDashboard } from '../../hooks/useDashboard';
import { useLeads } from '../../hooks/useLeads';
import { getTasks } from '../../services/task.service';
import type { TaskRow } from '../../types/task';

type CRMView = 'table' | 'pipeline';

export default function CRMPage() {
  const router = useRouter();
  const { rows, loading, error, setRows } = useLeads();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [view, setView] = useState<CRMView>('table');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedView = window.localStorage.getItem('crm-view');
    if (storedView === 'table' || storedView === 'pipeline') {
      setView(storedView);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('crm-view', view);
    }
  }, [view]);

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

  useEffect(() => {
    let isMounted = true;

    async function loadTasks() {
      const { data } = await getTasks();
      if (!isMounted) {
        return;
      }

      setTasks(data || []);
    }

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = useDashboard(rows, tasks);

  return (
    <main className="page-shell">
      <section className="container page-section">
        <div className="page-card crm-dashboard-card">
          <div className="crm-toolbar">
            <div>
              <div className="eyebrow">Internal CRM</div>
              <h1>Lead workspace</h1>
            </div>
            <div className="crm-toolbar-stack">
              <Link className="button secondary" href="/crm/education">Education</Link>
              <Link className="button secondary" href="/crm/education/paths">Learning Paths</Link>
            </div>
            <div className="crm-toolbar-stack">
              <CRMViewSwitcher activeView={view} onChange={setView} />
              {view === 'table' ? (
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
              ) : null}
            </div>
          </div>

          <DashboardMetrics metrics={metrics} />
          <div className="crm-dashboard-grid">
            <FollowUpWidget rows={rows} />
          </div>

          {view === 'pipeline' ? (
            <PipelineBoard rows={rows} setRows={setRows} tasks={tasks} loading={loading} error={error} onOpenLead={(leadId) => router.push(`/crm/leads/${leadId}`)} />
          ) : (
            <>
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
            </>
          )}
        </div>
      </section>
    </main>
  );
}

