'use client';

import Link from 'next/link';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ConsultationCard } from '../../../../components/crm/ConsultationCard';
import { LeadForm } from '../../../../components/crm/LeadForm';
import { LeadNotes } from '../../../../components/crm/LeadNotes';
import { LeadTimeline } from '../../../../components/crm/LeadTimeline';
import { TaskList } from '../../../../components/crm/TaskList';
import { EmailComposer } from '../../../../components/crm/EmailComposer';
import { EmailTemplateList } from '../../../../components/crm/EmailTemplateList';
import { CommunicationHistory } from '../../../../components/crm/CommunicationHistory';
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
import { runConsultationAutomation } from '../../../../services/workflow.service';
import { convertLeadToClient, findClientByLeadId } from '../../../../services/client.service';
import { getConsultationEventsForLead } from '../../../../services/consultation.service';
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
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; category: string; subject: string; html: string; active: boolean }>>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailHtml, setEmailHtml] = useState('');
  const [emailHistory, setEmailHistory] = useState<Array<{ id: string; subject: string; recipient: string; delivery_status: string; sent_at: string | null }>>([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [consultationEvents, setConsultationEvents] = useState<Array<{ id: string; start_time: string; end_time: string; timezone: string; meeting_type: string; status: string; meeting_link: string | null; notes: string | null }>>([]);
  const [invitingPortal, setInvitingPortal] = useState(false);
  const [clientExists, setClientExists] = useState(false);
  const [clientAuthLinked, setClientAuthLinked] = useState(false);
  const [clientAuthUserId, setClientAuthUserId] = useState<string | null>(null);
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

  useEffect(() => {
    async function refreshClientState() {
      if (!leadId) {
        setClientExists(false);
        return;
      }

      const { data, error: clientLookupError } = await findClientByLeadId(leadId);
      if (clientLookupError) {
        setClientExists(false);
        setClientAuthLinked(false);
        setClientAuthUserId(null);
        return;
      }

      setClientExists(Boolean(data));
      setClientAuthLinked(Boolean(data?.auth_user_id));
      setClientAuthUserId(data?.auth_user_id ?? null);
    }

    refreshClientState();
  }, [leadId, notice]);

  async function getEmailAuthHeaders() {
    if (!browserSupabase) {
      throw new Error('The CRM client is unavailable.');
    }

    const { data: { session } } = await browserSupabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      throw new Error('Please sign in to use the communication center.');
    }

    return {
      Authorization: `Bearer ${accessToken}`
    };
  }

  useEffect(() => {
    async function loadEmailCenter() {
      if (!leadId) return;
      setEmailLoading(true);
      try {
        const headers = await getEmailAuthHeaders();
        const response = await fetch(`/api/crm/email?leadId=${leadId}`, { headers });
        const payload = await response.json();
        if (payload.templates) {
          setTemplates(payload.templates);
          if (payload.templates[0]) {
            setSelectedTemplateId(payload.templates[0].id);
            setEmailSubject(payload.templates[0].subject);
            setEmailHtml(payload.templates[0].html);
          }
        }
        if (payload.history) {
          setEmailHistory(payload.history);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'We could not load the communication center.');
      } finally {
        setEmailLoading(false);
      }
    }

    loadEmailCenter();
  }, [leadId]);

  useEffect(() => {
    async function loadConsultationEvents() {
      if (!leadId) {
        setConsultationEvents([]);
        return;
      }

      const { data } = await getConsultationEventsForLead(leadId);
      setConsultationEvents(data || []);
    }

    loadConsultationEvents();
  }, [leadId]);

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

    const previousLead = lead;
    const previousStatus = previousLead?.consultation_status || CONSULTATION_STATUS.NOT_BOOKED;
    const previousOutcome = previousLead?.consultation_outcome || '';
    const previousDate = previousLead?.consultation_date || '';

    const { error: updateError } = await updateConsultationDetails(leadId, payload);
    if (updateError) {
      setSaving(false);
      setError('We could not save the consultation details.');
      return;
    }

    await runConsultationAutomation(browserSupabase, leadId, {
      consultation_status: previousStatus,
      consultation_outcome: previousOutcome,
    }, {
      consultation_status: consultationStatus,
      consultation_outcome: consultationOutcome || null,
    });

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

  async function handleSendEmail() {
    if (!leadId || !selectedTemplateId) {
      return;
    }

    setEmailSending(true);
    setError(null);
    setNotice(null);

    try {
      const headers = await getEmailAuthHeaders();
      const response = await fetch('/api/crm/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ leadId, templateId: selectedTemplateId, sendRequestId: crypto.randomUUID() })
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'The email could not be sent.');
      }

      setNotice('Email sent successfully.');
      setEmailHistory((current) => [payload.history, ...current]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'The email could not be sent.');
    } finally {
      setEmailSending(false);
    }
  }

  async function handleConvertToClient() {
    if (!leadId || !browserSupabase) {
      return;
    }

    setConverting(true);
    setError(null);
    setNotice(null);

    const { data, error: conversionError, created } = await convertLeadToClient(leadId);
    if (conversionError) {
      setConverting(false);
      setError(conversionError.message || 'We could not create the client record.');
      return;
    }

    if (!data) {
      setConverting(false);
      setError('We could not create the client record.');
      return;
    }

    if (created) {
      await addLeadActivity(leadId, 'client', 'Lead converted into client.');
    }

    setClientExists(true);
    setClientAuthLinked(Boolean(data.auth_user_id));
    setClientAuthUserId(data.auth_user_id ?? null);
    setNotice(created ? 'Lead converted into client.' : 'This lead is already linked to a client.');
    setConverting(false);
    await reload();
  }

  async function handleInviteToPortal() {
    if (!leadId || !browserSupabase) {
      return;
    }

    setInvitingPortal(true);
    setError(null);
    setNotice(null);

    try {
      const { data: { session } } = await browserSupabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error('Please sign in to invite this client to the portal.');
      }

      const response = await fetch('/api/crm/clients/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ leadId })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'We could not send the portal invite.');
      }

      setClientAuthLinked(Boolean(payload?.client?.auth_user_id));
      setClientAuthUserId(payload?.client?.auth_user_id ?? null);
      setNotice(payload?.message || 'Portal access invited and linked.');
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'We could not send the portal invite.');
    } finally {
      setInvitingPortal(false);
    }
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
            <button type="button" className="button primary" onClick={handleConvertToClient} disabled={converting || clientExists}>
              {converting ? 'Creating client…' : clientExists ? '✓ Client Created' : 'Convert to Client'}
            </button>
            {clientExists ? (
              <button type="button" className="button secondary" onClick={handleInviteToPortal} disabled={invitingPortal || clientAuthLinked}>
                {invitingPortal ? 'Sending invite…' : clientAuthLinked ? '✓ Portal Access Linked' : 'Send Portal Invite'}
              </button>
            ) : null}
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

            <div className="crm-field-card full-card">
              <h3>Consultation scheduling</h3>
              {consultationEvents.length > 0 ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {consultationEvents.map((event) => (
                    <div key={event.id} style={{ border: '1px solid rgba(11, 31, 51, 0.12)', borderRadius: 12, padding: 12 }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>{new Date(event.start_time).toLocaleString()}</p>
                      <p style={{ margin: '4px 0 0' }}><strong>Type:</strong> {event.meeting_type}</p>
                      <p style={{ margin: '4px 0 0' }}><strong>Status:</strong> {event.status}</p>
                      <p style={{ margin: '4px 0 0' }}><strong>Timezone:</strong> {event.timezone}</p>
                      {event.meeting_link ? <p style={{ margin: '4px 0 0' }}><strong>Link:</strong> {event.meeting_link}</p> : null}
                      {event.notes ? <p style={{ margin: '4px 0 0' }}><strong>Notes:</strong> {event.notes}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="portal-card-copy">No consultation events have been scheduled yet.</p>
              )}
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
            <div className="crm-field-card full-card">
              <h3>Communication center</h3>
              <div style={{ display: 'grid', gap: 16 }}>
                <EmailTemplateList
                  templates={templates}
                  selectedTemplateId={selectedTemplateId}
                  onSelect={(templateId) => {
                    const template = templates.find((item) => item.id === templateId);
                    setSelectedTemplateId(templateId);
                    if (template) {
                      setEmailSubject(template.subject);
                      setEmailHtml(template.html);
                    }
                  }}
                  loading={emailLoading}
                />
                <EmailComposer
                  template={templates.find((item) => item.id === selectedTemplateId) || null}
                  subject={emailSubject}
                  html={emailHtml}
                  sending={emailSending}
                  onSend={handleSendEmail}
                />
                <CommunicationHistory history={emailHistory} />
              </div>
            </div>
            <LeadTimeline activity={activity} />
          </div>
        </div>
      </section>
    </main>
  );
}
