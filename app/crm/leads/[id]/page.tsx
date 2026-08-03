'use client';

import Link from 'next/link';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ConsultationCard } from '../../../../components/crm/ConsultationCard';
import { LeadForm } from '../../../../components/crm/LeadForm';
import { LeadNotes } from '../../../../components/crm/LeadNotes';
import { LeadTimeline } from '../../../../components/crm/LeadTimeline';
import { TaskList } from '../../../../components/crm/TaskList';
import { useLead } from '../../../../hooks/useLead';
import { useNotes } from '../../../../hooks/useNotes';
import { useTasks } from '../../../../hooks/useTasks';
import { LEAD_TEMPERATURE } from '../../../../lib/constants';
import { CONSULTATION_OUTCOME, CONSULTATION_STATUS } from '../../../../constants/consultation';
import { getFollowUpState } from '../../../../utils/date';
import { formatValue } from '../../../../utils/format';
import { browserSupabase } from '../../../../lib/supabase/browser';
import { addLeadActivity, updateConsultationDetails, updateLeadFollowUp, updateLeadStatus } from '../../../../services/crm.service';
import { createTask, deleteTask, updateTask } from '../../../../services/task.service';
import type { Lead } from '../../../../types/crm';
import type { TaskRow } from '../../../../types/task';

const statusOptions = [
  'new',
  'contacted',
  'consultation_scheduled',
  'in_progress',
  'follow_up',
  'closed',
  'not_qualified'
];

function formatStatus(value: string | undefined) {
  if (!value) {
    return 'new';
  }

  return value.replace(/_/g, ' ');
}

function getTemperatureLabel(value: string | null | undefined) {
  if (!value) {
    return 'Warm';
  }

  switch (value.toLowerCase()) {
    case LEAD_TEMPERATURE.HOT:
      return 'Hot';
    case LEAD_TEMPERATURE.COLD:
      return 'Cold';
    default:
      return 'Warm';
  }
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<string>('new');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [temperature, setTemperature] = useState<string>(LEAD_TEMPERATURE.WARM);
  const [noteText, setNoteText] = useState('');
  const [consultationStatus, setConsultationStatus] = useState<string>(CONSULTATION_STATUS.NOT_BOOKED);
  const [consultationDate, setConsultationDate] = useState('');
  const [consultationOutcome, setConsultationOutcome] = useState('');
  const [consultationSummary, setConsultationSummary] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskStatus, setTaskStatus] = useState('Pending');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const leadId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { lead, notes, activity, loading, error: leadError, setLead, reload } = useLead(leadId);
  const { saving: notesSaving, error: noteError, notice: noteNotice, saveNote } = useNotes(leadId);
  const { tasks, loading: tasksLoading, error: tasksError, reload: reloadTasks, setTasks } = useTasks(leadId);

  useEffect(() => {
    if (!lead) return;
    setStatus((lead.status as string) || 'new');
    setNextFollowUpDate((lead.next_follow_up_date as string) || '');
    setTemperature((lead.lead_temperature as string) || LEAD_TEMPERATURE.WARM);
    setConsultationStatus((lead.consultation_status as string) || CONSULTATION_STATUS.NOT_BOOKED);
    setConsultationDate((lead.consultation_date as string) || '');
    setConsultationOutcome((lead.consultation_outcome as string) || '');
    setConsultationSummary((lead.consultation_summary as string) || '');
  }, [lead]);

  async function handleStatusUpdate(event: ChangeEvent<HTMLSelectElement>) {
    const nextStatus = event.target.value;
    if (!leadId || !browserSupabase) {
      return;
    }

    setSaving(true);
    setNotice(null);
    setError(null);

    const { error: updateError } = await updateLeadStatus(leadId, nextStatus);
    if (updateError) {
      setSaving(false);
      setError('We could not update the lead status.');
      return;
    }

    const activityMessage = `Status updated to ${formatStatus(nextStatus)}.`;
    await addLeadActivity(leadId, 'status', activityMessage);

    setSaving(false);
    setStatus(nextStatus);
    setLead((current) => current ? { ...current, status: nextStatus } as Lead : current);
    setNotice('Lead status updated.');
    await reload();
  }

  async function handleFollowUpSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leadId || !browserSupabase) {
      return;
    }

    setSaving(true);
    setNotice(null);
    setError(null);

    const payload: Record<string, string> = {};
    if (nextFollowUpDate) {
      payload.next_follow_up_date = nextFollowUpDate;
    }
    if (temperature) {
      payload.lead_temperature = temperature;
    }

    if (Object.keys(payload).length > 0) {
      const { error: updateError } = await updateLeadFollowUp(leadId, payload);
      if (updateError) {
        setSaving(false);
        setError('We could not save the follow-up details.');
        return;
      }
    }

    const followUpMessage = nextFollowUpDate
      ? `Next follow-up date set to ${nextFollowUpDate} and temperature set to ${getTemperatureLabel(temperature)}.`
      : `Lead temperature updated to ${getTemperatureLabel(temperature)}.`;

    await addLeadActivity(leadId, 'follow_up', followUpMessage);

    setSaving(false);
    setNotice('Follow-up details saved.');
    await reload();
  }

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveNote(noteText, async () => {
      setNoteText('');
      await reload();
    });
  }

  async function handleTaskSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leadId || !browserSupabase || !taskTitle.trim()) {
      return;
    }

    setSaving(true);
    setNotice(null);
    setError(null);

    const taskCompletionState = taskStatus === 'Completed'
      ? { completed: true, completed_at: new Date().toISOString(), status: 'Completed' }
      : { completed: false, completed_at: null, status: taskStatus };

    const payload = {
      title: taskTitle.trim(),
      description: taskDescription.trim() || null,
      priority: taskPriority,
      due_date: taskDueDate ? `${taskDueDate}T00:00:00.000Z` : null,
      ...taskCompletionState,
    };

    if (editingTaskId) {
      const { error: updateError } = await updateTask(editingTaskId, payload);
      if (updateError) {
        setSaving(false);
        setError('We could not update the task.');
        return;
      }
      setNotice('Task updated.');
    } else {
      const { error: createError } = await createTask(leadId, payload);
      if (createError) {
        setSaving(false);
        setError('We could not create the task.');
        return;
      }
      setNotice('Task created.');
    }

    setTaskTitle('');
    setTaskDescription('');
    setTaskPriority('Medium');
    setTaskStatus('Pending');
    setTaskDueDate('');
    setEditingTaskId(null);
    setSaving(false);
    await reloadTasks();
  }

  function handleTaskEdit(task: TaskRow) {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDescription(task.description || '');
    setTaskPriority(task.priority);
    setTaskStatus(task.status);
    setTaskDueDate(task.due_date ? task.due_date.slice(0, 10) : '');
  }

  async function handleTaskComplete(task: TaskRow) {
    if (!browserSupabase) {
      return;
    }

    setSaving(true);
    setNotice(null);
    setError(null);

    const nextCompleted = !task.completed;
    const payload = {
      completed: nextCompleted,
      completed_at: nextCompleted ? new Date().toISOString() : null,
      status: nextCompleted ? 'Completed' : 'Pending',
    };

    const { error: updateError } = await updateTask(task.id, payload);
    if (updateError) {
      setSaving(false);
      setError('We could not update the task status.');
      return;
    }

    setNotice(nextCompleted ? 'Task marked complete.' : 'Task reopened.');
    setSaving(false);
    await reloadTasks();
  }

  async function handleTaskDelete(task: TaskRow) {
    if (!browserSupabase) {
      return;
    }

    setSaving(true);
    setNotice(null);
    setError(null);

    const { error: deleteError } = await deleteTask(task.id);
    if (deleteError) {
      setSaving(false);
      setError('We could not delete the task.');
      return;
    }

    setNotice('Task deleted.');
    setSaving(false);
    await reloadTasks();
  }

  async function handleConsultationSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leadId || !browserSupabase) {
      return;
    }

    setSaving(true);
    setNotice(null);
    setError(null);

    const payload: Record<string, string | null> = {};
    payload.consultation_status = consultationStatus;
    payload.consultation_date = consultationDate || null;
    payload.consultation_outcome = consultationOutcome || null;
    payload.consultation_summary = consultationSummary || null;

    const { error: updateError } = await updateConsultationDetails(leadId, payload);
    if (updateError) {
      setSaving(false);
      setError('We could not save the consultation details.');
      return;
    }

    const previousLead = lead;
    const previousStatus = previousLead?.consultation_status || CONSULTATION_STATUS.NOT_BOOKED;
    const previousOutcome = previousLead?.consultation_outcome || '';
    const previousDate = previousLead?.consultation_date || '';

    const activityParts: string[] = [];
    if (consultationStatus !== previousStatus) {
      activityParts.push(`Consultation status updated to ${consultationStatus}.`);
    }
    if (consultationOutcome !== previousOutcome) {
      activityParts.push(`Consultation outcome updated to ${consultationOutcome || 'Not set'}.`);
    }
    if (consultationDate !== previousDate) {
      activityParts.push(`Consultation date updated to ${consultationDate || 'Not set'}.`);
    }

    if (activityParts.length > 0) {
      await addLeadActivity(leadId, 'consultation', activityParts.join(' '));
    }

    setSaving(false);
    setNotice('Consultation details saved.');
    await reload();
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

  if (leadError || !lead) {
    return (
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card">
            <div className="eyebrow">Lead unavailable</div>
            <h1>{leadError || 'We could not load this lead.'}</h1>
            <Link className="button secondary" href="/crm">
              Back to CRM
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const isOverdue = getFollowUpState(lead.next_follow_up_date, lead.status).isOverdue;

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

          {(error || noteError) ? (
            <div className="status-banner error" role="alert" aria-live="polite">
              {error || noteError}
            </div>
          ) : null}
          {noteNotice ? <div className="status-banner" role="status">{noteNotice}</div> : null}

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
              <p><strong>Next follow-up:</strong> {lead.next_follow_up_date ? new Date(lead.next_follow_up_date).toLocaleDateString() : 'Not set'}</p>
              <p><strong>Lead temperature:</strong> {getTemperatureLabel(lead.lead_temperature)}</p>
              <p><strong>Submission date:</strong> {lead.created_at ? new Date(lead.created_at).toLocaleString() : 'Not provided'}</p>
              <p><strong>Lead id:</strong> {formatValue(lead.id)}</p>
              {isOverdue ? <p className="crm-followup-pill overdue">Overdue follow-up</p> : null}
            </div>

            <ConsultationCard
              consultationStatus={consultationStatus}
              consultationDate={consultationDate}
              consultationOutcome={consultationOutcome}
              consultationSummary={consultationSummary}
              onStatusChange={setConsultationStatus}
              onDateChange={setConsultationDate}
              onOutcomeChange={setConsultationOutcome}
              onSummaryChange={setConsultationSummary}
              saving={saving}
              onSubmit={handleConsultationSave}
            />
            <LeadForm
              nextFollowUpDate={nextFollowUpDate}
              setNextFollowUpDate={setNextFollowUpDate}
              temperature={temperature}
              setTemperature={setTemperature}
              saving={saving}
              onSubmit={handleFollowUpSave}
            />
            <LeadNotes
              notes={notes}
              noteText={noteText}
              setNoteText={setNoteText}
              saving={notesSaving}
              onAddNote={handleAddNote}
            />
            <TaskList
              tasks={tasks}
              editingTaskId={editingTaskId}
              title={taskTitle}
              description={taskDescription}
              priority={taskPriority}
              status={taskStatus}
              dueDate={taskDueDate}
              saving={saving}
              onTitleChange={setTaskTitle}
              onDescriptionChange={setTaskDescription}
              onPriorityChange={setTaskPriority}
              onStatusChange={setTaskStatus}
              onDueDateChange={setTaskDueDate}
              onSubmit={handleTaskSave}
              onCancel={() => {
                setEditingTaskId(null);
                setTaskTitle('');
                setTaskDescription('');
                setTaskPriority('Medium');
                setTaskStatus('Pending');
                setTaskDueDate('');
              }}
              onEdit={handleTaskEdit}
              onComplete={handleTaskComplete}
              onDelete={handleTaskDelete}
            />
            <LeadTimeline activity={activity} />
          </div>
        </div>
      </section>
    </main>
  );
}
