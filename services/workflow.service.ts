import type { SupabaseClient } from '@supabase/supabase-js';

async function getExistingAutomationRun(client: SupabaseClient, leadId: string, automationKey: string) {
  const { data, error } = await client
    .from('crm_workflow_runs')
    .select('id, status')
    .eq('lead_id', leadId)
    .eq('automation_key', automationKey)
    .maybeSingle();

  if (error) {
    return { run: null, error };
  }

  return { run: data, error: null };
}

async function createOrUpdateAutomationRun(client: SupabaseClient, leadId: string, automationKey: string, eventType: string) {
  const { run, error: lookupError } = await getExistingAutomationRun(client, leadId, automationKey);
  if (lookupError) {
    return { ok: false, skipped: false, error: lookupError };
  }

  if (run?.status === 'completed') {
    return { ok: true, skipped: true };
  }

  if (run?.status === 'pending' || run?.status === 'failed') {
    const { error } = await client.from('crm_workflow_runs').update({
      event_type: eventType,
      status: 'pending',
      created_at: new Date().toISOString()
    }).eq('id', run.id);

    if (error) {
      return { ok: false, skipped: false, error };
    }

    return { ok: true, skipped: false };
  }

  const { error } = await client.from('crm_workflow_runs').insert([
    {
      lead_id: leadId,
      automation_key: automationKey,
      event_type: eventType,
      status: 'pending'
    }
  ]);

  if (error?.code === '23505') {
    return { ok: true, skipped: true };
  }

  if (error) {
    return { ok: false, skipped: false, error };
  }

  return { ok: true, skipped: false };
}

async function markAutomationRunCompleted(client: SupabaseClient, leadId: string, automationKey: string) {
  const { run, error: lookupError } = await getExistingAutomationRun(client, leadId, automationKey);
  if (lookupError || !run?.id) {
    return { ok: false, error: lookupError || new Error('Automation run not found') };
  }

  const { error } = await client.from('crm_workflow_runs').update({ status: 'completed' }).eq('id', run.id);
  if (error) {
    return { ok: false, error };
  }

  return { ok: true };
}

async function markAutomationRunFailed(client: SupabaseClient, leadId: string, automationKey: string) {
  const { run, error: lookupError } = await getExistingAutomationRun(client, leadId, automationKey);
  if (lookupError || !run?.id) {
    return { ok: false, error: lookupError || new Error('Automation run not found') };
  }

  const { error } = await client.from('crm_workflow_runs').update({ status: 'failed' }).eq('id', run.id);
  if (error) {
    return { ok: false, error };
  }

  return { ok: true };
}

function buildAutomationKey(leadId: string, event: string, target: 'task' | 'activity') {
  return `lead:${leadId}:${event}:${target}`;
}

async function createAutomationTask(client: SupabaseClient, leadId: string, payload: {
  title: string;
  priority: string;
  status: string;
  due_date: string;
}, automationKey: string) {
  const { error } = await client.from('crm_tasks').insert([
    {
      lead_id: leadId,
      title: payload.title,
      priority: payload.priority,
      status: payload.status,
      due_date: payload.due_date,
      completed: false,
      completed_at: null,
      automation_key: automationKey
    }
  ]);

  if (error?.code === '23505') {
    return { ok: true, skipped: true, error: null };
  }

  if (error) {
    return { ok: false, skipped: false, error };
  }

  return { ok: true, skipped: false, error: null };
}

async function createAutomationActivity(client: SupabaseClient, leadId: string, message: string, automationKey: string) {
  const { error } = await client.from('crm_lead_activity').insert([
    {
      lead_id: leadId,
      activity_type: 'automation',
      message,
      created_by: 'automation',
      automation_key: automationKey
    }
  ]);

  if (error?.code === '23505') {
    return { ok: true, skipped: true, error: null };
  }

  if (error) {
    return { ok: false, skipped: false, error };
  }

  return { ok: true, skipped: false, error: null };
}

async function updateLeadAutomationFields(client: SupabaseClient, leadId: string, payload: Record<string, string | null>) {
  return client.from('intake_submissions').update(payload).eq('id', leadId);
}

export async function runIntakeAutomation(client: SupabaseClient, leadId: string, submittedAt: string) {
  const automationKey = `intake:new:${leadId}`;
  const run = await createOrUpdateAutomationRun(client, leadId, automationKey, 'new_intake');
  if (!run.ok || run.skipped) {
    return run;
  }

  const followUpDate = new Date(new Date(submittedAt).getTime() + 48 * 60 * 60 * 1000);

  const { error: leadUpdateError } = await updateLeadAutomationFields(client, leadId, {
    status: 'new',
    lead_temperature: 'Warm',
    next_follow_up_date: followUpDate.toISOString().slice(0, 10)
  });

  if (leadUpdateError) {
    await markAutomationRunFailed(client, leadId, automationKey);
    return { ok: false, skipped: false, error: leadUpdateError };
  }

  const taskAutomationKey = buildAutomationKey(leadId, 'intake:new', 'task');
  const taskResult = await createAutomationTask(client, leadId, {
    title: 'Review and follow up with new lead',
    priority: 'High',
    status: 'Pending',
    due_date: followUpDate.toISOString()
  }, taskAutomationKey);

  if (!taskResult.ok) {
    await markAutomationRunFailed(client, leadId, automationKey);
    return { ok: false, skipped: false, error: taskResult.error };
  }

  const activityAutomationKey = buildAutomationKey(leadId, 'intake:new', 'activity');
  const activityResult = await createAutomationActivity(client, leadId, 'Automated workflow: reviewed new lead intake and created a follow-up task.', activityAutomationKey);

  if (!activityResult.ok) {
    await markAutomationRunFailed(client, leadId, automationKey);
    return { ok: false, skipped: false, error: activityResult.error };
  }

  const completionResult = await markAutomationRunCompleted(client, leadId, automationKey);
  if (!completionResult.ok) {
    return { ok: false, skipped: false, error: completionResult.error };
  }

  return { ok: true, skipped: false };
}

export async function runConsultationAutomation(
  client: SupabaseClient,
  leadId: string,
  previousValues: {
    consultation_status?: string | null;
    consultation_outcome?: string | null;
  },
  nextValues: {
    consultation_status?: string | null;
    consultation_outcome?: string | null;
  }
) {
  const results: Array<{ ok: boolean; skipped?: boolean; error?: unknown }> = [];

  if (nextValues.consultation_status === 'Completed' && previousValues.consultation_status !== 'Completed') {
    const completionRun = await createOrUpdateAutomationRun(client, leadId, `consultation-completed:${leadId}`, 'consultation_completed');
    if (completionRun.ok && !completionRun.skipped) {
      const dueDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const taskAutomationKey = buildAutomationKey(leadId, 'consultation:completed', 'task');
      const taskResult = await createAutomationTask(client, leadId, {
        title: 'Complete post-consultation follow-up',
        priority: 'High',
        status: 'Pending',
        due_date: dueDate
      }, taskAutomationKey);
      if (!taskResult.ok) {
        await markAutomationRunFailed(client, leadId, `consultation-completed:${leadId}`);
        results.push({ ok: false, skipped: false, error: taskResult.error });
      } else {
        const activityAutomationKey = buildAutomationKey(leadId, 'consultation:completed', 'activity');
        const activityResult = await createAutomationActivity(client, leadId, 'Automated workflow: created a post-consultation follow-up task.', activityAutomationKey);
        if (!activityResult.ok) {
          await markAutomationRunFailed(client, leadId, `consultation-completed:${leadId}`);
          results.push({ ok: false, skipped: false, error: activityResult.error });
        } else {
          const completedResult = await markAutomationRunCompleted(client, leadId, `consultation-completed:${leadId}`);
          if (!completedResult.ok) {
            results.push({ ok: false, skipped: false, error: completedResult.error });
          }
        }
      }
    }
    results.push(completionRun);
  }

  if (nextValues.consultation_outcome === 'Qualified' && previousValues.consultation_outcome !== 'Qualified') {
    const qualifiedRun = await createOrUpdateAutomationRun(client, leadId, `consultation-qualified:${leadId}`, 'consultation_qualified');
    if (qualifiedRun.ok && !qualifiedRun.skipped) {
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: leadUpdateError } = await updateLeadAutomationFields(client, leadId, {
        lead_temperature: 'Hot'
      });
      if (leadUpdateError) {
        await markAutomationRunFailed(client, leadId, `consultation-qualified:${leadId}`);
        results.push({ ok: false, skipped: false, error: leadUpdateError });
      } else {
        const taskAutomationKey = buildAutomationKey(leadId, 'consultation:qualified', 'task');
        const taskResult = await createAutomationTask(client, leadId, {
          title: 'Send pricing and enrollment information',
          priority: 'High',
          status: 'Pending',
          due_date: dueDate
        }, taskAutomationKey);
        if (!taskResult.ok) {
          await markAutomationRunFailed(client, leadId, `consultation-qualified:${leadId}`);
          results.push({ ok: false, skipped: false, error: taskResult.error });
        } else {
          const activityAutomationKey = buildAutomationKey(leadId, 'consultation:qualified', 'activity');
          const activityResult = await createAutomationActivity(client, leadId, 'Automated workflow: marked the lead as qualified and created enrollment follow-up work.', activityAutomationKey);
          if (!activityResult.ok) {
            await markAutomationRunFailed(client, leadId, `consultation-qualified:${leadId}`);
            results.push({ ok: false, skipped: false, error: activityResult.error });
          } else {
            const completedResult = await markAutomationRunCompleted(client, leadId, `consultation-qualified:${leadId}`);
            if (!completedResult.ok) {
              results.push({ ok: false, skipped: false, error: completedResult.error });
            }
          }
        }
      }
    }
    results.push(qualifiedRun);
  }

  if (nextValues.consultation_outcome === 'Follow-up Needed' && previousValues.consultation_outcome !== 'Follow-up Needed') {
    const followUpRun = await createOrUpdateAutomationRun(client, leadId, `consultation-follow-up:${leadId}`, 'consultation_follow_up_needed');
    if (followUpRun.ok && !followUpRun.skipped) {
      const dueDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const taskAutomationKey = buildAutomationKey(leadId, 'consultation:follow-up', 'task');
      const taskResult = await createAutomationTask(client, leadId, {
        title: 'Follow up after consultation',
        priority: 'High',
        status: 'Pending',
        due_date: dueDate
      }, taskAutomationKey);
      if (!taskResult.ok) {
        await markAutomationRunFailed(client, leadId, `consultation-follow-up:${leadId}`);
        results.push({ ok: false, skipped: false, error: taskResult.error });
      } else {
        const activityAutomationKey = buildAutomationKey(leadId, 'consultation:follow-up', 'activity');
        const activityResult = await createAutomationActivity(client, leadId, 'Automated workflow: created a consultation follow-up task.', activityAutomationKey);
        if (!activityResult.ok) {
          await markAutomationRunFailed(client, leadId, `consultation-follow-up:${leadId}`);
          results.push({ ok: false, skipped: false, error: activityResult.error });
        } else {
          const completedResult = await markAutomationRunCompleted(client, leadId, `consultation-follow-up:${leadId}`);
          if (!completedResult.ok) {
            results.push({ ok: false, skipped: false, error: completedResult.error });
          }
        }
      }
    }
    results.push(followUpRun);
  }

  if (nextValues.consultation_outcome === 'Not Qualified' && previousValues.consultation_outcome !== 'Not Qualified') {
    const notQualifiedRun = await createOrUpdateAutomationRun(client, leadId, `consultation-not-qualified:${leadId}`, 'consultation_not_qualified');
    if (notQualifiedRun.ok && !notQualifiedRun.skipped) {
      const { error: leadUpdateError } = await updateLeadAutomationFields(client, leadId, {
        status: 'not_qualified',
        lead_temperature: 'Cold'
      });
      if (leadUpdateError) {
        await markAutomationRunFailed(client, leadId, `consultation-not-qualified:${leadId}`);
        results.push({ ok: false, skipped: false, error: leadUpdateError });
      } else {
        const activityAutomationKey = buildAutomationKey(leadId, 'consultation:not-qualified', 'activity');
        const activityResult = await createAutomationActivity(client, leadId, 'Automated workflow: marked the lead as not qualified and closed the current follow-up path.', activityAutomationKey);
        if (!activityResult.ok) {
          await markAutomationRunFailed(client, leadId, `consultation-not-qualified:${leadId}`);
          results.push({ ok: false, skipped: false, error: activityResult.error });
        } else {
          const completedResult = await markAutomationRunCompleted(client, leadId, `consultation-not-qualified:${leadId}`);
          if (!completedResult.ok) {
            results.push({ ok: false, skipped: false, error: completedResult.error });
          }
        }
      }
    }
    results.push(notQualifiedRun);
  }

  return {
    ok: results.every((result) => result.ok !== false),
    skipped: results.every((result) => result.skipped),
    results
  };
}
