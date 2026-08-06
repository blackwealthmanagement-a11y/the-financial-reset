import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { PIPELINE_STATUS_LABELS } from '../lib/constants';
import { addLeadActivity, updateLeadStatus } from '../services/crm.service';
import { getTasksForLead } from '../services/task.service';
import type { Lead } from '../types/crm';
import type { TaskRow } from '../types/task';

interface UsePipelineOptions {
  rows: Lead[];
  setRows: Dispatch<SetStateAction<Lead[]>>;
  search: string;
  serviceFilter: string;
  temperatureFilter: string;
  followUpFilter: string;
}

function formatStatusLabel(status: string) {
  return PIPELINE_STATUS_LABELS[status as keyof typeof PIPELINE_STATUS_LABELS] || status.replace(/_/g, ' ');
}

export function usePipeline({ rows, setRows, search, serviceFilter, temperatureFilter, followUpFilter }: UsePipelineOptions) {
  const [tasksByLead, setTasksByLead] = useState<Record<string, TaskRow[]>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusMessageTone, setStatusMessageTone] = useState<'success' | 'error'>('success');
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);

  useEffect(() => {
    async function loadTasks() {
      const tasksById: Record<string, TaskRow[]> = {};
      for (const lead of rows) {
        const { data } = await getTasksForLead(lead.id);
        tasksById[lead.id] = data || [];
      }
      setTasksByLead(tasksById);
    }

    if (rows.length > 0) {
      loadTasks();
    }
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rows.filter((row) => {
      const haystack = [row.full_name, row.email, row.phone].filter(Boolean).join(' ').toLowerCase();
      const matchesQuery = query.length === 0 || haystack.includes(query);
      const matchesService = serviceFilter === 'all' || row.service_interest === serviceFilter;
      const matchesTemperature = temperatureFilter === 'all' || row.lead_temperature === temperatureFilter;
      const matchesFollowUp = followUpFilter === 'all' || (followUpFilter === 'overdue' ? Boolean(row.next_follow_up_date && new Date(row.next_follow_up_date) < today) : true);
      return matchesQuery && matchesService && matchesTemperature && matchesFollowUp;
    });
  }, [rows, search, serviceFilter, temperatureFilter, followUpFilter]);

  async function moveLead(leadId: string, nextStatus: string) {
    const lead = rows.find((item) => item.id === leadId);
    if (!lead) {
      return;
    }

    if (busyLeadId === leadId) {
      return;
    }

    if (lead.status === nextStatus) {
      setStatusMessage('This lead is already in that stage.');
      setStatusMessageTone('success');
      return;
    }

    const previousStatus = lead.status;
    setBusyLeadId(leadId);
    setStatusMessage(null);

    setRows((current) => current.map((item) => (item.id === leadId ? { ...item, status: nextStatus } : item)));

    const { error } = await updateLeadStatus(leadId, nextStatus);
    if (error) {
      setRows((current) => current.map((item) => (item.id === leadId ? { ...item, status: previousStatus || item.status } : item)));
      setStatusMessage(`Could not move this lead. ${error.message || 'Please try again.'}`);
      setStatusMessageTone('error');
      setBusyLeadId(null);
      return;
    }

    const activityMessage = `Moved lead to ${formatStatusLabel(nextStatus)}.`;
    const activityResult = await addLeadActivity(leadId, 'status_updated', activityMessage);
    if (activityResult.error) {
      console.warn('Lead activity entry could not be created.', activityResult.error);
    }

    setStatusMessage(`Lead moved to ${formatStatusLabel(nextStatus)}.`);
    setStatusMessageTone('success');
    setBusyLeadId(null);
  }

  return {
    filteredRows,
    tasksByLead,
    statusMessage,
    statusMessageTone,
    busyLeadId,
    moveLead
  };
}
