'use client';

import { useMemo, type DragEvent } from 'react';
import { PIPELINE_STATUS_LABELS } from '../../lib/constants';
import type { Lead } from '../../types/crm';
import type { TaskRow } from '../../types/task';
import { PipelineLeadCard } from './PipelineLeadCard';

interface PipelineColumnProps {
  status: string;
  leads: Lead[];
  tasks: TaskRow[];
  busyLeadId: string | null;
  onOpenLead: (leadId: string) => void;
  onMoveLead: (leadId: string, nextStatus: string) => Promise<void>;
  onDrop: (status: string, leadId: string | null) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
}

export function PipelineColumn({ status, leads, tasks, busyLeadId, onOpenLead, onMoveLead, onDrop, onDragOver, onDragStart, onDragEnd }: PipelineColumnProps) {
  const taskCountByLead = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach((task) => {
      if (!task.completed && task.lead_id) {
        counts.set(task.lead_id, (counts.get(task.lead_id) || 0) + 1);
      }
    });
    return counts;
  }, [tasks]);

  return (
    <section className="pipeline-column" aria-labelledby={`column-${status}`}>
      <div className="pipeline-column-header">
        <div>
          <h3 id={`column-${status}`}>{PIPELINE_STATUS_LABELS[status as keyof typeof PIPELINE_STATUS_LABELS] || status}</h3>
          <p>{leads.length} lead{leads.length === 1 ? '' : 's'}</p>
        </div>
        <span className="pipeline-column-count">{leads.length}</span>
      </div>

      <div
        className="pipeline-column-dropzone"
        onDrop={(event) => {
          event.preventDefault();
          onDrop(status, event.dataTransfer.getData('text/plain') || null);
        }}
        onDragOver={onDragOver}
      >
        {leads.length === 0 ? (
          <div className="pipeline-empty-state">No leads in this stage.</div>
        ) : (
          leads.map((lead) => (
            <PipelineLeadCard
              key={lead.id}
              lead={lead}
              taskCount={taskCountByLead.get(lead.id) || 0}
              busy={busyLeadId === lead.id}
              onOpenLead={onOpenLead}
              onMoveLead={onMoveLead}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </section>
  );
}
