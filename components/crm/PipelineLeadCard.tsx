'use client';

import { useMemo } from 'react';
import { PIPELINE_STATUS_LABELS } from '../../lib/constants';
import type { Lead } from '../../types/crm';

interface PipelineLeadCardProps {
  lead: Lead;
  taskCount: number;
  busy: boolean;
  onOpenLead: (leadId: string) => void;
  onMoveLead: (leadId: string, nextStatus: string) => Promise<void>;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not set';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not set';
  }

  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getFollowUpState(lead: Lead) {
  if (!lead.next_follow_up_date) {
    return 'none';
  }

  const parsed = new Date(lead.next_follow_up_date);
  if (Number.isNaN(parsed.getTime())) {
    return 'none';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed < today ? 'overdue' : 'scheduled';
}

export function PipelineLeadCard({ lead, taskCount, busy, onOpenLead, onMoveLead, onDragStart, onDragEnd }: PipelineLeadCardProps) {
  const followUpState = useMemo(() => getFollowUpState(lead), [lead]);
  const leadName = lead.full_name || 'Unnamed lead';

  return (
    <article
      className="pipeline-card"
      draggable={!busy}
      role="button"
      tabIndex={0}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('button, select, label')) {
          return;
        }
        onOpenLead(lead.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenLead(lead.id);
        }
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', lead.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart(lead.id);
      }}
      onDragEnd={() => onDragEnd()}
    >
      <div className="pipeline-card-head">
        <div className="pipeline-card-title-wrap">
          <h4>{leadName}</h4>
          <span className="crm-temp-pill">{lead.lead_temperature || 'Unset'}</span>
        </div>
        <button type="button" className="pipeline-open-button" onClick={() => onOpenLead(lead.id)}>
          Open
        </button>
      </div>

      <dl className="pipeline-card-meta">
        <div>
          <dt>Email</dt>
          <dd>{lead.email || 'Not provided'}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{lead.phone || 'Not provided'}</dd>
        </div>
        <div>
          <dt>Service</dt>
          <dd>{lead.service_interest || 'Not provided'}</dd>
        </div>
      </dl>

      <div className="pipeline-card-badges">
        <span className={`crm-followup-pill ${followUpState === 'overdue' ? 'overdue' : ''}`}>Follow-up {followUpState === 'overdue' ? 'overdue' : followUpState === 'scheduled' ? 'scheduled' : 'none'}</span>
        <span className="crm-temp-pill">{taskCount} incomplete task{taskCount === 1 ? '' : 's'}</span>
      </div>

      <div className="pipeline-card-dates">
        <div>
          <span className="pipeline-card-label">Next follow-up</span>
          <strong>{formatDate(lead.next_follow_up_date)}</strong>
        </div>
        <div>
          <span className="pipeline-card-label">Consultation</span>
          <strong>{lead.consultation_date ? formatDate(lead.consultation_date) : 'Not scheduled'}</strong>
        </div>
      </div>

      <label className="field pipeline-move-select">
        <span>Move lead</span>
        <select value={lead.status || ''} onChange={(event) => onMoveLead(lead.id, event.target.value)} disabled={busy}>
          {Object.entries(PIPELINE_STATUS_LABELS).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}
