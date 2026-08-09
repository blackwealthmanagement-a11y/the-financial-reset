import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const adminUserId = process.env.ADMIN_USER_ID || '61058da7-5a59-46c7-a115-ad74eec69213';

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }
  return authorization.slice('Bearer '.length);
}

async function getAuthenticatedAdminUser(token: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: 'Storage unavailable.' };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user?.id) {
    return { user: null, error: 'Permission denied.' };
  }

  if (user.id !== adminUserId) {
    return { user: null, error: 'Permission denied.' };
  }

  return { user, error: null };
}

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Permission denied.' }, { status: 401 });
  }

  const { user, error: authError } = await getAuthenticatedAdminUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Permission denied.' }, { status: 401 });
  }

  if (!supabaseUrl || !supabaseSecretKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const leadId = request.nextUrl.searchParams.get('leadId');
  const invoiceId = request.nextUrl.searchParams.get('invoiceId');

  if (invoiceId) {
    const { data, error } = await adminClient.from('client_invoices').select('*').eq('id', invoiceId).maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }
    return NextResponse.json({ invoice: data });
  }

  if (!leadId) {
    return NextResponse.json({ error: 'Lead id is required.' }, { status: 400 });
  }

  const { data, error } = await adminClient.from('client_invoices').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: 'We could not load invoices.' }, { status: 500 });
  }

  return NextResponse.json({ invoices: data || [] });
}

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Permission denied.' }, { status: 401 });
  }

  const { user, error: authError } = await getAuthenticatedAdminUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Permission denied.' }, { status: 401 });
  }

  const invoiceItemId = request.nextUrl.searchParams.get('invoiceItemId');
  if (invoiceItemId) {
    const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { error } = await adminClient.from('invoice_items').delete().eq('id', invoiceItemId);
    if (error) {
      return NextResponse.json({ error: 'We could not remove the invoice item.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (!supabaseUrl || !supabaseSecretKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const payload = await request.json();
  const clientId = typeof payload?.clientId === 'string' ? payload.clientId : '';
  const leadId = typeof payload?.leadId === 'string' ? payload.leadId : '';
  const description = typeof payload?.description === 'string' ? payload.description.trim() : 'Invoice item';
  const quantity = Number(payload?.quantity ?? 1);
  const unitPriceCents = Number(payload?.unitPriceCents ?? 0);
  const dueDate = typeof payload?.dueDate === 'string' ? payload.dueDate : null;
  const notes = typeof payload?.notes === 'string' ? payload.notes : null;
  const productId = typeof payload?.productId === 'string' ? payload.productId : null;

  if (!clientId || !leadId) {
    return NextResponse.json({ error: 'Client and lead are required.' }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: clientRecord, error: clientLookupError } = await adminClient.from('clients').select('id, lead_id').eq('id', clientId).eq('lead_id', leadId).maybeSingle();
  if (clientLookupError || !clientRecord) {
    return NextResponse.json({ error: 'This lead is not linked to a client profile.' }, { status: 404 });
  }

  const lineTotalCents = quantity > 0 ? quantity * (unitPriceCents >= 0 ? unitPriceCents : 0) : 0;
  const subtotalCents = lineTotalCents;

  const { data: createdInvoice, error: invoiceError } = await adminClient.from('client_invoices').insert({
    client_id: clientId,
    lead_id: leadId,
    status: 'draft',
    subtotal_cents: subtotalCents,
    discount_cents: 0,
    currency: 'USD',
    due_date: dueDate || null,
    notes,
    paid_at: null
  }).select('*').single();

  if (invoiceError || !createdInvoice) {
    return NextResponse.json({ error: 'We could not create the invoice.' }, { status: 500 });
  }

  const { data: insertedItem, error: itemError } = await adminClient.from('invoice_items').insert({
    invoice_id: createdInvoice.id,
    product_id: productId,
    description,
    quantity: quantity > 0 ? quantity : 1,
    unit_price_cents: unitPriceCents >= 0 ? unitPriceCents : 0
  }).select('*').single();

  if (itemError || !insertedItem) {
    await adminClient.from('client_invoices').delete().eq('id', createdInvoice.id);
    return NextResponse.json({ error: 'We could not add the invoice line item.' }, { status: 500 });
  }

  const { error: activityError } = await adminClient.from('crm_lead_activity').insert({
    lead_id: leadId,
    activity_type: 'document',
    message: `Invoice created. ${createdInvoice.invoice_number}`,
    created_by: 'admin'
  });

  if (activityError) {
    console.error('Invoice activity logging failed.', activityError);
  }

  return NextResponse.json({ invoice: createdInvoice, item: insertedItem });
}

export async function PATCH(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Permission denied.' }, { status: 401 });
  }

  const { user, error: authError } = await getAuthenticatedAdminUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Permission denied.' }, { status: 401 });
  }

  const invoiceId = request.nextUrl.searchParams.get('invoiceId');
  if (!invoiceId) {
    return NextResponse.json({ error: 'Invoice id is required.' }, { status: 400 });
  }

  const payload = await request.json();
  const status = typeof payload?.status === 'string' ? payload.status : '';
  const allowedStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid invoice status.' }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const updatePayload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'paid') {
    updatePayload.paid_at = new Date().toISOString();
  } else if (status !== 'paid') {
    updatePayload.paid_at = null;
  }

  const { data, error } = await adminClient.from('client_invoices').update(updatePayload).eq('id', invoiceId).select('*').single();
  if (error || !data) {
    return NextResponse.json({ error: 'We could not update the invoice status.' }, { status: 500 });
  }

  const message = status === 'sent' ? `Invoice marked sent. ${data.invoice_number}` : status === 'paid' ? `Invoice marked paid. ${data.invoice_number}` : status === 'cancelled' ? `Invoice cancelled. ${data.invoice_number}` : `Invoice updated. ${data.invoice_number}`;
  const { error: activityError } = await adminClient.from('crm_lead_activity').insert({
    lead_id: data.lead_id,
    activity_type: 'document',
    message,
    created_by: 'admin'
  });

  if (activityError) {
    console.error('Invoice status activity logging failed.', activityError);
  }

  return NextResponse.json({ invoice: data });
}

export async function DELETE(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Permission denied.' }, { status: 401 });
  }

  const { user, error: authError } = await getAuthenticatedAdminUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Permission denied.' }, { status: 401 });
  }

  const invoiceItemId = request.nextUrl.searchParams.get('invoiceItemId');
  if (!invoiceItemId) {
    return NextResponse.json({ error: 'Invoice item id is required.' }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error } = await adminClient.from('invoice_items').delete().eq('id', invoiceItemId);
  if (error) {
    return NextResponse.json({ error: 'We could not remove the invoice item.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
