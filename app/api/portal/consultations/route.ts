import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

const DEFAULT_TIMEZONE = 'America/New_York';
const DEFAULT_DURATION_MINUTES = 30;
const MINIMUM_NOTICE_MINUTES = 24 * 60;
const ACTIVE_STATUSES = ['scheduled'];
const MAX_AVAILABILITY_DAYS = 14;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_MEETING_TYPES = ['consultation', 'follow_up', 'coaching'];

type ClientRow = {
  id: string;
  lead_id: string;
  auth_user_id: string | null;
};

function buildJsonResponse(payload: unknown, status = 200) {
  const response = NextResponse.json(payload, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function isValidUuid(value: string) {
  return UUID_REGEX.test(value);
}

function isValidMeetingType(value: string) {
  return VALID_MEETING_TYPES.includes(value);
}

function isOverlapViolation(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  return candidate.code === '23P01' || /exclusion constraint|violates exclusion constraint/i.test(candidate.message || '');
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

async function authenticatePortalUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!accessToken) {
    return { ok: false as const, response: buildJsonResponse({ error: 'Authentication required.' }, 401) };
  }

  try {
    const authSupabase = createAuthValidationClient();
    const { data: { user }, error } = await authSupabase.auth.getUser(accessToken);

    if (error || !user?.id) {
      return { ok: false as const, response: buildJsonResponse({ error: 'Invalid or expired access token.' }, 401) };
    }

    return { ok: true as const, user };
  } catch (error) {
    console.error('Portal consultation auth check failed.', error);
    return { ok: false as const, response: buildJsonResponse({ error: 'Authentication failed.' }, 401) };
  }
}

async function resolveClientContext(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, userId: string) {
  const { data: client, error } = await adminSupabase
    .from('clients')
    .select('id, lead_id, auth_user_id')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (error || !client) {
    return { client: null, error: new Error('Client profile not found.') };
  }

  return { client, error: null };
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const zonedDate = toZonedTime(date, timeZone);

  return {
    year: zonedDate.getFullYear(),
    month: zonedDate.getMonth() + 1,
    day: zonedDate.getDate(),
    hour: zonedDate.getHours(),
    minute: zonedDate.getMinutes()
  };
}

function createDateInTimeZone(year: number, month: number, day: number, hour: number, minute: number, timeZone: string) {
  const zonedValue = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return fromZonedTime(zonedValue, timeZone);
}

function validateRequestedSlot(startDate: Date) {
  const minimumAllowedStart = new Date(Date.now() + MINIMUM_NOTICE_MINUTES * 60_000);
  if (startDate < minimumAllowedStart) {
    return { ok: false, message: 'Appointments must be booked at least 24 hours in advance.' };
  }

  const parts = getDatePartsInTimeZone(startDate, DEFAULT_TIMEZONE);
  const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: DEFAULT_TIMEZONE }).format(startDate);
  const startMinutes = parts.hour * 60 + parts.minute;

  const businessHours = {
    Mon: { open: 11 * 60, close: 18 * 60 },
    Tue: { open: 11 * 60, close: 18 * 60 },
    Wed: { open: 11 * 60, close: 18 * 60 },
    Thu: { open: 11 * 60, close: 18 * 60 },
    Fri: { open: 10 * 60, close: 12 * 60 },
    Sat: { open: null, close: null },
    Sun: { open: null, close: null }
  } as const;

  const hours = businessHours[dayOfWeek as keyof typeof businessHours];
  if (!hours || hours.open === null || hours.close === null) {
    return { ok: false, message: 'Please choose a slot during business hours.' };
  }

  if (startMinutes % 30 !== 0) {
    return { ok: false, message: 'Please choose a 30-minute slot.' };
  }

  const endMinutes = startMinutes + DEFAULT_DURATION_MINUTES;
  if (startMinutes < hours.open || endMinutes > hours.close) {
    return { ok: false, message: 'Please choose a slot during business hours.' };
  }

  return { ok: true, message: null };
}

async function hasConflict(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, startTime: string, endTime: string, eventId?: string) {
  let query = adminSupabase
    .from('consultation_events')
    .select('id')
    .eq('status', 'scheduled')
    .lt('start_time', endTime)
    .gt('end_time', startTime);

  if (eventId) {
    query = query.neq('id', eventId);
  }

  const { data, error } = await query;
  return { hasConflict: Boolean(data?.length), error };
}

async function getFutureScheduledEvent(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, clientId: string, eventId?: string) {
  let query = adminSupabase
    .from('consultation_events')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'scheduled')
    .gt('start_time', new Date().toISOString());

  if (eventId) {
    query = query.neq('id', eventId);
  }

  const { data, error } = await query.limit(1);
  return { hasActive: Boolean(data?.length), error };
}

async function generateAvailabilitySlots(adminSupabase: ReturnType<typeof createAdminSupabaseClient>) {
  const baseDate = new Date();
  const baseParts = getDatePartsInTimeZone(baseDate, DEFAULT_TIMEZONE);
  const existingEventsResult = await adminSupabase
    .from('consultation_events')
    .select('start_time, end_time')
    .eq('status', 'scheduled')
    .gt('start_time', new Date().toISOString());

  if (existingEventsResult.error) {
    throw existingEventsResult.error;
  }

  const existingEvents = (existingEventsResult.data ?? []) as Array<{ start_time: string; end_time: string }>;
  const slots: string[] = [];

  for (let offset = 0; offset < MAX_AVAILABILITY_DAYS; offset += 1) {
    const dayDate = new Date(Date.UTC(baseParts.year, baseParts.month - 1, baseParts.day + offset, 0, 0, 0));
    const dayParts = getDatePartsInTimeZone(dayDate, DEFAULT_TIMEZONE);
    const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: DEFAULT_TIMEZONE }).format(dayDate);
    const businessHours = {
      Mon: { open: 11 * 60, close: 18 * 60 },
      Tue: { open: 11 * 60, close: 18 * 60 },
      Wed: { open: 11 * 60, close: 18 * 60 },
      Thu: { open: 11 * 60, close: 18 * 60 },
      Fri: { open: 10 * 60, close: 12 * 60 },
      Sat: { open: null, close: null },
      Sun: { open: null, close: null }
    } as const;

    const hours = businessHours[dayOfWeek as keyof typeof businessHours];
    if (!hours || hours.open === null || hours.close === null) {
      continue;
    }

    const minimumAllowedStart = new Date(Date.now() + MINIMUM_NOTICE_MINUTES * 60_000);
    for (let minute = hours.open; minute < hours.close; minute += 30) {
      const slotStart = createDateInTimeZone(dayParts.year, dayParts.month, dayParts.day, Math.floor(minute / 60), minute % 60, DEFAULT_TIMEZONE);
      const slotEnd = new Date(slotStart.getTime() + DEFAULT_DURATION_MINUTES * 60_000);

      if (slotStart < minimumAllowedStart) {
        continue;
      }

      const overlapsExisting = existingEvents.some((event) => {
        const existingStart = new Date(event.start_time).toISOString();
        const existingEnd = new Date(event.end_time).toISOString();
        return existingStart < slotEnd.toISOString() && existingEnd > slotStart.toISOString();
      });

      if (!overlapsExisting) {
        slots.push(slotStart.toISOString());
      }
    }
  }

  return slots;
}

async function syncLeadSummary(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, leadId: string, status: 'Scheduled' | 'Cancelled', startTime?: string) {
  const payload: Record<string, string | null> = {
    consultation_status: status
  };

  if (startTime) {
    payload.consultation_date = startTime;
  }

  return adminSupabase.from('intake_submissions').update(payload).eq('id', leadId);
}

async function insertActivity(adminSupabase: ReturnType<typeof createAdminSupabaseClient>, leadId: string, message: string) {
  return adminSupabase.from('crm_lead_activity').insert({
    lead_id: leadId,
    activity_type: 'consultation',
    message,
    created_by: 'client'
  });
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticatePortalUser(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const adminSupabase = createAdminSupabaseClient();
    const { client, error: clientError } = await resolveClientContext(adminSupabase, authResult.user.id);
    if (clientError || !client) {
      return buildJsonResponse({ error: clientError?.message || 'Client profile not found.' }, 404);
    }

    const { data, error } = await adminSupabase
      .from('consultation_events')
      .select('*')
      .eq('client_id', client.id)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Failed to load consultation events.', error);
      return buildJsonResponse({ error: 'We could not load your consultations.' }, 500);
    }

    let availabilitySlots: string[] = [];
    try {
      availabilitySlots = await generateAvailabilitySlots(adminSupabase);
    } catch (slotError) {
      console.error('Failed to generate availability slots.', slotError);
      return buildJsonResponse({ error: 'We could not load your available consultation times.' }, 500);
    }

    return buildJsonResponse({ events: data || [], availability_slots: availabilitySlots, timezone: DEFAULT_TIMEZONE });
  } catch (error) {
    console.error('Portal consultation GET failed.', error);
    return buildJsonResponse({ error: 'We could not load your consultations.' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticatePortalUser(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();
    const startTime = typeof body?.start_time === 'string' ? body.start_time.trim() : '';
    const timezone = DEFAULT_TIMEZONE;
    const rawMeetingType = typeof body?.meeting_type === 'string' ? body.meeting_type.trim() : '';
    const meetingType = rawMeetingType || 'consultation';
    const notes = typeof body?.notes === 'string' ? body.notes.trim() || null : null;

    if (!startTime) {
      return buildJsonResponse({ error: 'A consultation time is required.' }, 400);
    }

    const adminSupabase = createAdminSupabaseClient();
    const { client, error: clientError } = await resolveClientContext(adminSupabase, authResult.user.id);
    if (clientError || !client) {
      return buildJsonResponse({ error: clientError?.message || 'Client profile not found.' }, 404);
    }

    const startDate = new Date(startTime);
    if (Number.isNaN(startDate.getTime())) {
      return buildJsonResponse({ error: 'Please choose a valid consultation time.' }, 400);
    }

    const validationError = validateRequestedSlot(startDate);
    if (!validationError.ok) {
      return buildJsonResponse({ error: validationError.message }, 400);
    }

    if (rawMeetingType && !isValidMeetingType(meetingType)) {
      return buildJsonResponse({ error: 'Please choose a valid meeting type.' }, 400);
    }

    const requestedStart = startDate.toISOString();
    const requestedEnd = new Date(startDate.getTime() + DEFAULT_DURATION_MINUTES * 60_000).toISOString();

    const activeEventResult = await getFutureScheduledEvent(adminSupabase, client.id);
    if (activeEventResult.error) {
      console.error('Future consultation lookup failed.', activeEventResult.error);
      return buildJsonResponse({ error: 'We could not verify your existing appointments.' }, 500);
    }

    if (activeEventResult.hasActive) {
      return buildJsonResponse({ error: 'You already have an upcoming scheduled consultation. Please cancel or reschedule the existing appointment first.' }, 409);
    }

    const conflictResult = await hasConflict(adminSupabase, requestedStart, requestedEnd);
    if (conflictResult.error) {
      console.error('Conflict lookup failed.', conflictResult.error);
      return buildJsonResponse({ error: 'We could not verify appointment availability.' }, 500);
    }

    if (conflictResult.hasConflict) {
      return buildJsonResponse({ error: 'This time slot conflicts with an existing appointment.' }, 409);
    }

    const { data: createdEvent, error: insertError } = await adminSupabase
      .from('consultation_events')
      .insert({
        client_id: client.id,
        lead_id: client.lead_id,
        start_time: requestedStart,
        end_time: requestedEnd,
        timezone,
        meeting_type: meetingType,
        status: 'scheduled',
        notes
      })
      .select('*')
      .single();

    if (insertError || !createdEvent) {
      if (isOverlapViolation(insertError)) {
        return buildJsonResponse({ error: 'This time slot was just booked. Please choose another time.' }, 409);
      }

      console.error('Failed to create consultation event.', insertError);
      return buildJsonResponse({ error: 'We could not book the consultation.' }, 500);
    }

    await syncLeadSummary(adminSupabase, client.lead_id, 'Scheduled', requestedStart);
    await insertActivity(adminSupabase, client.lead_id, 'Client booked a consultation.');

    return buildJsonResponse({ event: createdEvent, ok: true });
  } catch (error) {
    console.error('Portal consultation POST failed.', error);
    return buildJsonResponse({ error: 'We could not book the consultation.' }, 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticatePortalUser(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();
    const eventId = typeof body?.eventId === 'string' ? body.eventId : '';
    const startTime = typeof body?.start_time === 'string' ? body.start_time.trim() : '';
    const timezone = DEFAULT_TIMEZONE;
    const rawMeetingType = typeof body?.meeting_type === 'string' ? body.meeting_type.trim() : '';
    const meetingType = rawMeetingType || 'consultation';
    const notes = typeof body?.notes === 'string' ? body.notes.trim() || null : null;

    if (!eventId || !startTime) {
      return buildJsonResponse({ error: 'A consultation to reschedule is required.' }, 400);
    }

    if (!isValidUuid(eventId)) {
      return buildJsonResponse({ error: 'A valid consultation id is required.' }, 400);
    }

    if (rawMeetingType && !isValidMeetingType(meetingType)) {
      return buildJsonResponse({ error: 'Please choose a valid meeting type.' }, 400);
    }

    const adminSupabase = createAdminSupabaseClient();
    const { client, error: clientError } = await resolveClientContext(adminSupabase, authResult.user.id);
    if (clientError || !client) {
      return buildJsonResponse({ error: clientError?.message || 'Client profile not found.' }, 404);
    }

    const { data: existingEvent, error: existingEventError } = await adminSupabase
      .from('consultation_events')
      .select('*')
      .eq('id', eventId)
      .eq('client_id', client.id)
      .maybeSingle();

    if (existingEventError || !existingEvent) {
      return buildJsonResponse({ error: 'We could not find the appointment to reschedule.' }, 404);
    }

    if (existingEvent.status !== 'scheduled') {
      return buildJsonResponse({ error: 'Only upcoming scheduled consultations can be rescheduled.' }, 400);
    }

    const startDate = new Date(startTime);
    if (Number.isNaN(startDate.getTime())) {
      return buildJsonResponse({ error: 'Please choose a valid consultation time.' }, 400);
    }

    const validationError = validateRequestedSlot(startDate);
    if (!validationError.ok) {
      return buildJsonResponse({ error: validationError.message }, 400);
    }

    const requestedStart = startDate.toISOString();
    const requestedEnd = new Date(startDate.getTime() + DEFAULT_DURATION_MINUTES * 60_000).toISOString();

    const activeEventResult = await getFutureScheduledEvent(adminSupabase, client.id, existingEvent.id);
    if (activeEventResult.error) {
      console.error('Future consultation lookup failed.', activeEventResult.error);
      return buildJsonResponse({ error: 'We could not verify your existing appointments.' }, 500);
    }

    if (activeEventResult.hasActive) {
      return buildJsonResponse({ error: 'You already have an upcoming scheduled consultation. Please reschedule the existing appointment instead.' }, 409);
    }

    const conflictResult = await hasConflict(adminSupabase, requestedStart, requestedEnd, existingEvent.id);
    if (conflictResult.error) {
      console.error('Conflict lookup failed.', conflictResult.error);
      return buildJsonResponse({ error: 'We could not verify appointment availability.' }, 500);
    }

    if (conflictResult.hasConflict) {
      return buildJsonResponse({ error: 'This time slot conflicts with an existing appointment.' }, 409);
    }

    const { data: updatedEvent, error: updateError } = await adminSupabase
      .from('consultation_events')
      .update({
        start_time: requestedStart,
        end_time: requestedEnd,
        timezone,
        meeting_type: meetingType,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingEvent.id)
      .select('*')
      .single();

    if (updateError || !updatedEvent) {
      if (isOverlapViolation(updateError)) {
        return buildJsonResponse({ error: 'This time slot was just booked. Please choose another time.' }, 409);
      }

      console.error('Failed to reschedule consultation event.', updateError);
      return buildJsonResponse({ error: 'We could not reschedule the consultation.' }, 500);
    }

    await syncLeadSummary(adminSupabase, client.lead_id, 'Scheduled', requestedStart);
    await insertActivity(adminSupabase, client.lead_id, 'Client rescheduled consultation.');

    return buildJsonResponse({ event: updatedEvent, ok: true });
  } catch (error) {
    console.error('Portal consultation PATCH failed.', error);
    return buildJsonResponse({ error: 'We could not reschedule the consultation.' }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authenticatePortalUser(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();
    const eventId = typeof body?.eventId === 'string' ? body.eventId : '';

    if (!eventId) {
      return buildJsonResponse({ error: 'A consultation to cancel is required.' }, 400);
    }

    if (!isValidUuid(eventId)) {
      return buildJsonResponse({ error: 'A valid consultation id is required.' }, 400);
    }

    const adminSupabase = createAdminSupabaseClient();
    const { client, error: clientError } = await resolveClientContext(adminSupabase, authResult.user.id);
    if (clientError || !client) {
      return buildJsonResponse({ error: clientError?.message || 'Client profile not found.' }, 404);
    }

    const { data: existingEvent, error: existingEventError } = await adminSupabase
      .from('consultation_events')
      .select('*')
      .eq('id', eventId)
      .eq('client_id', client.id)
      .maybeSingle();

    if (existingEventError || !existingEvent) {
      return buildJsonResponse({ error: 'We could not find the appointment to cancel.' }, 404);
    }

    if (existingEvent.status !== 'scheduled') {
      return buildJsonResponse({ error: 'Only upcoming scheduled consultations can be cancelled.' }, 400);
    }

    const { data: updatedEvent, error: updateError } = await adminSupabase
      .from('consultation_events')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', existingEvent.id)
      .select('*')
      .single();

    if (updateError || !updatedEvent) {
      console.error('Failed to cancel consultation event.', updateError);
      return buildJsonResponse({ error: 'We could not cancel the consultation.' }, 500);
    }

    await syncLeadSummary(adminSupabase, client.lead_id, 'Cancelled');
    await insertActivity(adminSupabase, client.lead_id, 'Client cancelled consultation.');

    return buildJsonResponse({ event: updatedEvent, ok: true });
  } catch (error) {
    console.error('Portal consultation DELETE failed.', error);
    return buildJsonResponse({ error: 'We could not cancel the consultation.' }, 500);
  }
}
