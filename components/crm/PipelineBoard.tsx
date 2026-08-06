'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { usePipeline } from '../../hooks/usePipeline';
import { PIPELINE_STATUSES } from '../../lib/constants';
import type { Lead } from '../../types/crm';
import type { TaskRow } from '../../types/task';
import { PipelineColumn } from './PipelineColumn';

interface PipelineBoardProps {
  rows: Lead[];
  setRows: Dispatch<SetStateAction<Lead[]>>;
  tasks: TaskRow[];
  loading: boolean;
  error: string | null;
  onOpenLead: (leadId: string) => void;
}

export function PipelineBoard({ rows, setRows, tasks, loading, error, onOpenLead }: PipelineBoardProps) {
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [temperatureFilter, setTemperatureFilter] = useState('all');
  const [followUpFilter, setFollowUpFilter] = useState('all');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const { filteredRows, statusMessage, statusMessageTone, busyLeadId, moveLead } = usePipeline({
    rows,
    setRows,
    search,
    serviceFilter,
    temperatureFilter,
    followUpFilter
  });

  const groupedRows = useMemo(() => {
    return PIPELINE_STATUSES.reduce((accumulator, status) => {
      accumulator[status] = filteredRows.filter((lead) => lead.status === status);
      return accumulator;
    }, {} as Record<string, Lead[]>);
  }, [filteredRows]);

  async function handleMoveLead(leadId: string, nextStatus: string) {
    await moveLead(leadId, nextStatus);
    setDraggedLeadId(null);
  }

  return (
    <section className="pipeline-shell" aria-label="Sales pipeline board">
      <div className="pipeline-toolbar">
        <label className="field" style={{ minWidth: 220 }}>
          <span>Search</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, or phone" />
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
          <span>Temperature</span>
          <select value={temperatureFilter} onChange={(event) => setTemperatureFilter(event.target.value)}>
            <option value="all">All temperatures</option>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </label>
        <label className="field" style={{ minWidth: 180 }}>
          <span>Follow-up</span>
          <select value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value)}>
            <option value="all">All follow-ups</option>
            <option value="overdue">Overdue only</option>
          </select>
        </label>
      </div>

      {statusMessage ? (
        <div className={`status-banner ${statusMessageTone === 'error' ? 'error' : ''}`} role="status" aria-live="polite">
          {statusMessage}
        </div>
      ) : null}

      {error ? (
        <div className="status-banner error" role="alert" aria-live="polite">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="crm-empty-state" role="status">
          <h3>Loading pipeline…</h3>
          <p>Please wait while the latest leads are loaded.</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="crm-empty-state">
          <h3>No leads match the current filters.</h3>
          <p>Try adjusting the search or the service, temperature, or follow-up filters.</p>
        </div>
      ) : (
        <div className="pipeline-board" role="list" aria-label="Pipeline columns">
          {PIPELINE_STATUSES.map((status) => (
            <PipelineColumn
              key={status}
              status={status}
              leads={groupedRows[status] || []}
              tasks={tasks}
              busyLeadId={busyLeadId}
              onOpenLead={onOpenLead}
              onMoveLead={handleMoveLead}
              onDrop={async (nextStatus, leadId) => {
                if (leadId) {
                  await handleMoveLead(leadId, nextStatus);
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragStart={(leadId) => setDraggedLeadId(leadId)}
              onDragEnd={() => setDraggedLeadId(null)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
