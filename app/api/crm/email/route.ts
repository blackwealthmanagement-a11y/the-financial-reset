import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const ADMIN_USER_ID = '61058da7-5a59-46c7-a115-ad74eec69213';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type LeadRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  consultation_date?: string | null;
  service_interest?: string | null;
  next_follow_up_date?: string | null;
  consultation_outcome?: string | null;
};

type EmailHistoryRow = {
  id: string;
  delivery_status?: string | null;
  sent_at?: string | null;
  recipient?: string | null;
  subject?: string | null;
  template_id?: string | null;
};

function buildJsonResponse(payload: unknown, status = 200) {
  const response = NextResponse.json(payload, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function isValidUuid(value: string) {
  return UUID_REGEX.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeSubjectText(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function buildTemplateVariables(lead: LeadRow | null) {
  const firstName = String(lead?.full_name || '').split(/\s+/)[0] || 'friend';
  const consultationDate = lead?.consultation_date
    ? new Date(lead.consultation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Not scheduled';
  const serviceInterest = lead?.service_interest || 'Not provided';
  const followUpDate = lead?.next_follow_up_date
    ? new Date(lead.next_follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Not scheduled';
  const consultationOutcome = lead?.consultation_outcome || 'Not set';

  return {
    first_name: firstName,
    consultation_date: consultationDate,
    service_interest: serviceInterest,
    follow_up_date: followUpDate,
    consultation_outcome: consultationOutcome
  };
}

function renderTemplate(value: string | undefined, variables: Record<string, string>, options: { escapeHtmlValues?: boolean; sanitizeSubject?: boolean } = {}) {
  if (!value) {
    return '';
  }

  return value.replace(/\{\{(first_name|consultation_date|service_interest|follow_up_date|consultation_outcome)\}\}/gi, (_match, token) => {
    const key = token.toLowerCase();
    const rawValue = variables[key] || '';
    const renderedValue = options.escapeHtmlValues ? escapeHtml(rawValue) : rawValue;
    return options.sanitizeSubject ? sanitizeSubjectText(renderedValue) : renderedValue;
  });
}

function createAuthValidationClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is missing.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

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

async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!accessToken) {
    return {
      ok: false as const,
      response: buildJsonResponse({ error: 'Authentication required.' }, 401)
    };
  }

  try {
    const authSupabase = createAuthValidationClient();
    const { data: { user }, error } = await authSupabase.auth.getUser(accessToken);

    if (error || !user?.id) {
      return {
        ok: false as const,
        response: buildJsonResponse({ error: 'Invalid or expired access token.' }, 401)
      };
    }

    if (user.id !== ADMIN_USER_ID) {
      return {
        ok: false as const,
        response: buildJsonResponse({ error: 'Forbidden.' }, 403)
      };
    }

    return { ok: true as const, user };
  } catch (error) {
    console.error('CRM email auth check failed.', error);
    return {
      ok: false as const,
      response: buildJsonResponse({ error: 'Authentication failed.' }, 401)
    };
  }
}

async function getExistingSendRecord(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, sendRequestId: string) {
  const { data, error } = await adminSupabase
    .from('crm_email_history')
    .select('id, template_id, recipient, subject, delivery_status, sent_at')
    .eq('send_request_id', sendRequestId)
    .maybeSingle();

  if (error) {
    return { row: null as EmailHistoryRow | null, error };
  }

  return { row: data as EmailHistoryRow | null, error: null };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const leadId = request.nextUrl.searchParams.get('leadId');
    if (!leadId || !isValidUuid(leadId)) {
      return buildJsonResponse({ error: 'A valid leadId UUID is required.' }, 400);
    }

    const adminSupabase = createAdminSupabaseClient();
    const [templatesResult, historyResult] = await Promise.all([
      adminSupabase.from('crm_email_templates').select('*').eq('active', true).order('name'),
      adminSupabase.from('crm_email_history').select('id, template_id, recipient, subject, delivery_status, sent_at').eq('lead_id', leadId).order('sent_at', { ascending: false })
    ]);

    if (templatesResult.error || historyResult.error) {
      console.error('Failed to load CRM email center data.', { templatesResult, historyResult });
      return buildJsonResponse({ error: 'We could not load the communication center.' }, 500);
    }

    return buildJsonResponse({ templates: templatesResult.data || [], history: historyResult.data || [] });
  } catch (error) {
    console.error('Failed to load CRM email center data.', error);
    return buildJsonResponse({ error: 'We could not load the communication center.' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();
    const leadId = typeof body?.leadId === 'string' ? body.leadId : '';
    const templateId = typeof body?.templateId === 'string' ? body.templateId : '';
    const sendRequestId = typeof body?.sendRequestId === 'string' && body.sendRequestId.trim()
      ? body.sendRequestId.trim()
      : randomUUID();

    if (!leadId || !templateId || !isValidUuid(leadId) || !isValidUuid(templateId)) {
      return buildJsonResponse({ error: 'Valid leadId and templateId UUIDs are required.' }, 400);
    }

    if (body?.sendRequestId !== undefined && typeof body.sendRequestId === 'string' && body.sendRequestId.trim() && !isValidUuid(body.sendRequestId.trim())) {
      return buildJsonResponse({ error: 'sendRequestId must be a valid UUID.' }, 400);
    }

    const adminSupabase = createAdminSupabaseClient();
    const { data: lead, error: leadError } = await adminSupabase
      .from('intake_submissions')
      .select('id, full_name, email, consultation_date, service_interest, next_follow_up_date, consultation_outcome')
      .eq('id', leadId)
      .maybeSingle();

    if (leadError || !lead?.email) {
      return buildJsonResponse({ error: 'We could not locate the lead or recipient email.' }, 400);
    }

    const { data: template, error: templateError } = await adminSupabase
      .from('crm_email_templates')
      .select('*')
      .eq('id', templateId)
      .eq('active', true)
      .maybeSingle();

    if (templateError || !template) {
      return buildJsonResponse({ error: 'The selected template is unavailable.' }, 400);
    }

    const variables = buildTemplateVariables(lead as LeadRow);
    const renderedSubject = renderTemplate(template.subject, variables, { sanitizeSubject: true });
    const renderedHtml = renderTemplate(template.html, variables, { escapeHtmlValues: true });

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!resendApiKey || !fromEmail) {
      return buildJsonResponse({ error: 'Email delivery is not configured.' }, 500);
    }

    let historyRow: EmailHistoryRow | null = null;
    const { data: insertedHistory, error: historyError } = await adminSupabase
      .from('crm_email_history')
      .insert([
        {
          lead_id: leadId,
          template_id: templateId,
          recipient: lead.email,
          subject: renderedSubject || template.name,
          resend_message_id: null,
          delivery_status: 'pending',
          created_by: ADMIN_USER_ID,
          send_request_id: sendRequestId
        }
      ])
      .select('id, template_id, recipient, subject, delivery_status, sent_at')
      .single();

    if (historyError) {
      if (historyError.code === '23505') {
        const { row: existingHistory, error: lookupError } = await getExistingSendRecord(adminSupabase, sendRequestId);
        if (lookupError) {
          console.error('CRM email history lookup failed.', lookupError);
          return buildJsonResponse({ error: 'We could not create the send record.' }, 500);
        }

        if (existingHistory?.delivery_status === 'sent') {
          return buildJsonResponse({ ok: true, history: existingHistory, duplicate: true });
        }

        if (existingHistory?.id) {
          await adminSupabase.from('crm_email_history').update({ delivery_status: 'pending', sent_at: null }).eq('id', existingHistory.id);
          historyRow = existingHistory;
        }
      } else {
        console.error('CRM email history insert failed.', historyError);
        return buildJsonResponse({ error: 'We could not create the send record.' }, 500);
      }
    } else {
      historyRow = insertedHistory as EmailHistoryRow | null;
    }

    if (!historyRow?.id) {
      return buildJsonResponse({ error: 'We could not create the send record.' }, 500);
    }

    const resend = new Resend(resendApiKey);
    const emailResult = await resend.emails.send({
      from: fromEmail,
      to: [lead.email],
      subject: renderedSubject || template.name,
      html: renderedHtml || `<p>${template.subject}</p>`,
      headers: { 'Idempotency-Key': sendRequestId }
    });

    if (emailResult.error) {
      console.error('Resend email send failed.', emailResult.error);
      await adminSupabase.from('crm_email_history').update({ delivery_status: 'failed', sent_at: null }).eq('id', historyRow.id);
      return buildJsonResponse({ error: 'The email could not be sent.' }, 500);
    }

    const { data: updatedHistory, error: updateError } = await adminSupabase
      .from('crm_email_history')
      .update({
        resend_message_id: emailResult.data?.id || null,
        delivery_status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', historyRow.id)
      .select('id, template_id, recipient, subject, delivery_status, sent_at')
      .single();

    if (updateError || !updatedHistory) {
      console.error('CRM email history update failed.', updateError);
      return buildJsonResponse({ error: 'The email was sent, but we could not record the delivery.' }, 500);
    }

    return buildJsonResponse({ ok: true, history: updatedHistory });
  } catch (error) {
    console.error('CRM email send failed.', error);
    return buildJsonResponse({ error: 'We could not send the email.' }, 500);
  }
}
