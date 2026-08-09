import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_USER_ID = '61058da7-5a59-46c7-a115-ad74eec69213';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PORTAL_REDIRECT_URL = process.env.PORTAL_INVITE_REDIRECT_URL || 'https://the-financial-reset.com/portal/setup';

type ClientRow = {
  id: string;
  lead_id: string;
  auth_user_id: string | null;
};

type LeadRow = {
  id: string;
  email: string | null;
};

function buildJsonResponse(payload: unknown, status = 200) {
  const response = NextResponse.json(payload, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function isValidUuid(value: string) {
  return UUID_REGEX.test(value);
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
    console.error('CRM client invite auth check failed.', error);
    return {
      ok: false as const,
      response: buildJsonResponse({ error: 'Authentication failed.' }, 401)
    };
  }
}

async function findExistingAuthUser(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, email: string) {
  const normalizedEmail = email.toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      return { user: null as { id: string; email?: string | null } | null, error };
    }

    const users = ((data as { users?: Array<{ id: string; email?: string | null }> } | null)?.users ?? []) as Array<{ id: string; email?: string | null }>;
    const match = users.find((entry) => entry.email?.toLowerCase() === normalizedEmail) ?? null;

    if (match) {
      return { user: match, error: null };
    }

    if (!users.length) {
      break;
    }

    page += 1;
  }

  return { user: null, error: null };
}

async function logPortalInviteActivity(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, leadId: string) {
  return adminSupabase.from('crm_lead_activity').insert({
    lead_id: leadId,
    activity_type: 'portal_invite',
    message: 'Portal access invited and linked.',
    created_by: 'admin'
  });
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return buildJsonResponse({ error: 'A valid JSON request body is required.' }, 400);
    }

    const leadId = typeof body?.leadId === 'string' ? body.leadId.trim() : '';
    const clientId = typeof body?.clientId === 'string' ? body.clientId.trim() : '';

    if ((leadId && clientId) || (!leadId && !clientId)) {
      return buildJsonResponse({ error: 'Provide either a valid leadId or clientId.' }, 400);
    }

    const targetId = leadId || clientId;
    if (!isValidUuid(targetId)) {
      return buildJsonResponse({ error: 'A valid UUID is required.' }, 400);
    }

    const adminSupabase = createAdminSupabaseClient();

    let clientRecord: ClientRow | null = null;

    if (leadId) {
      const { data, error } = await adminSupabase
        .from('clients')
        .select('id, lead_id, auth_user_id')
        .eq('lead_id', targetId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load client by lead id.', error);
        return buildJsonResponse({ error: 'We could not load the client record.' }, 500);
      }

      clientRecord = data as ClientRow | null;
    } else {
      const { data, error } = await adminSupabase
        .from('clients')
        .select('id, lead_id, auth_user_id')
        .eq('id', targetId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load client by client id.', error);
        return buildJsonResponse({ error: 'We could not load the client record.' }, 500);
      }

      clientRecord = data as ClientRow | null;
    }

    if (!clientRecord) {
      return buildJsonResponse({ error: 'The client record could not be found.' }, 404);
    }

    if (clientRecord.auth_user_id) {
      return buildJsonResponse({
        ok: true,
        linked: true,
        alreadyLinked: true,
        message: 'Portal access is already linked.',
        client: {
          id: clientRecord.id,
          auth_user_id: clientRecord.auth_user_id
        }
      });
    }

    const { data: leadData, error: leadError } = await adminSupabase
      .from('intake_submissions')
      .select('id, email')
      .eq('id', clientRecord.lead_id)
      .maybeSingle();

    if (leadError || !leadData?.email) {
      return buildJsonResponse({ error: 'We could not locate the lead email for this client.' }, 400);
    }

    const leadEmail = String(leadData.email).trim();
    if (!leadEmail) {
      return buildJsonResponse({ error: 'The lead has no email address on file.' }, 400);
    }

    let authUserId: string | null = null;

    const { user: existingAuthUser, error: existingAuthUserError } = await findExistingAuthUser(adminSupabase, leadEmail);
    if (existingAuthUserError) {
      console.error('Failed to inspect existing auth users for portal invite.', existingAuthUserError);
      return buildJsonResponse({ error: 'We could not verify whether this invite already exists.' }, 500);
    }

    if (existingAuthUser?.id) {
      authUserId = existingAuthUser.id;
    } else {
      const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(leadEmail, {
        redirectTo: PORTAL_REDIRECT_URL
      });

      if (inviteError) {
        console.error('Portal invite failed.', inviteError);
        return buildJsonResponse({ error: 'We could not invite this client to the portal right now.' }, 500);
      }

      authUserId = inviteData?.user?.id ?? null;
      if (!authUserId) {
        return buildJsonResponse({ error: 'The invite was accepted but no auth user could be identified.' }, 500);
      }
    }

    const { data: refreshedClient, error: refreshedClientError } = await adminSupabase
      .from('clients')
      .select('id, lead_id, auth_user_id')
      .eq('id', clientRecord.id)
      .maybeSingle();

    if (refreshedClientError) {
      console.error('Failed to verify client link state before update.', refreshedClientError);
      return buildJsonResponse({ error: 'We could not verify the client link state before saving the portal access.' }, 500);
    }

    if (refreshedClient?.auth_user_id && refreshedClient.auth_user_id !== authUserId) {
      return buildJsonResponse({
        ok: true,
        linked: true,
        alreadyLinked: true,
        message: 'Portal access is already linked.',
        client: {
          id: refreshedClient.id,
          auth_user_id: refreshedClient.auth_user_id
        }
      });
    }

    if (refreshedClient?.auth_user_id && refreshedClient.auth_user_id === authUserId) {
      return buildJsonResponse({
        ok: true,
        linked: true,
        alreadyLinked: true,
        message: 'Portal access is already linked.',
        client: {
          id: refreshedClient.id,
          auth_user_id: refreshedClient.auth_user_id
        }
      });
    }

    const { data: updatedClient, error: linkError } = await adminSupabase
      .from('clients')
      .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
      .eq('id', clientRecord.id)
      .eq('auth_user_id', null)
      .select('id, lead_id, auth_user_id')
      .single();

    if (linkError || !updatedClient) {
      console.error('Failed to link invited auth user to client.', {
        clientId: clientRecord.id,
        authUserId,
        error: linkError?.message || 'Unknown link error'
      });
      return buildJsonResponse({ error: 'The portal invite was sent, but the client account could not be linked. Please contact support.' }, 500);
    }

    const { error: activityError } = await logPortalInviteActivity(adminSupabase, clientRecord.lead_id);
    if (activityError) {
      console.error('Failed to write portal invite activity.', activityError);
    }

    return buildJsonResponse({
      ok: true,
      linked: true,
      alreadyLinked: false,
      message: 'Portal access invited and linked.',
      client: {
        id: updatedClient.id,
        auth_user_id: updatedClient.auth_user_id
      }
    });
  } catch (error) {
    console.error('CRM client invite route failed.', error);
    return buildJsonResponse({ error: 'We could not process the portal invite request.' }, 500);
  }
}
