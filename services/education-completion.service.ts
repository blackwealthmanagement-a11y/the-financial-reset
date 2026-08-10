import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

type CompletionHandlerParams = {
  authUserId: string;
  clientId?: string;
  learningPathId: string;
  learningPathTitle: string;
  learningPathSortOrder?: number;
};

type CompletionHandlerResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string;
  emailSent: boolean;
  activityLogged: boolean;
};

function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('Supabase configuration is missing.');
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildCompletionEmailHtml({ learningPathTitle, recommendationTitle, recommendationUrl }: { learningPathTitle: string; recommendationTitle?: string | null; recommendationUrl?: string | null }) {
  const safeTitle = escapeHtml(learningPathTitle);
  const safeRecommendationTitle = recommendationTitle ? escapeHtml(recommendationTitle) : null;
  const recommendationBlock = safeRecommendationTitle && recommendationUrl
    ? `<p>Our next recommendation is <strong>${safeRecommendationTitle}</strong>. You can continue at <a href="${recommendationUrl}">${recommendationUrl}</a>.</p>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin-bottom: 8px;">Congratulations on your progress</h2>
      <p>You completed the <strong>${safeTitle}</strong> learning path.</p>
      <p>Your steady work and continued learning are making a real difference. We&apos;re proud of the progress you&apos;ve made so far.</p>
      ${recommendationBlock}
      <p>Return to your portal anytime to keep exploring the Education Hub: <a href="https://the-financial-reset.com/portal/education">https://the-financial-reset.com/portal/education</a></p>
    </div>
  `;
}

function buildCompletionEmailText({ learningPathTitle, recommendationTitle, recommendationUrl }: { learningPathTitle: string; recommendationTitle?: string | null; recommendationUrl?: string | null }) {
  const safeTitle = escapeHtml(learningPathTitle);
  const safeRecommendationTitle = recommendationTitle ? escapeHtml(recommendationTitle) : null;
  const recommendationLine = safeRecommendationTitle && recommendationUrl
    ? `Our next recommendation is ${safeRecommendationTitle}: ${recommendationUrl}`
    : '';

  return [
    'Congratulations on your progress',
    `You completed the ${safeTitle} learning path.`,
    'Your steady work and continued learning are making a real difference.',
    recommendationLine,
    'Return to your portal anytime to keep exploring the Education Hub: https://the-financial-reset.com/portal/education'
  ].filter(Boolean).join('\n\n');
}

async function loadCompletionEvent(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, eventKey: string, clientId: string, learningPathId: string) {
  const { data, error } = await adminSupabase
    .from('education_path_completion_events')
    .select('id, email_sent, activity_logged, completed_at')
    .eq('event_key', eventKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.id) {
    return data;
  }

  const { data: byClientAndPath, error: byClientAndPathError } = await adminSupabase
    .from('education_path_completion_events')
    .select('id, email_sent, activity_logged, completed_at')
    .eq('client_id', clientId)
    .eq('learning_path_id', learningPathId)
    .maybeSingle();

  if (byClientAndPathError) {
    throw byClientAndPathError;
  }

  return byClientAndPath || null;
}

async function updateCompletionEventFlag(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, eventId: string, updates: Record<string, boolean | string>) {
  const { error } = await adminSupabase
    .from('education_path_completion_events')
    .update(updates)
    .eq('id', eventId);

  if (error) {
    console.error('Education completion event update failed.', error);
  }
}

async function createCompletionActivity(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, clientId: string, learningPathTitle: string, learningPathId: string) {
  const automationKey = `education-path-completion-activity:${clientId}:${learningPathId}`;
  const { error } = await adminSupabase.from('crm_lead_activity').insert({
    lead_id: clientId,
    activity_type: 'education',
    message: `Completed learning path: "${learningPathTitle}".`,
    created_by: 'client',
    automation_key: automationKey
  });

  if (!error) {
    return true;
  }

  if (error.code === '23505') {
    return true;
  }

  if (error.code === '42703') {
    const { error: fallbackError } = await adminSupabase.from('crm_lead_activity').insert({
      lead_id: clientId,
      activity_type: 'education',
      message: `Completed learning path: "${learningPathTitle}".`,
      created_by: 'client'
    });

    if (!fallbackError || fallbackError.code === '23505') {
      return true;
    }
  }

  throw error;
}

export async function handleLearningPathCompletion(params: CompletionHandlerParams): Promise<CompletionHandlerResult> {
  const adminSupabase = createAdminSupabaseClient();

  const { data: resolvedClient, error: clientLookupError } = await adminSupabase
    .from('clients')
    .select('id, lead_id, auth_user_id')
    .eq('auth_user_id', params.authUserId)
    .maybeSingle();

  if (clientLookupError || !resolvedClient?.id) {
    return { ok: false, skipped: true, reason: 'client-not-found', emailSent: false, activityLogged: false };
  }

  if (params.clientId && params.clientId !== resolvedClient.id) {
    return { ok: false, skipped: true, reason: 'client-mismatch', emailSent: false, activityLogged: false };
  }

  const clientRecord = resolvedClient as { id: string; lead_id: string | null; auth_user_id: string | null };

  const eventKey = `education-path-completion:${clientRecord.id}:${params.learningPathId}`;
  let completionEvent = await loadCompletionEvent(adminSupabase, eventKey, clientRecord.id, params.learningPathId);

  if (!completionEvent?.id) {
    const completionTimestamp = new Date().toISOString();
    const { data: createdEvent, error: insertError } = await adminSupabase
      .from('education_path_completion_events')
      .insert({
        event_key: eventKey,
        client_id: clientRecord.id,
        learning_path_id: params.learningPathId,
        completed_at: completionTimestamp,
        email_sent: false,
        activity_logged: false
      })
      .select('id, email_sent, activity_logged, completed_at')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        completionEvent = await loadCompletionEvent(adminSupabase, eventKey, clientRecord.id, params.learningPathId);
      } else {
        throw insertError;
      }
    } else {
      completionEvent = createdEvent;
    }
  }

  if (!completionEvent?.id) {
    return { ok: false, skipped: true, reason: 'event-not-created', emailSent: false, activityLogged: false };
  }

  const { data: leadRecord, error: leadLookupError } = await adminSupabase
    .from('intake_submissions')
    .select('id, email, full_name')
    .eq('id', clientRecord.lead_id)
    .maybeSingle();

  if (leadLookupError) {
    throw leadLookupError;
  }

  const recipientEmail = leadRecord?.email?.trim() || '';

  let recommendationTitle: string | null = null;
  let recommendationUrl: string | null = null;

  if (typeof params.learningPathSortOrder === 'number') {
    const { data: nextPath, error: nextPathError } = await adminSupabase
      .from('education_learning_paths')
      .select('id, title, slug')
      .eq('published', true)
      .gt('sort_order', params.learningPathSortOrder)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!nextPathError && nextPath?.slug) {
      recommendationTitle = nextPath.title;
      recommendationUrl = `https://the-financial-reset.com/education/path/${encodeURIComponent(nextPath.slug)}`;
    }
  }

  let emailSent = Boolean(completionEvent?.email_sent);
  if (!emailSent && recipientEmail) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (resendApiKey && fromEmail) {
      const resend = new Resend(resendApiKey);
      const emailResult = await resend.emails.send(
        {
          from: fromEmail,
          to: [recipientEmail],
          subject: `You completed your ${params.learningPathTitle} learning path`,
          html: buildCompletionEmailHtml({ learningPathTitle: params.learningPathTitle, recommendationTitle, recommendationUrl }),
          text: buildCompletionEmailText({ learningPathTitle: params.learningPathTitle, recommendationTitle, recommendationUrl })
        },
        {
          idempotencyKey: eventKey
        }
      );

      if (!emailResult.error) {
        emailSent = true;
        await updateCompletionEventFlag(adminSupabase, completionEvent.id, { email_sent: true });
      } else {
        console.error('Education completion email send failed.', emailResult.error);
      }
    }
  }

  let activityLogged = Boolean(completionEvent?.activity_logged);
  if (!activityLogged) {
    try {
      const activityInserted = await createCompletionActivity(adminSupabase, clientRecord.id, params.learningPathTitle, params.learningPathId);
      if (activityInserted) {
        activityLogged = true;
        await updateCompletionEventFlag(adminSupabase, completionEvent.id, { activity_logged: true });
      }
    } catch (activityError) {
      console.error('Education completion CRM activity insert failed.', activityError);
    }
  }

  if (emailSent && activityLogged) {
    return {
      ok: true,
      skipped: false,
      emailSent: true,
      activityLogged: true
    };
  }

  return {
    ok: true,
    skipped: false,
    emailSent,
    activityLogged
  };
}
